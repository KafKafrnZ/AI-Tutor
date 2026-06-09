"""Mock test question formatting and server-side grading helpers."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.database import MasterQuestion, get_questions_for_test
from data.fallback_questions import FALLBACK_MOCK_QUESTION_BANK, OPTION_LETTERS


def normalize_correct_option(correct_answer: str | None, options: list[str]) -> str:
    answer = (correct_answer or "").strip()
    if not answer:
        return ""

    normalized = answer.upper().replace("OPTION", "").strip(" .:-)")
    if normalized in OPTION_LETTERS:
        return normalized

    if len(answer) >= 2 and answer[0].upper() in OPTION_LETTERS and answer[1] in {".", ")", ":", "-", " "}:
        return answer[0].upper()

    answer_lower = answer.casefold()
    for index, option in enumerate(options):
        if answer_lower == (option or "").strip().casefold():
            return OPTION_LETTERS[index]

    return answer


def correct_answer_text(correct_option: str, options: list[str]) -> str:
    if correct_option in OPTION_LETTERS:
        return options[OPTION_LETTERS.index(correct_option)]
    return correct_option


def format_question_payload(
    *,
    question_id: int,
    section: str | None,
    topic: str | None,
    question: str,
    options: list[str],
    correct_answer: str | None = None,
    explanation: str | None = None,
    source: str,
    mode: str = "exam",
) -> dict[str, Any]:
    while len(options) < 4:
        options.append("")

    clean_options = [option or "" for option in options[:4]]
    base: dict[str, Any] = {
        "id": question_id,
        "section": section or "General",
        "topic": topic or "General",
        "question": question,
        "options": clean_options,
        "source": source,
    }

    if mode == "result":
        correct_option = normalize_correct_option(correct_answer, clean_options)
        base["correct_answer"] = correct_option
        base["correct_answer_text"] = correct_answer_text(correct_option, clean_options)
        base["explanation"] = explanation or "No explanation available yet."

    return base


def _grading_record_from_db(q: MasterQuestion) -> dict[str, Any]:
    options = [q.option_a, q.option_b, q.option_c, q.option_d]
    correct_option = normalize_correct_option(q.correct_answer, [o or "" for o in options])
    clean_options = [(o or "") for o in options[:4]]
    while len(clean_options) < 4:
        clean_options.append("")
    return {
        "id": q.id,
        "section": q.section or "General",
        "topic": q.topic or "General",
        "question": q.question_text,
        "options": clean_options,
        "correct_answer": correct_option,
        "correct_answer_text": correct_answer_text(correct_option, clean_options),
        "explanation": q.explanation or "",
        "source": "database",
    }


def _grading_record_from_fallback(test_id: int, index: int, item: dict[str, Any]) -> dict[str, Any]:
    options = list(item["options"])
    correct_option = normalize_correct_option(str(item.get("correct_answer", "")), options)
    return {
        "id": (test_id * 10000) + index,
        "section": item.get("section") or "General",
        "topic": item.get("topic") or "General",
        "question": str(item["question"]),
        "options": options,
        "correct_answer": correct_option,
        "correct_answer_text": correct_answer_text(correct_option, options),
        "explanation": item.get("explanation") or "",
        "source": "generated_fallback",
    }


def get_grading_catalog(db: Session, test_id: int) -> tuple[list[dict[str, Any]], bool]:
    """Return full question records for server-side grading and whether fallback was used."""
    db_questions = get_questions_for_test(db, test_id)
    if db_questions:
        return [_grading_record_from_db(q) for q in db_questions], False

    templates = FALLBACK_MOCK_QUESTION_BANK.get(test_id) or FALLBACK_MOCK_QUESTION_BANK[1]
    records = [
        _grading_record_from_fallback(test_id, index, item)
        for index, item in enumerate(templates, start=1)
    ]
    return records, True


def build_exam_questions(catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        format_question_payload(
            question_id=q["id"],
            section=q["section"],
            topic=q["topic"],
            question=q["question"],
            options=q["options"],
            correct_answer=q["correct_answer"],
            explanation=q["explanation"],
            source=q["source"],
            mode="exam",
        )
        for q in catalog
    ]


def build_fallback_mock_questions(test_id: int) -> list[dict[str, Any]]:
    templates = FALLBACK_MOCK_QUESTION_BANK.get(test_id) or FALLBACK_MOCK_QUESTION_BANK[1]
    return [
        format_question_payload(
            question_id=(test_id * 10000) + index,
            section=item.get("section"),
            topic=item.get("topic"),
            question=str(item["question"]),
            options=list(item["options"]),
            correct_answer=str(item.get("correct_answer", "")),
            explanation=item.get("explanation"),
            source="generated_fallback",
            mode="exam",
        )
        for index, item in enumerate(templates, start=1)
    ]


def fallback_question_count(test_id: int) -> int:
    return len(FALLBACK_MOCK_QUESTION_BANK.get(test_id) or FALLBACK_MOCK_QUESTION_BANK[1])