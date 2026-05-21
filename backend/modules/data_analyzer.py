import pandas as pd
import json
from sqlalchemy.orm import Session
from app.models.database import MockTest, ErrorLog
# Import our new async cloud engine
from modules.tutor import run_cloud_model 

def load_data(db: Session, user_id: int):
    try:
        records = db.query(MockTest).filter(MockTest.user_id == user_id).all()

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
        print(f"Error loading data: {e}")
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
        "avg_accuracy": round(df["accuracy"].mean(), 2) if not df.empty else 0,
        "total_tests": len(df)
    }

# ====================== NEW: AI INTELLIGENCE ENGINE ======================

async def get_ai_revision_plan(db: Session, user_id: int) -> dict:
    """
    Analyzes the user's recent mistakes using the AI engine to generate 
    a highly personalized, micro-topic revision checklist.
    """
    # Fetch the last 15 mistakes from the locker
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

    system_prompt = f"""You are an elite IBPS SO exam strategist. Analyze the student's recent mistakes and identify their deep conceptual weaknesses.

Student's Recent Mistakes:
{error_context}

Your task is to identify the precise micro-topics they are failing at. Do not just say "Reasoning" or "Quant". Be specific (e.g., "Syllogism - Possibility Cases", "Time & Work - Efficiency Concepts").

Output MUST be a pure JSON object. Do not include markdown formatting like ```json.
Exact schema:
{{
  "primary_weakness": "string (The #1 main area dragging their score down)",
  "critical_concepts": ["concept 1", "concept 2", "concept 3"],
  "actionable_checklist": [
    "Actionable step 1...",
    "Actionable step 2...",
    "Actionable step 3..."
  ]
}}
"""
    try:
        raw_response = await run_cloud_model(system_prompt, temperature=0.2, max_tokens=1500)
        
        # Bulletproof JSON extraction
        cleaned = raw_response.strip()
        if "```" in cleaned:
            parts = cleaned.split("```")
            cleaned = parts[1] if len(parts) > 1 else cleaned
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
            
        return json.loads(cleaned)
    except Exception as e:
        return {"error": f"Failed to generate AI analysis: {str(e)}"}