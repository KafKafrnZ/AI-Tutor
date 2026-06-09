from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


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
    question: str = Field(..., max_length=2000)
    context: str = Field("", max_length=4000)
    history: list[dict] = Field(default_factory=list)


class PracticeRequest(BaseModel):
    topic: str = Field(..., max_length=500)


class ErrorItem(BaseModel):
    question_text: str = Field(..., max_length=2000)
    user_answer: str = Field(..., max_length=500)
    correct_answer: str = Field(..., max_length=500)
    explanation: str = Field(..., max_length=2000)


class ErrorPayload(BaseModel):
    errors: List[ErrorItem]


class ConversationSaveRequest(BaseModel):
    question: str = Field(..., max_length=2000)
    answer: str = Field(..., max_length=12000)


class SubmitAnswer(BaseModel):
    question_id: int
    selected: Optional[str] = None


class MockTestSubmission(BaseModel):
    session_id: str
    answers: list[SubmitAnswer]
    time_taken: float = 0.0