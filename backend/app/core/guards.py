import re
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Injection patterns — covers prompt injection, jailbreak, and system-prompt
# leakage attempts. Checked case-insensitively.
# ---------------------------------------------------------------------------
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"ignore\s+(previous|all|prior)\s+(instructions?|prompts?|rules?|context)",
        r"you\s+are\s+now",
        r"act\s+as\s+(a\s+|an\s+)?(?!exam|tutor|student|teacher)",
        r"pretend\s+(you\s+are|to\s+be)",
        r"\bdan\s+mode\b",
        r"\bjailbreak\b",
        r"system\s*:",
        r"\[INST\]",
        r"\[SYS\]",
        r"<\s*system\s*>",
        r"disregard\s+(your|all|previous)",
        r"override\s+(your|all|previous|safety)",
        r"reveal\s+(your\s+)?(system\s+)?prompt",
        r"print\s+(your\s+)?(system\s+)?instructions",
    ]
]

# Blocks suspiciously long base64 blobs (common exfiltration vector)
_BASE64_BLOB = re.compile(r"[A-Za-z0-9+/]{80,}={0,2}")

# Strip HTML / script tags
_HTML_TAG = re.compile(r"<[^>]{0,200}>")


def sanitize_user_input(text: str, max_length: int = 2000) -> str:
    """
    Clean raw user input before it reaches the LLM.

    Steps:
      1. Strip HTML / script tags (no bleach dependency required)
      2. Collapse excess whitespace
      3. Truncate to max_length characters
    """
    text = _HTML_TAG.sub("", text)
    text = re.sub(r"\s{3,}", "  ", text)
    return text.strip()[:max_length]


def detect_injection(text: str) -> bool:
    """
    Return True if text looks like a prompt-injection attempt.
    Checks known jailbreak phrases AND suspicious base64 blobs.
    """
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            return True
    if _BASE64_BLOB.search(text):
        return True
    return False


def guard_input(text: str, max_length: int = 2000) -> str:
    """
    Convenience wrapper: sanitize then check for injection.
    Raises HTTP 400 if injection is detected.
    Returns the sanitized string if clean.

    Use this at the top of every endpoint that accepts free-text user input.

    Example:
        topic = guard_input(data.topic, max_length=500)
    """
    clean = sanitize_user_input(text, max_length=max_length)
    if detect_injection(clean):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INJECTION_DETECTED",
                "message": "Input contains disallowed content. Please rephrase your question.",
            },
        )
    return clean
