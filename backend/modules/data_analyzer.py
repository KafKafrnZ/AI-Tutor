import pandas as pd
import logging
from sqlalchemy.orm import Session
from app.models.database import MockTest, ErrorLog
from app.core.structured_llm import structured_complete
from app.schemas.api import RevisionPlanResponse

logger = logging.getLogger(__name__)

# H-03 FIX: Added limit parameter (default 50) and descending order
def load_data(db: Session, user_id: int, limit: int = 50):
    try:
        # Sort by date descending and slice the limit to prevent memory bombs
        records = db.query(MockTest).filter(MockTest.user_id == user_id).order_by(MockTest.date.desc()).limit(limit).all()

        if not records:
            return pd.DataFrame(columns=["date", "test_name", "section", "attempted", "correct", "time_taken"])
        
        data = [{
            "date": r.date,
            "test_name": r.test_name,
            "section": r.section,
            "attempted": r.attempted,
            "correct": r.correct,
            "time_taken": r.time_taken
        } for r in records]

        return pd.DataFrame(data)

    except Exception as e:
        logger.error("Failed to load mock test data for user %s: %s", user_id, e, exc_info=True)
        return pd.DataFrame(columns=["date", "test_name", "section", "attempted", "correct", "time_taken"])
    

def calculate_accuracy(df):
    if df.empty:
        return df
    
    # CRITICAL FIX: Force columns to be numeric to prevent string division crashes
    df["correct"] = pd.to_numeric(df["correct"], errors='coerce').fillna(0)
    df["attempted"] = pd.to_numeric(df["attempted"], errors='coerce').fillna(0)
    
    df["accuracy"] = (df["correct"] / df["attempted"].replace(0, 1)) * 100   # Prevent division by zero
    return df

def get_weak_areas(df):
    if df.empty:
        return "No data available"
    
    section_perf = df.groupby("section")["accuracy"].mean()
    return section_perf.sort_values().head(2)

def get_overall_stats(df):
    if df.empty:
        return {
            "avg_accuracy": 0,
            "total_tests": 0
        }
    return {
        "avg_accuracy": float(round(df["accuracy"].mean(), 2)) if not df.empty else 0,
        "total_tests": int(len(df))
    }

# ====================== NEW: AI INTELLIGENCE ENGINE ======================

async def get_ai_revision_plan(db: Session, user_id: int) -> dict:
    """
    Analyzes the user's recent mistakes using the AI engine to generate 
    a highly personalized, micro-topic revision checklist.
    """
    # Fetch the last 15 mistakes from the locker (This was already safely limited)
    errors = db.query(ErrorLog).filter(ErrorLog.user_id == user_id).order_by(ErrorLog.date_added.desc()).limit(15).all()

    if not errors:
        return {
            "primary_weakness": "Keep Practicing!",
            "critical_concepts": ["Take more mock tests to generate data."],
            "actionable_checklist": ["Complete your first mock test", "Save your wrong answers to the Mistake Locker"]
        }

    # Construct the context payload
    error_context = ""
    for i, err in enumerate(errors, 1):
        error_context += f"\nMistake {i}:\nQuestion: {err.question_text}\nUser Answer: {err.user_answer}\nCorrect Answer: {err.correct_answer}\n"

    system_prompt = f"""You are an expert strategist for Indian government competitive exams (UPSC, SSC CGL, IBPS PO/SO/Clerk, RRB NTPC, State PSC, SBI PO, RBI Grade B, SEBI, NABARD, and all other central/state recruitment exams). Analyze the student's recent mistakes and identify their deep conceptual weaknesses.

Student's Recent Mistakes:
{error_context}

Your task is to identify the precise micro-topics they are failing at. Do not just say "Reasoning" or "Quant". Be specific (e.g., "Syllogism - Possibility Cases", "Time & Work - Efficiency Concepts", "Indian Polity - Fundamental Rights exceptions", "Computer Networks - OSI Layer functions").

primary_weakness is the #1 main area dragging their score down. critical_concepts and actionable_checklist should each have 3 items."""
    try:
        plan = await structured_complete(
            [{"role": "user", "content": system_prompt}],
            response_model=RevisionPlanResponse,
            temperature=0.2,
            max_tokens=1500,
        )
        return plan.model_dump()
    except Exception as e:
        return {"error": f"Failed to generate AI analysis: {str(e)}"}
