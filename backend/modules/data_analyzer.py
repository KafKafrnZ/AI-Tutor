import pandas as pd
from sqlalchemy.orm import Session
from app.models.database import MockTest

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