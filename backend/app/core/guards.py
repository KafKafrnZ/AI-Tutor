import re


INJECTION_PATTERNS = (
    "ignore previous",
    "ignore all",
    "you are now",
    "act as",
    "pretend you",
    "system:",
    "[INST]",
    "jailbreak",
    "DAN mode",
)


def sanitize_user_input(text: str) -> str:
    cleaned = re.sub("<[^>]+>", "", text or "")
    return cleaned.strip()[:2000]


def detect_injection(text: str) -> bool:
    return any(re.search(re.escape(pattern), text or "", re.IGNORECASE) for pattern in INJECTION_PATTERNS)
