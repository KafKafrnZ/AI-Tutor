from fastapi import FastAPI, HTTPException, Depends, Request, Cookie
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text # ARCH-6 FIX: Added text import for live DB checks
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
from contextlib import asynccontextmanager
import secrets
from datetime import datetime, timedelta
import json
import time
import logging
import os

# Project Imports
from app.core.config import settings
from app.core.error_handler import validation_exception_handler, sqlalchemy_exception_handler, general_exception_handler
from app.core.rag import validate_chroma_persistence_config

from sse_starlette.sse import EventSourceResponse
from app.models.database import (
    create_user, get_user_by_email, get_db, save_mock_test,
    get_questions_for_test, save_error_log, ErrorLog, AuthToken, User, MasterQuestion
)
from app.core.auth import hash_password, verify_password, create_token, verify_token
from app.schemas.mock_test import MockTestCreate

# Module Imports
from modules.data_analyzer import load_data, calculate_accuracy, get_overall_stats, get_weak_areas, get_ai_revision_plan
from modules.tutor import LLMServiceError, ask_tutor, ask_tutor_stream, generate_questions, evaluate_answer
from app.core.email import send_verification_email, send_reset_email

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ibps_so")

_cache: dict = {}
CACHE_TTL = 300  # 5 minutes in seconds

def get_cached(key: str):
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["data"]
    return None

def set_cached(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}


# --- MODERN ASYNC LIFESPAN MANAGER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ARCH-2 FIX: Removed init_db() call. Alembic now handles all schema migrations safely.
    chroma_path = validate_chroma_persistence_config()
    logger.info("App starting - schema managed by Alembic. RAG Chroma path: %s", chroma_path)
    yield

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Unified single FastAPI instantiation using modern lifespan context
app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

# Middleware & Exception Handlers
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cookie_security_options() -> dict[str, Any]:
    is_prod = settings.ENVIRONMENT.lower() == "production"
    return {
        "secure": is_prod,
        "samesite": "none" if is_prod else "lax",
    }


@app.middleware("http")
async def log_requests_and_add_headers(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration:.2f}s)")
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response

