import json
import logging
from typing import Any, AsyncGenerator

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_http_client: httpx.AsyncClient | None = None


def detect_provider(url: str) -> str:
    lowered = (url or "").lower()
    if "groq.com" in lowered:
        return "groq"
    if "anthropic.com" in lowered:
        return "anthropic"
    if "openai.com" in lowered:
        return "openai"
    return "openai_compat"


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10.0,
                read=settings.LLM_TIMEOUT_SECONDS,
                write=10.0,
                pool=5.0,
            )
        )
    return _http_client


def _completion_url(provider: str) -> str:
    base_url = settings.LLM_BASE_URL.rstrip("/")
    if provider == "anthropic":
        if base_url.endswith("/messages"):
            return base_url
        if base_url.endswith("/v1"):
            return f"{base_url}/messages"
        return f"{base_url}/v1/messages"

    if base_url.endswith("/chat/completions"):
        return base_url
    return f"{base_url}/chat/completions"


def _headers(provider: str) -> dict[str, str]:
    api_key = settings.LLM_API_KEY
    if not api_key and provider in {"groq", "openai", "anthropic"}:
        raise RuntimeError("LLM_API_KEY is missing")

    if provider == "anthropic":
        return {
            "x-api-key": api_key,
            "anthropic-version": settings.LLM_ANTHROPIC_VERSION,
            "Content-Type": "application/json",
        }

    return {
        "Authorization": f"Bearer {api_key or 'local-dev'}",
        "Content-Type": "application/json",
    }


def _merge_content(existing: Any, incoming: Any) -> Any:
    if isinstance(existing, str) and isinstance(incoming, str):
        return f"{existing}\n\n{incoming}"
    existing_blocks = existing if isinstance(existing, list) else [{"type": "text", "text": str(existing)}]
    incoming_blocks = incoming if isinstance(incoming, list) else [{"type": "text", "text": str(incoming)}]
    return [*existing_blocks, *incoming_blocks]


def _anthropic_messages(messages: list[dict]) -> tuple[str, list[dict[str, Any]]]:
    system_parts: list[str] = []
    anthropic_messages: list[dict[str, Any]] = []

    for message in messages:
        role = message.get("role")
        content = message.get("content", "")
        if not content:
            continue

        if role == "system":
            system_parts.append(str(content))
            continue

        normalized_role = "assistant" if role == "assistant" else "user"
        if anthropic_messages and anthropic_messages[-1]["role"] == normalized_role:
            anthropic_messages[-1]["content"] = _merge_content(
                anthropic_messages[-1]["content"],
                content,
            )
        else:
            anthropic_messages.append({"role": normalized_role, "content": content})

    if not anthropic_messages:
        raise ValueError("Anthropic requests require at least one user or assistant message")

    return "\n\n".join(system_parts), anthropic_messages


def _openai_payload(messages: list[dict], stream: bool, **kwargs: Any) -> dict[str, Any]:
    return {
        "model": settings.LLM_MODEL,
        "messages": messages,
        "stream": stream,
        **kwargs,
    }


def _anthropic_payload(messages: list[dict], stream: bool, **kwargs: Any) -> dict[str, Any]:
    kwargs = dict(kwargs)
    max_tokens = kwargs.pop("max_tokens", 2048)
    system_prompt, provider_messages = _anthropic_messages(messages)

    payload: dict[str, Any] = {
        "model": settings.LLM_MODEL,
        "messages": provider_messages,
        "max_tokens": max_tokens,
        "stream": stream,
        **kwargs,
    }
    if system_prompt:
        payload["system"] = system_prompt
    return payload


def _payload(provider: str, messages: list[dict], stream: bool, **kwargs: Any) -> dict[str, Any]:
    if provider == "anthropic":
        return _anthropic_payload(messages, stream=stream, **kwargs)
    return _openai_payload(messages, stream=stream, **kwargs)


def _extract_anthropic_text(data: dict[str, Any]) -> str:
    content = data.get("content", [])
    if isinstance(content, str):
        return content

    parts: list[str] = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "".join(parts)


async def chat_complete(messages: list[dict], **kwargs: Any) -> str:
    """Return a full response from the configured chat endpoint."""
    provider = detect_provider(settings.LLM_BASE_URL)
    client = get_http_client()
    response = await client.post(
        _completion_url(provider),
        headers=_headers(provider),
        json=_payload(provider, messages, stream=False, **kwargs),
    )
    response.raise_for_status()
    data = response.json()
    if provider == "anthropic":
        return _extract_anthropic_text(data)
    return data["choices"][0]["message"].get("content", "")


async def chat_stream(messages: list[dict], **kwargs: Any) -> AsyncGenerator[str, None]:
    """Yield text tokens from the configured streaming chat endpoint."""
    provider = detect_provider(settings.LLM_BASE_URL)
    client = get_http_client()
    async with client.stream(
        "POST",
        _completion_url(provider),
        headers=_headers(provider),
        json=_payload(provider, messages, stream=True, **kwargs),
    ) as response:
        response.raise_for_status()
        async for raw_line in response.aiter_lines():
            line = raw_line.strip()
            if not line or not line.startswith("data:"):
                continue

            data_str = line.removeprefix("data:").strip()
            if data_str == "[DONE]":
                break

            try:
                chunk = json.loads(data_str)
            except json.JSONDecodeError:
                continue

            if provider == "anthropic":
                event_type = chunk.get("type")
                if event_type == "content_block_delta":
                    delta = chunk.get("delta") or {}
                    token = delta.get("text", "")
                    if token:
                        yield token
                elif event_type == "message_delta":
                    delta = chunk.get("delta") or {}
                    stop_reason = delta.get("stop_reason")
                    if stop_reason:
                        logger.info("LLM stream stop_reason=%s", stop_reason)
                elif event_type == "error":
                    error = chunk.get("error") or {}
                    raise RuntimeError(error.get("message") or "Anthropic stream error")
                continue

            choice = chunk.get("choices", [{}])[0]
            finish_reason = choice.get("finish_reason")
            if finish_reason:
                logger.info("LLM stream finish_reason=%s", finish_reason)

            delta = choice.get("delta") or {}
            token = delta.get("content", "")
            if token:
                yield token
