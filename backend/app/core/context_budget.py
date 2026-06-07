import re


_TOKENISH_RE = re.compile(r"\w+|[^\w\s]", re.UNICODE)


def estimate_tokens(text: str) -> int:
    """Conservative token estimate without binding the app to one tokenizer."""
    text = text or ""
    if not text:
        return 0

    char_estimate = (len(text) + 3) // 4
    tokenish_estimate = int(len(_TOKENISH_RE.findall(text)) * 1.25) + 1
    return max(char_estimate, tokenish_estimate)


def estimate_messages_tokens(messages: list[dict]) -> int:
    # Chat APIs add role/envelope overhead that is easy to miss in text-only estimates.
    return sum(estimate_tokens(message.get("content", "")) + 4 for message in messages) + 2


def trim_to_budget(
    messages: list[dict],
    max_tokens: int = 6000,
    pinned_count: int = 2,
) -> list[dict]:
    """
    Drop oldest non-pinned message pairs until the prompt fits the budget.

    The first messages usually hold system instructions and trusted RAG context;
    those stay pinned so long conversations do not erase grounding.
    """
    if pinned_count < 0:
        pinned_count = 0

    pinned = messages[:pinned_count]
    history = messages[pinned_count:]

    while estimate_messages_tokens(pinned + history) > max_tokens and len(history) > 2:
        history = history[2:]

    return pinned + history