# Security Dependency
def get_current_user(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    user = get_user_by_email(db, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if settings.REQUIRE_EMAIL_VERIFICATION and not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox.")
    return user

# Schemas
class SignupRequest(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

class ErrorLogResponse(BaseModel):
    id: int
    question_text: str
    user_answer: str
    correct_answer: str
    explanation: Optional[str] = None
    date_added: datetime

    # Tells Pydantic to read raw SQLAlchemy ORM models safely
    model_config = {"from_attributes": True} 

class RevisionPlanResponse(BaseModel):
    primary_weakness: str
    critical_concepts: List[str]
    actionable_checklist: List[str]

class RecentTestResponse(BaseModel):
    date: Optional[str] = None
    test_name: Optional[str] = None
    section: Optional[str] = None
    attempted: int = 0
    correct: int = 0
    time_taken: float = 0.0

class StatsResponse(BaseModel):
    accuracy: float
    testsTaken: int
    recent_tests: List[RecentTestResponse]
    weak_areas: str | Dict[str, Any]
    stats: Dict[str, Any]

class ProfileUpdateRequest(BaseModel):
    name: str

class AskRequest(BaseModel):
    question: str = Field(..., max_length=2000, description="User question to the tutor (max 2000 chars)")
    context: str = Field("", max_length=4000)
    history: list[dict] = Field(default_factory=list)

class PracticeRequest(BaseModel):
    topic: str = Field(..., max_length=500, description="Topic for practice questions (max 500 chars)")

class ErrorItem(BaseModel):
    question_text: str = Field(..., max_length=2000)
    user_answer: str = Field(..., max_length=500)
    correct_answer: str = Field(..., max_length=500)
    explanation: str = Field(..., max_length=2000)

class ErrorPayload(BaseModel):
    errors: List[ErrorItem]


# ====================== ENDPOINTS ======================

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """ARCH-6 FIX: Actively verifies that the relational database container is alive."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database cluster unavailable: {str(e)}")

@app.post("/signup")
@limiter.limit("3/minute")
def signup(request: Request, data: SignupRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, data.email):
        return JSONResponse(status_code=400, content={"error": "Email already in use"})
    new_user = create_user(
        db,
        data.name,
        data.email,
        hash_password(data.password),
        is_verified=not settings.REQUIRE_EMAIL_VERIFICATION,
    )
    if new_user and settings.REQUIRE_EMAIL_VERIFICATION:
        token_str = secrets.token_urlsafe(32)
        db_token = AuthToken(
            user_id=new_user.id,
            token=token_str,
            token_type="verify_email",
            expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(db_token)
        db.commit()
        send_verification_email(new_user.email, token_str)
        return {"message": "Account created. Check your email to verify your account."}
    return {"message": "Account created. You can sign in now."}

@app.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    if settings.REQUIRE_EMAIL_VERIFICATION and not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in. Check your inbox.")

    token = create_token({"sub": user.email})

    response = JSONResponse(content={"message": "Login successful", "name": user.name})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        **cookie_security_options(),
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # keep in sync with config
    )
    return response

# --- WAVE 5: ACCOUNT RECOVERY & VERIFICATION ---

@app.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # We still return 200 to prevent email enumeration attacks
        return {"message": "If that email exists, a reset link has been sent."}
    
    # Generate a secure token valid for 1 hour
    token_str = secrets.token_urlsafe(32)
    db_token = AuthToken(
        user_id=user.id,
        token=token_str,
        token_type="reset_password",
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(db_token)
    db.commit()
    
    send_reset_email(user.email, token_str)
    
    return {"message": "If that email exists, a reset link has been sent."}


@app.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    db_token = db.query(AuthToken).filter(
        AuthToken.token == req.token,
        AuthToken.token_type == "reset_password",
        AuthToken.expires_at > datetime.utcnow()
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = db.query(User).filter(User.id == db_token.user_id).first()
    user.password_hash = hash_password(req.new_password)
    
    # Burn the token so it can't be reused
    db.delete(db_token)
    db.commit()
    
    return {"message": "Password updated successfully"}


@app.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    db_token = db.query(AuthToken).filter(
        AuthToken.token == token,
        AuthToken.token_type == "verify_email",
        AuthToken.expires_at > datetime.utcnow()
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid verification token")
        
    user = db.query(User).filter(User.id == db_token.user_id).first()
    user.is_verified = True
    
    db.delete(db_token)
    db.commit()
    
    return {"message": "Email successfully verified"}

@app.post("/logout")
def logout(current_user: Any = Depends(get_current_user)):
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key="access_token",
        httponly=True,
        **cookie_security_options(),
    )
    return response

@app.get("/me")
def get_profile(current_user: Any = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "plan": current_user.plan,
    }

@app.put("/me")
def update_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    new_name = data.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    current_user.name = new_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "plan": current_user.plan,
    }

@app.post("/ask")
@limiter.limit("10/minute")
async def ask_ai(request: Request, data: AskRequest, current_user: Any = Depends(get_current_user)):
    try:
        answer = await ask_tutor(data.question, data.context, data.history)
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"answer": answer}

@app.post("/ask/stream")
@limiter.limit("10/minute")
async def ask_tutor_stream_endpoint(request: Request, data: AskRequest, current_user: Any = Depends(get_current_user)):
    stream = ask_tutor_stream(data.question, data.context, data.history)
    try:
        first_token = await anext(stream)
    except StopAsyncIteration as exc:
        raise HTTPException(status_code=503, detail="AI model returned an empty response") from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    async def event_generator():
        yield {"data": first_token}
        try:
            async for token in stream:
                yield {"data": token}
        except LLMServiceError as exc:
            logger.warning("AI stream failed after response started: %s", exc)
            yield {"event": "error", "data": str(exc)}
        finally:
            await stream.aclose()
    # ping=10: send a keepalive comment every 10s so the connection doesn't
    # time out while the RAG pipeline runs before the first token arrives.
    return EventSourceResponse(event_generator(), ping=10)

@app.post("/practice")
@limiter.limit("10/minute")
async def practice_ai(request: Request, data: PracticeRequest, current_user: Any = Depends(get_current_user)):
    """FIX-13 FIX: Eliminated redundant string parsing logic layer. 
    Trusting clean parsing execution handle directly from within generate_questions()."""
    try:
        raw_result = await generate_questions(data.topic)
    except LLMServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    try:
        return {"questions": json.loads(raw_result)}
    except Exception:
        return {"questions": [{"difficulty": "Hard", "question": "Parse Error", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Failed to safely parse output string topology map to valid JSON elements."}]}
    
# --- MOCK TESTS (list + questions) ---
MOCK_TEST_META = {
    1: {"title": "Government Exam Foundation Mock - Set 1", "duration_minutes": 90, "difficulty": "Hard"},
    2: {"title": "Reasoning + Quant Special", "duration_minutes": 75, "difficulty": "Medium"},
    3: {"title": "English + General Awareness Combined", "duration_minutes": 60, "difficulty": "Easy"},
}

OPTION_LETTERS = ("A", "B", "C", "D")

FALLBACK_MOCK_QUESTION_BANK: dict[int, list[dict[str, Any]]] = {
    1: [
        {
            "section": "Polity",
            "topic": "Constitutional bodies",
            "question": "Which constitutional body is responsible for conducting elections to Parliament and State Legislatures in India?",
            "options": ["Union Public Service Commission", "Election Commission of India", "Finance Commission", "Comptroller and Auditor General"],
            "correct_answer": "B",
            "explanation": "The Election Commission of India conducts elections to Parliament, State Legislatures, and the offices of President and Vice-President.",
        },
        {
            "section": "Economy",
            "topic": "Inflation",
            "question": "A sustained rise in the general price level of goods and services is called:",
            "options": ["Deflation", "Inflation", "Disinvestment", "Fiscal deficit"],
            "correct_answer": "B",
            "explanation": "Inflation means a broad, sustained increase in prices, reducing purchasing power over time.",
        },
        {
            "section": "Geography",
            "topic": "Monsoon",
            "question": "The southwest monsoon in India is primarily caused by:",
            "options": ["Western disturbances", "Pressure difference between land and sea", "El Nino alone", "Retreating trade winds"],
            "correct_answer": "B",
            "explanation": "Seasonal heating creates low pressure over land, drawing moisture-laden winds from the ocean.",
        },
        {
            "section": "History",
            "topic": "Freedom movement",
            "question": "The Quit India Movement was launched in which year?",
            "options": ["1919", "1930", "1942", "1947"],
            "correct_answer": "C",
            "explanation": "The All India Congress Committee launched the Quit India Movement in August 1942.",
        },
        {
            "section": "Environment",
            "topic": "Biodiversity",
            "question": "Which term describes a species found naturally in only one geographic region?",
            "options": ["Invasive", "Endemic", "Migratory", "Extinct"],
            "correct_answer": "B",
            "explanation": "Endemic species are restricted to a particular region and are important for conservation planning.",
        },
        {
            "section": "CSAT",
            "topic": "Percentages",
            "question": "If the price of an item increases from Rs. 800 to Rs. 920, what is the percentage increase?",
            "options": ["12%", "15%", "18%", "20%"],
            "correct_answer": "B",
            "explanation": "Increase = 120. Percentage increase = 120/800 x 100 = 15%.",
        },
        {
            "section": "Science",
            "topic": "Health",
            "question": "Which vitamin is mainly produced in the human body when skin is exposed to sunlight?",
            "options": ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"],
            "correct_answer": "D",
            "explanation": "Sunlight helps the body synthesize Vitamin D, which supports bone health.",
        },
        {
            "section": "Governance",
            "topic": "Local government",
            "question": "The 73rd Constitutional Amendment is most closely related to:",
            "options": ["Municipal bodies", "Panchayati Raj institutions", "Anti-defection law", "GST Council"],
            "correct_answer": "B",
            "explanation": "The 73rd Amendment gave constitutional status to Panchayati Raj institutions.",
        },
        {
            "section": "Reasoning",
            "topic": "Coding-decoding",
            "question": "If DELHI is coded as EFM IJ by shifting each letter one step forward, how is INDIA coded?",
            "options": ["JOEJB", "JODJB", "HMCJZ", "KPEKC"],
            "correct_answer": "A",
            "explanation": "Each letter moves one step forward: I->J, N->O, D->E, I->J, A->B.",
        },
        {
            "section": "Current Affairs",
            "topic": "Institutions",
            "question": "Which institution is responsible for monetary policy formulation in India?",
            "options": ["NITI Aayog", "Reserve Bank of India", "Finance Commission", "Securities and Exchange Board of India"],
            "correct_answer": "B",
            "explanation": "The Reserve Bank of India's Monetary Policy Committee formulates monetary policy.",
        },
    ],
    2: [
        {
            "section": "Reasoning",
            "topic": "Series",
            "question": "Find the next number in the series: 3, 9, 27, 81, ?",
            "options": ["162", "216", "243", "324"],
            "correct_answer": "C",
            "explanation": "Each term is multiplied by 3. 81 x 3 = 243.",
        },
        {
            "section": "Reasoning",
            "topic": "Syllogism",
            "question": "Statements: All rivers are water bodies. Some water bodies are polluted. Which conclusion definitely follows?",
            "options": ["All rivers are polluted", "Some rivers are polluted", "Some polluted things may be water bodies", "No river is a water body"],
            "correct_answer": "C",
            "explanation": "Only the overlap between water bodies and polluted things is certain; no definite river-pollution relation is given.",
        },
        {
            "section": "Quant",
            "topic": "Ratio",
            "question": "The ratio of boys to girls in a class is 3:2. If there are 45 boys, how many girls are there?",
            "options": ["20", "25", "30", "35"],
            "correct_answer": "C",
            "explanation": "3 parts = 45, so 1 part = 15. Girls = 2 parts = 30.",
        },
        {
            "section": "Quant",
            "topic": "Simple interest",
            "question": "What is the simple interest on Rs. 5,000 at 8% per annum for 2 years?",
            "options": ["Rs. 400", "Rs. 600", "Rs. 800", "Rs. 1,000"],
            "correct_answer": "C",
            "explanation": "SI = PRT/100 = 5000 x 8 x 2 / 100 = Rs. 800.",
        },
        {
            "section": "Reasoning",
            "topic": "Direction sense",
            "question": "A person walks 5 km north, then 3 km east. How far is the person from the starting point?",
            "options": ["4 km", "5.8 km", "8 km", "10 km"],
            "correct_answer": "B",
            "explanation": "Distance = sqrt(5^2 + 3^2) = sqrt(34), approximately 5.8 km.",
        },
        {
            "section": "Quant",
            "topic": "Average",
            "question": "The average of five numbers is 24. If one number is removed, the average becomes 22. What is the removed number?",
            "options": ["28", "30", "32", "34"],
            "correct_answer": "C",
            "explanation": "Original sum = 120. New sum = 88. Removed number = 32.",
        },
        {
            "section": "Reasoning",
            "topic": "Blood relation",
            "question": "Pointing to a woman, Ravi says, 'She is the daughter of my mother's only son.' How is the woman related to Ravi?",
            "options": ["Sister", "Daughter", "Niece", "Cousin"],
            "correct_answer": "B",
            "explanation": "Ravi's mother's only son is Ravi, so the woman is Ravi's daughter.",
        },
        {
            "section": "Quant",
            "topic": "Time and work",
            "question": "A can complete a task in 12 days and B in 18 days. Working together, they complete it in:",
            "options": ["6.2 days", "7.2 days", "8.5 days", "9 days"],
            "correct_answer": "B",
            "explanation": "Combined work per day = 1/12 + 1/18 = 5/36, so time = 36/5 = 7.2 days.",
        },
    ],
    3: [
        {
            "section": "English",
            "topic": "Grammar",
            "question": "Choose the grammatically correct sentence.",
            "options": ["He go to school daily.", "He goes to school daily.", "He going to school daily.", "He gone to school daily."],
            "correct_answer": "B",
            "explanation": "For a singular subject in simple present tense, use 'goes'.",
        },
        {
            "section": "English",
            "topic": "Vocabulary",
            "question": "Choose the word closest in meaning to 'prudent'.",
            "options": ["Careless", "Wise", "Angry", "Weak"],
            "correct_answer": "B",
            "explanation": "Prudent means careful, sensible, and wise in practical matters.",
        },
        {
            "section": "General Awareness",
            "topic": "Indian polity",
            "question": "Who is the nominal head of the Union Executive in India?",
            "options": ["Prime Minister", "President", "Chief Justice of India", "Speaker of Lok Sabha"],
            "correct_answer": "B",
            "explanation": "The President is the nominal head; real executive power is exercised by the Council of Ministers.",
        },
        {
            "section": "General Awareness",
            "topic": "Economy",
            "question": "GDP at market prices includes:",
            "options": ["Only intermediate goods", "Final goods and services produced domestically", "Only imports", "Only government expenditure"],
            "correct_answer": "B",
            "explanation": "GDP measures the value of final goods and services produced within domestic territory.",
        },
        {
            "section": "English",
            "topic": "Reading logic",
            "question": "In a passage, the author's main idea is usually best identified by:",
            "options": ["One isolated statistic", "The repeated central argument", "The longest sentence", "The first noun"],
            "correct_answer": "B",
            "explanation": "The main idea is the central argument or theme supported throughout the passage.",
        },
        {
            "section": "General Awareness",
            "topic": "Environment",
            "question": "The main objective of afforestation is to:",
            "options": ["Increase forest cover", "Reduce soil nutrients", "Increase desertification", "Stop rainfall"],
            "correct_answer": "A",
            "explanation": "Afforestation means planting trees on land to increase forest cover.",
        },
        {
            "section": "English",
            "topic": "Error spotting",
            "question": "Identify the error: 'The data is being analyzed by the committee.'",
            "options": ["The", "data is", "being analyzed", "No error"],
            "correct_answer": "D",
            "explanation": "In modern usage, 'data' is often accepted as a mass noun, so the sentence is acceptable.",
        },
        {
            "section": "General Awareness",
            "topic": "Science",
            "question": "The SI unit of electric current is:",
            "options": ["Volt", "Ohm", "Ampere", "Watt"],
            "correct_answer": "C",
            "explanation": "Electric current is measured in amperes.",
        },
    ],
}


def normalize_correct_option(correct_answer: str | None, options: list[str]) -> str:
    answer = (correct_answer or "").strip()
    if not answer:
        return ""

    normalized = answer.upper().replace("OPTION", "").strip(" .:-)")
    if normalized in OPTION_LETTERS:
        return normalized

    if len(answer) >= 2 and answer[0].upper() in OPTION_LETTERS and answer[1] in {".", ")", ":", "-", " "}:
        return answer[0].upper()

    answer_lower = answer.casefold()
    for index, option in enumerate(options):
        if answer_lower == (option or "").strip().casefold():
            return OPTION_LETTERS[index]

    return answer


def correct_answer_text(correct_option: str, options: list[str]) -> str:
    if correct_option in OPTION_LETTERS:
        return options[OPTION_LETTERS.index(correct_option)]
    return correct_option


def format_question_payload(
    *,
    question_id: int,
    section: str | None,
    topic: str | None,
    question: str,
    options: list[str],
    correct_answer: str | None,
    explanation: str | None,
    source: str,
) -> dict[str, Any]:
    while len(options) < 4:
        options.append("")

    clean_options = [option or "" for option in options[:4]]
    correct_option = normalize_correct_option(correct_answer, clean_options)
    return {
        "id": question_id,
        "section": section or "General",
        "topic": topic or "General",
        "question": question,
        "options": clean_options,
        "correct_answer": correct_option,
        "correct_answer_text": correct_answer_text(correct_option, clean_options),
        "explanation": explanation or "No explanation available yet.",
        "source": source,
    }


def build_fallback_mock_questions(test_id: int) -> list[dict[str, Any]]:
    templates = FALLBACK_MOCK_QUESTION_BANK.get(test_id) or FALLBACK_MOCK_QUESTION_BANK[1]
    return [
        format_question_payload(
            question_id=(test_id * 10000) + index,
            section=item.get("section"),
            topic=item.get("topic"),
            question=str(item["question"]),
            options=list(item["options"]),
            correct_answer=str(item.get("correct_answer", "")),
            explanation=item.get("explanation"),
            source="generated_fallback",
        )
        for index, item in enumerate(templates, start=1)
    ]


def fallback_question_count(test_id: int) -> int:
    return len(FALLBACK_MOCK_QUESTION_BANK.get(test_id) or FALLBACK_MOCK_QUESTION_BANK[1])


@app.get("/mock-tests")
def list_mock_tests(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    """Returns available mock tests with real question counts from DB (C-03 fix)."""
    tests = []
    for tid, meta in MOCK_TEST_META.items():
        db_count = db.query(MasterQuestion).filter(MasterQuestion.test_id == tid).count()
        uses_fallback = db_count == 0
        tests.append({
            "id": tid,
            "title": meta["title"],
            "duration_minutes": meta["duration_minutes"],
            "question_count": db_count or fallback_question_count(tid),
            "difficulty": meta["difficulty"],
            "is_fallback": uses_fallback,
            "source": "generated_fallback" if uses_fallback else "database",
        })
    return {"tests": tests}


@app.get("/mock-tests/{test_id}/questions")
def get_test_questions(test_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    questions = get_questions_for_test(db, test_id)
    formatted = [
        format_question_payload(
            question_id=q.id,
            section=q.section,
            topic=q.topic,
            question=q.question_text,
            options=[q.option_a, q.option_b, q.option_c, q.option_d],
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            source="database",
        )
        for q in questions
    ]
    uses_fallback = len(formatted) == 0
    if uses_fallback:
        formatted = build_fallback_mock_questions(test_id)

    meta = MOCK_TEST_META.get(test_id, {"title": f"Mock Test Set {test_id}", "duration_minutes": 90, "difficulty": "Medium"})
    return {
        "test": {
            "id": test_id,
            "title": meta["title"],
            "duration_minutes": meta["duration_minutes"],
            "difficulty": meta["difficulty"],
            "question_count": len(formatted),
            "is_fallback": uses_fallback,
            "source": "generated_fallback" if uses_fallback else "database",
        },
        "questions": formatted
    }

@app.post("/save-mock-test")
def save_mock_test_result(data: MockTestCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    saved_test = save_mock_test(db, current_user.id, data.model_dump())
    if not saved_test:
        raise HTTPException(status_code=500, detail="Failed to save mock test")
    
    # CRITICAL: Invalidate the cache because the user has new data!
    _cache.pop(f"stats_{current_user.id}", None)
    _cache.pop(f"revision_{current_user.id}", None)
    
    return {"message": "Mock test saved successfully", "id": saved_test.id}

@app.get("/stats", response_model=StatsResponse)
def stats(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    cache_key = f"stats_{current_user.id}"
    cached_data = get_cached(cache_key)
    if cached_data:
        return cached_data

    # If not in cache, do the heavy calculation
    df = load_data(db, current_user.id)
    df = calculate_accuracy(df)
    
    if df.empty:
        result = {
            "stats": {"avg_accuracy": 0, "total_tests": 0},
            "accuracy": 0,
            "testsTaken": 0,
            "recent_tests": [],
            "weak_areas": "No data yet",
        }
    else:
        overall_stats = get_overall_stats(df)
        weak_areas_result = get_weak_areas(df)
        if hasattr(weak_areas_result, "to_dict"):
            weak_areas_serialized = {
                str(key): float(value)
                for key, value in weak_areas_result.to_dict().items()
            }
        else:
            weak_areas_serialized = str(weak_areas_result)

        recent_tests = df.tail(5).to_dict(orient="records")
        for test in recent_tests:
            date_value = test.get("date")
            if hasattr(date_value, "isoformat"):
                test["date"] = date_value.isoformat()
            elif date_value is not None:
                test["date"] = str(date_value)
            
        result = {
            "stats": overall_stats,
            "accuracy": overall_stats["avg_accuracy"],
            "testsTaken": overall_stats["total_tests"],
            "recent_tests": recent_tests,
            "weak_areas": weak_areas_serialized
        }
    
    set_cached(cache_key, result)
    return result

@app.get("/revision-plan", response_model=RevisionPlanResponse)
@limiter.limit("5/minute")
async def revision_plan(request: Request, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    """Fetches the AI-generated study plan based on recent mistakes."""
    cache_key = f"revision_{current_user.id}"
    cached_plan = get_cached(cache_key)
    if cached_plan:
        return cached_plan

    plan = await get_ai_revision_plan(db, current_user.id)
    set_cached(cache_key, plan)
    return plan

@app.post("/save-errors")
def save_errors(payload: ErrorPayload, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    for error in payload.errors:
        save_error_log(db, current_user.id, error.model_dump())
    # Ensure revision plan + stats reflect the new mistakes immediately (was missing vs save-mock-test)
    _cache.pop(f"stats_{current_user.id}", None)
    _cache.pop(f"revision_{current_user.id}", None)
    return {"message": "Errors logged successfully"}

@app.get("/error-log", response_model=List[ErrorLogResponse])
def get_error_log(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db), 
    current_user: Any = Depends(get_current_user)
):
    logs = (
        db.query(ErrorLog)
        .filter(ErrorLog.user_id == current_user.id)
        .order_by(ErrorLog.date_added.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs
