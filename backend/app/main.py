from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any
import json
import sys
import os

# Project Imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.config import settings
from app.core.error_handler import validation_exception_handler, sqlalchemy_exception_handler, general_exception_handler
from app.models.database import create_user, get_user_by_email, get_db, save_mock_test
from app.core.auth import hash_password, verify_password, create_token, verify_token
from app.schemas.mock_test import MockTestCreate

from modules.data_analyzer import load_data, calculate_accuracy, get_overall_stats, get_weak_areas
from modules.tutor import ask_tutor, generate_questions, evaluate_answer

security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

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

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Security Dependency
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    user = get_user_by_email(db, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Schemas
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AskRequest(BaseModel):
    question: str
    context: str = ""

class PracticeRequest(BaseModel):
    topic: str

# Routes
@app.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, data.email):
        return JSONResponse(status_code=400, content={"error": "Email already in use"})
    create_user(db, data.name, data.email, hash_password(data.password))
    return {"message": "User created successfully"}

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"token": create_token({"sub": user.email}), "name": user.name}

@app.post("/ask")
def ask_ai(data: AskRequest, current_user: Any = Depends(get_current_user)):
    return {"answer": ask_tutor(data.question, data.context)}

@app.post("/practice")
def practice_ai(data: PracticeRequest, current_user: Any = Depends(get_current_user)):
    raw_result = generate_questions(data.topic).strip()
    
    # Strip markdown wrappers
    if "```" in raw_result:
        parts = raw_result.split("```")
        raw_result = parts[1] if len(parts) > 1 else raw_result
    if raw_result.startswith("json"):
        raw_result = raw_result[4:].strip()
        
    start, end = raw_result.find('['), raw_result.rfind(']') + 1
    if start != -1 and end > start:
        raw_result = raw_result[start:end]

    try:
        return {"questions": json.loads(raw_result)}
    except:
        return {"questions": [{"difficulty": "Hard", "question": "Parse Error", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Failed to parse JSON"}]}

@app.get("/stats")
def stats(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    df = load_data(db, current_user.id)
    df = calculate_accuracy(df)
    if df.empty:
        return {"stats": {"avg_accuracy": 0, "total_tests": 0}, "recent_tests": [], "weak_areas": "No data yet"}
    
    return {
        "stats": get_overall_stats(df),
        "recent_tests": df.tail(5).to_dict(orient="records") if not df.empty else [],
        "weak_areas": get_weak_areas(df).to_dict() if hasattr(get_weak_areas(df), "to_dict") else str(get_weak_areas(df))
    }