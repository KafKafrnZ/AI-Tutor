from datetime import datetime, timezone, date as date_type
from sqlalchemy import create_engine, Column, Integer, String, Date, ForeignKey, Float, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Pool kwargs only valid for PostgreSQL/MySQL — SQLite (used in tests) rejects them
_pg_pool_kwargs = (
    {"pool_size": 10, "max_overflow": 20, "pool_timeout": 30,
     "pool_recycle": 1800, "pool_pre_ping": True}
    if not settings.DATABASE_URL.startswith("sqlite")
    else {}
)
engine = create_engine(settings.DATABASE_URL, **_pg_pool_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    plan = Column(String, default="free")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    is_verified = Column(Boolean, default=False)      

    mock_tests = relationship("MockTest", back_populates="user")

    auth_tokens = relationship("AuthToken", back_populates="user", cascade="all, delete-orphan")

class AuthToken(Base):
    __tablename__ = "auth_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    token = Column(String, unique=True, index=True)
    token_type = Column(String) # Will store "verify_email" or "reset_password"
    expires_at = Column(DateTime)

    user = relationship("User", back_populates="auth_tokens")


class MockTest(Base):
    __tablename__ = "mock_tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date) # FIX-10: Upgraded column type from String to proper Date type
    test_name = Column(String)
    section = Column(String)
    attempted = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    time_taken = Column(Float, default=0.0)

    user = relationship("User", back_populates="mock_tests")

class MasterQuestion(Base):
    __tablename__ = "master_questions"

    id = Column(Integer, primary_key=True, index=True)
    # Catalog/set id for reusable mock question banks. This must not point at
    # user attempt history rows in mock_tests.
    test_id = Column(Integer, index=True)
    section = Column(String) # Reasoning, Quant, English, IT
    topic = Column(String) # Sub-topic
    question_text = Column(String, nullable=False)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    option_d = Column(String)
    correct_answer = Column(String)
    explanation = Column(String)

class ErrorLog(Base):
    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_text = Column(String)
    user_answer = Column(String)
    correct_answer = Column(String)
    explanation = Column(String)
    date_added = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_user(db: Session, name: str, email: str, password_hash: str, is_verified: bool = False):
    db_user = User(
        name=name,
        email=email.lower().strip(),
        password_hash=password_hash,
        is_verified=is_verified,
    )
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        logger.error("Failed to create user: %s", e, exc_info=True)
        return None
    
def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email.lower().strip()).first()
    
def save_mock_test(db: Session, user_id: int, data: dict):
    try:
        date_val = data.get("date")
        # FIX-10: Safely split and parse incoming text string components into real date instances
        if isinstance(date_val, str):
            date_val = date_type.fromisoformat(date_val.split('T')[0])

        mock_test = MockTest(
            user_id=user_id,
            date=date_val,
            test_name=data.get("test_name"),
            section=data.get("section"),
            attempted=int(data.get("attempted", 0)), 
            correct=int(data.get("correct", 0)),     
            time_taken=float(data.get("time_taken", 0.0))
        )
        db.add(mock_test)
        db.commit()
        db.refresh(mock_test)
        return mock_test
    except Exception as e:
        db.rollback()
        logger.error("Failed to save mock test: %s", e, exc_info=True)
        return None

def get_questions_for_test(db: Session, test_id: int):
    return db.query(MasterQuestion).filter(MasterQuestion.test_id == test_id).all()

def save_error_log(db: Session, user_id: int, error_data: dict):
    try:
        error_entry = ErrorLog(
            user_id=user_id,
            question_text=error_data.get("question_text"),
            user_answer=error_data.get("user_answer"),
            correct_answer=error_data.get("correct_answer"),
            explanation=error_data.get("explanation")
        )
        db.add(error_entry)
        db.commit()
        db.refresh(error_entry)
        return error_entry
    except Exception as e:
        db.rollback()
        logger.error("Failed to save error log: %s", e, exc_info=True)
        return None
