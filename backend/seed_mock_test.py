import os
import json
import time
import re
import asyncio
from sqlalchemy.orm import Session

from app.models.database import SessionLocal, MasterQuestion
from modules.tutor import generate_questions

# Maps each test_id to its sections/topics — aligned with MOCK_TEST_META in main.py
TEST_TOPICS = {
    1: [  # "Government Exam Foundation Mock - Set 1" — Hard, 90 min
        {"section": "Polity",       "topic": "Indian Constitution — Fundamental Rights, Directive Principles, and Amendment Procedure for UPSC Prelims"},
        {"section": "History",      "topic": "Modern Indian History — Nationalist Movements and Freedom Struggle for UPSC Prelims"},
        {"section": "Geography",    "topic": "Physical Geography of India — Rivers, Mountain Ranges, Climate, and Soils for UPSC Prelims"},
        {"section": "Economy",      "topic": "Indian Economy — Planning Commission, Five Year Plans, Poverty, and Development Indicators"},
        {"section": "Science & Tech", "topic": "Science and Technology — Space, Defence, Biotechnology, and Government Initiatives for UPSC Prelims"},
    ],
    2: [  # "Reasoning + Quant Special" — Medium, 75 min
        {"section": "Reasoning",    "topic": "Logical Reasoning — Puzzles, Seating Arrangements, and Scheduling for Government Competitive Exams"},
        {"section": "Reasoning",    "topic": "Critical Reasoning — Syllogisms, Statement-Conclusions, and Blood Relations for Government Exams"},
        {"section": "Quant",        "topic": "Data Interpretation — Bar Graphs, Pie Charts, and Tables for Government Competitive Exams"},
        {"section": "Quant",        "topic": "Quantitative Aptitude — Percentage, Profit and Loss, Simple and Compound Interest for State PSC"},
    ],
    3: [  # "English + General Awareness Combined" — Easy, 60 min
        {"section": "English",      "topic": "English Language — Reading Comprehension, Para Jumbles, and Sentence Correction for Government Exams"},
        {"section": "General Awareness", "topic": "Indian Culture and Heritage — Art, Architecture, Literature, and UNESCO Sites for UPSC Prelims"},
        {"section": "General Awareness", "topic": "Current Affairs — Major Government Schemes, Policies, and National/International Events 2024–2025"},
    ],
}


def clean_llm_json(raw_str: str) -> str:
    if "```json" in raw_str:
        raw_str = raw_str.split("```json")[1].split("```")[0]
    elif "```" in raw_str:
        raw_str = raw_str.split("```")[1].split("```")[0]
    raw_str = re.sub(r',\s*]', ']', raw_str)
    raw_str = re.sub(r',\s*}', '}', raw_str)
    return raw_str.strip()


def seed_test(db: Session, test_id: int, topics: list[dict]) -> int:
    existing = db.query(MasterQuestion).filter(MasterQuestion.test_id == test_id).count()
    if existing > 0:
        print(f"  ℹ️  Test {test_id} already has {existing} questions — skipping (delete rows or change test_id to re-seed).")
        return 0

    total = 0
    for i, t in enumerate(topics):
        print(f"  🧠 [{i+1}/{len(topics)}] Generating: {t['section']} — {t['topic'][:60]}…")
        raw_json = asyncio.run(generate_questions(t["topic"]))

        try:
            questions = json.loads(clean_llm_json(raw_json))
            for q in questions:
                opts = q.get("options", ["", "", "", ""])
                while len(opts) < 4:
                    opts.append("N/A")
                db.add(MasterQuestion(
                    test_id=test_id,
                    section=t["section"],
                    topic=t["topic"],
                    question_text=q.get("question", "Question missing"),
                    option_a=opts[0],
                    option_b=opts[1],
                    option_c=opts[2],
                    option_d=opts[3],
                    correct_answer=q.get("correct_answer", ""),
                    explanation=q.get("explanation", "No explanation provided."),
                ))
                total += 1
            db.commit()
            print(f"  ✅ Inserted {len(questions)} questions.")
        except Exception as e:
            print(f"  ❌ Parse/insert error: {e}")
            db.rollback()

        # Respect Groq rate limits between topic batches
        if i < len(topics) - 1:
            print("  ⏳ Sleeping 35 s (Groq rate limit)…")
            time.sleep(35)

    return total


def seed_database():
    print("🚀 Connecting to DB (Alembic-managed schema)…\n")
    db = SessionLocal()
    grand_total = 0

    for test_id, topics in TEST_TOPICS.items():
        print(f"📋 Seeding Test ID {test_id} ({len(topics)} topic batches)…")
        inserted = seed_test(db, test_id, topics)
        grand_total += inserted
        if inserted > 0 and test_id < max(TEST_TOPICS):
            print(f"\n⏳ Pausing 60 s before next test set…\n")
            time.sleep(60)

    print(f"\n🎉 Seeding complete! Total questions inserted: {grand_total}")
    db.close()


if __name__ == "__main__":
    seed_database()
