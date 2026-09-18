"""Structured LLM output via Instructor (github.com/567-labs/instructor).

Replaces hand-rolled "strip markdown fences, find the outer brackets,
json.loads() and hope" parsing with a Pydantic response_model: Instructor
validates the response and automatically retries with the validation error
fed back to the model on failure, instead of silently shipping malformed
data or a fake placeholder to the user.

Scoped to the OpenAI-compatible provider path (Groq/OpenAI) for now, same
as production actually runs (LLM_BASE_URL defaults to Groq). The Anthropic
branch in llm_adapter.detect_provider() isn't wired up here yet.
"""

from typing import Any, TypeVar, cast

import instructor
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings
from app.core.llm_adapter import detect_provider

T = TypeVar("T", bound=BaseModel)

_client = None


def _get_client() -> instructor.AsyncInstructor:
    global _client
    if _client is not None:
        return _client

    provider = detect_provider(settings.LLM_BASE_URL)
    if provider == "anthropic":
        raise RuntimeError(
            "structured_complete() only supports OpenAI-compatible providers "
            "(Groq/OpenAI) right now; the configured LLM_BASE_URL is Anthropic."
        )

    openai_client = AsyncOpenAI(base_url=settings.LLM_BASE_URL, api_key=settings.LLM_API_KEY)
    _client = instructor.from_openai(openai_client, mode=instructor.Mode.JSON)
    return _client


async def structured_complete(
    messages: list[dict],
    response_model: type[T],
    temperature: float = 0.25,
    max_tokens: int = 2048,
    max_retries: int = 2,
) -> T:
    client = _get_client()
    return await client.chat.completions.create(
        model=settings.LLM_MODEL,
        # plain dicts at runtime; openai-python types this as its TypedDict union
        messages=cast(Any, messages),
        response_model=response_model,
        temperature=temperature,
        max_tokens=max_tokens,
        max_retries=max_retries,
    )
