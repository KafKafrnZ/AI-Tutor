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

from sse_starlette.sse import EventSourceResponse
from app.models.database import (
    create_user, get_user_by_email, get_db, save_mock_test,
    get_questions_for_test, save_error_log, ErrorLog, AuthToken, User, MasterQuestion
)
from app.core.auth import hash_password, verify_password, create_token, verify_token
from app.schemas.mock_test import MockTestCreate

# Module Imports
from modules.data_analyzer import load_data, calculate_accuracy, get_overall_stats, get_weak_areas, get_ai_revision_plan
from modules.tutor import ask_tutor, ask_tutor_stream, generate_questions, evaluate_answer

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
    logger.info("App starting — schema managed by Alembic.")
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
        # TODO: replace logger.info with real email send (FastAPI-Mail / smtplib)
        logger.info("VERIFY EMAIL TOKEN for %s: /verify-email?token=%s", new_user.email, token_str)
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
    
    # TODO: In production, integrate smtplib or FastAPI-Mail here to actually email the token.
    # For now, we will print it to the server console so you can test it locally.
    logger.info(f"PASSWORD RESET TOKEN FOR {user.email}: {token_str}")
    
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
    answer = await ask_tutor(data.question, data.context)
    return {"answer": answer}

@app.post("/ask/stream")
@limiter.limit("10/minute")
async def ask_tutor_stream_endpoint(request: Request, data: AskRequest, current_user: Any = Depends(get_current_user)):
    async def event_generator():
        async for token in ask_tutor_stream(data.question, data.context):
            yield {"data": token}
    return EventSourceResponse(event_generator())

@app.post("/practice")
@limiter.limit("10/minute")
async def practice_ai(request: Request, data: PracticeRequest, current_user: Any = Depends(get_current_user)):
    """FIX-13 FIX: Eliminated redundant string parsing logic layer. 
    Trusting clean parsing execution handle directly from within generate_questions()."""
    raw_result = await generate_questions(data.topic)
    try:
        return {"questions": json.loads(raw_result)}
    except Exception:
        return {"questions": [{"difficulty": "Hard", "question": "Parse Error", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Failed to safely parse output string topology map to valid JSON elements."}]}
    
# --- MOCK TESTS (list + questions) ---
MOCK_TEST_META = {
    1: {"title": "Full IBPS SO 2025 Mock - Set 1", "duration_minutes": 120, "difficulty": "Hard"},
    2: {"title": "Reasoning + Quant Special", "duration_minutes": 90, "difficulty": "Medium"},
    3: {"title": "English + GA Combined", "duration_minutes": 60, "difficulty": "Easy"},
}

@app.get("/mock-tests")
def list_mock_tests(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    """Returns available mock tests with real question counts from DB (C-03 fix)."""
    tests = []
    for tid, meta in MOCK_TEST_META.items():
        qcount = db.query(MasterQuestion).filter(MasterQuestion.test_id == tid).count()
        tests.append({
            "id": tid,
            "title": meta["title"],
            "duration_minutes": meta["duration_minutes"],
            "question_count": qcount,
            "difficulty": meta["difficulty"],
        })
    return {"tests": tests}


@app.get("/mock-tests/{test_id}/questions")
def get_test_questions(test_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    questions = get_questions_for_test(db, test_id)
    formatted = []
    for q in questions:
        formatted.append({
            "id": q.id,
            "section": q.section,
            "question": q.question_text,
            "options": [q.option_a, q.option_b, q.option_c, q.option_d],
            "correct_answer": q.correct_answer,
            "explanation": q.explanation
        })
    meta = MOCK_TEST_META.get(test_id, {"title": f"Mock Test Set {test_id}", "duration_minutes": 90, "difficulty": "Medium"})
    return {
        "test": {
            "id": test_id,
            "title": meta["title"],
            "duration_minutes": meta["duration_minutes"],
            "difficulty": meta["difficulty"],
            "question_count": len(formatted),
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
        weak_areas_serialized = weak_areas_result.to_dict() if hasattr(weak_areas_result, "to_dict") else str(weak_areas_result)
            
        result = {
            "stats": overall_stats,
            "accuracy": overall_stats["avg_accuracy"],
            "testsTaken": overall_stats["total_tests"],
            "recent_tests": df.tail(5).to_dict(orient="records"),
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
