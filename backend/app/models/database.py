from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from app.core.config import settings

# Create Engine using centralized settings
engine = create_engine(settings.DATABASE_URL)
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

    mock_tests = relationship("MockTest", back_populates="user")

class MockTest(Base):
    __tablename__ = "mock_tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(String)
    test_name = Column(String)
    section = Column(String)
    attempted = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    time_taken = Column(Float, default=0.0)

    user = relationship("User", back_populates="mock_tests")

class MasterQuestion(Base):
    __tablename__ = "master_questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, index=True) # E.g., 1 for "Mock Set 1"
    section = Column(String) # Reasoning, Quant, English, IT
    topic = Column(String) # Sub-topic
    question_text = Column(String, nullable=False)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    option_d = Column(String)
    correct_answer = Column(String)
    explanation = Column(String)

# --- NEW: Error Log Schema ---
class ErrorLog(Base):
    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_text = Column(String)
    user_answer = Column(String)
    correct_answer = Column(String)
    explanation = Column(String)
    date_added = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_user(db: Session, name: str, email: str, password_hash: str):
    db_user = User(
        name=name,
        email=email.lower().strip(),
        password_hash=password_hash
    )
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        print("Create user error:", e)
        return None
    
def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email.lower().strip()).first()
    
def save_mock_test(db: Session, user_id: int, data: dict):
    try:
        mock_test = MockTest(
            user_id=user_id,
            date=data.get("date"),
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
        print(f"Save mock test error: {e}")
        return None

def get_questions_for_test(db: Session, test_id: int):
    return db.query(MasterQuestion).filter(MasterQuestion.test_id == test_id).all()

# --- NEW: Retrieve & Save Errors Helper ---
def save_error_log(db: Session, user_id: int, error_data: dict):
    error_entry = ErrorLog(
        user_id=user_id,
        question_text=error_data.get("question_text"),
        user_answer=error_data.get("user_answer"),
        correct_answer=error_data.get("correct_answer"),
        explanation=error_data.get("explanation")
    )
    db.add(error_entry)
    db.commit()