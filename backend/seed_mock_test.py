import os
import json
import sys
import time
import re
from sqlalchemy.orm import Session

# Ensure Python can find your app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.database import SessionLocal, MasterQuestion, init_db
from modules.tutor import generate_questions

def clean_llm_json(raw_str):
    """Cleans up common LLM JSON formatting errors."""
    # 1. Strip markdown code blocks if the LLM included them
    if "```json" in raw_str:
        raw_str = raw_str.split("```json")[1].split("```")[0]
    elif "```" in raw_str:
        raw_str = raw_str.split("```")[1].split("```")[0]
        
    # 2. Remove illegal trailing commas before closing brackets/braces
    raw_str = re.sub(r',\s*]', ']', raw_str)
    raw_str = re.sub(r',\s*}', '}', raw_str)
    
    return raw_str.strip()

def seed_database():
    print("🚀 Initializing Database Connection...")
    init_db()
    db = SessionLocal()

    topics = [
        {"section": "Reasoning", "topic": "IBPS SO Puzzles and Seating Arrangement advanced level"},
        {"section": "Reasoning", "topic": "IBPS SO Syllogism and Blood Relations advanced level"},
        {"section": "Quant", "topic": "IBPS SO Data Interpretation and DI advanced level"},
        {"section": "Quant", "topic": "IBPS SO Number Series and Quadratic Equations advanced level"},
        {"section": "English & IT", "topic": "IBPS SO Database Management Systems and Networking"}
    ]

    test_id = 1
    total_inserted = 0

    print(f"🗑️ Clearing old test data for Test ID {test_id} (if any)...")
    db.query(MasterQuestion).filter(MasterQuestion.test_id == test_id).delete()
    db.commit()

    for i, t in enumerate(topics):
        print(f"\n🧠 [{i+1}/5] Generating questions for {t['section']} - {t['topic']}...")
        
        raw_json = generate_questions(t['topic'])

        try:
            cleaned_json = clean_llm_json(raw_json)
            questions = json.loads(cleaned_json)
            
            for q in questions:
                opts = q.get("options", ["", "", "", ""])
                while len(opts) < 4:
                    opts.append("N/A")
                
                db_question = MasterQuestion(
                    test_id=test_id,
                    section=t["section"],
                    topic=t["topic"],
                    question_text=q.get("question", "Question missing"),
                    option_a=opts[0],
                    option_b=opts[1],
                    option_c=opts[2],
                    option_d=opts[3],
                    correct_answer=q.get("correct_answer", ""),
                    explanation=q.get("explanation", "No explanation provided.")
                )
                db.add(db_question)
                total_inserted += 1

            db.commit()
            print(f"✅ Successfully inserted {len(questions)} questions!")

        except Exception as e:
            print(f"❌ Error parsing or inserting questions: {e}")
            db.rollback()

        # If it's not the last topic, sleep to respect Groq's Rate Limits
        if i < len(topics) - 1:
            print("⏳ Sleeping for 35 seconds to avoid Groq API Rate Limits...")
            time.sleep(35)

    print(f"\n🎉 Seeding Complete! Total questions inserted: {total_inserted}")
    db.close()

if __name__ == "__main__":
    seed_database()