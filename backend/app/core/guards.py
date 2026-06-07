import re

from fastapi import HTTPException


def sanitize_user_input(text: str, max_length: int = 2000) -> str:
    cleaned = re.sub(r"<[^>]{0,200}>", "", text)
    cleaned = re.sub(r"\s{3,}", "  ", cleaned)
    cleaned = cleaned.strip()
    return cleaned[:max_length]


def detect_injection(text: str) -> bool:
    patterns = [
        r"ignore\s+(previous|all|prior)\s+(instructions?|prompts?|rules?)",
        r"you\s+are\s+now",
        r"act\s+as\s+(a\s+|an\s+)?",
        r"pretend\s+(you\s+are|to\s+be)",
        r"\bdan\s+mode\b",
        r"\bjailbreak\b",
        r"system\s*:",
        r"\[INST\]",
        r"disregard\s+(your|all|previous)",
        r"override\s+(your|all|previous|safety)",
        r"reveal\s+(your\s+)?(system\s+)?prompt",
    ]
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns) or bool(
        re.compile(r"[A-Za-z0-9+/]{80,}={0,2}").search(text)
    )


def guard_input(text: str, max_length: int = 2000) -> str:
    cleaned = sanitize_user_input(text, max_length=max_length)
    if detect_injection(cleaned):
        raise HTTPException(
            status_code=400,
            detail={"code": "INJECTION_DETECTED", "message": "Input contains disallowed content."},
        )
    return cleaned
