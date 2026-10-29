import asyncio

import httpx

from app.core import llm_adapter
from app.core.config import default_llm_fallback_model, settings


def _response(status: int, body: dict) -> httpx.Response:
    return httpx.Response(
        status,
        json=body,
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions"),
    )


async def _post_once(client, **kwargs):
    response = await client.post(**kwargs)
    response.raise_for_status()
    return response


class _CompleteClient:
    def __init__(self, by_model: dict[str, httpx.Response]):
        self.by_model = by_model
        self.models: list[str] = []

    async def post(self, url, headers, json):
        model = json["model"]
        self.models.append(model)
        return self.by_model[model]


class _StreamResponse:
    def __init__(self, status: int, lines: list[str]):
        self.status_code = status
        self._lines = lines
        self.request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                "error",
                request=self.request,
                response=httpx.Response(self.status_code, request=self.request),
            )

    async def aiter_lines(self):
        for line in self._lines:
            yield line

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None


class _StreamClient:
    def __init__(self, by_model: dict[str, _StreamResponse]):
        self.by_model = by_model
        self.models: list[str] = []

    def stream(self, method, url, headers, json):
        model = json["model"]
        self.models.append(model)
        return self.by_model[model]


def test_default_llm_fallback_model(monkeypatch):
    monkeypatch.delenv("LLM_FALLBACK_MODEL", raising=False)
    assert default_llm_fallback_model("https://api.groq.com/openai/v1") == "llama-3.1-8b-instant"
    assert default_llm_fallback_model("https://api.anthropic.com/v1") == ""
    monkeypatch.setenv("LLM_FALLBACK_MODEL", "")
    assert default_llm_fallback_model("https://api.groq.com/openai/v1") == ""
    monkeypatch.setenv("LLM_FALLBACK_MODEL", "llama-3.1-8b-instant")
    assert default_llm_fallback_model("https://api.anthropic.com/v1") == "llama-3.1-8b-instant"


def test_chat_complete_falls_back_after_retryable_primary(monkeypatch):
    monkeypatch.setattr(settings, "LLM_MODEL", "llama-3.3-70b-versatile")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODEL", "llama-3.1-8b-instant")
    monkeypatch.setattr(settings, "LLM_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setattr(llm_adapter, "_call_llm_with_retry", _post_once)

    client = _CompleteClient({
        "llama-3.3-70b-versatile": _response(429, {"error": "rate"}),
        "llama-3.1-8b-instant": _response(200, {"choices": [{"message": {"content": "from-fallback"}}]}),
    })
    monkeypatch.setattr(llm_adapter, "get_http_client", lambda: client)

    result = asyncio.run(llm_adapter.chat_complete([{"role": "user", "content": "hi"}]))
    assert result == "from-fallback"
    assert client.models == ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]


def test_chat_complete_skips_fallback_on_4xx(monkeypatch):
    monkeypatch.setattr(settings, "LLM_MODEL", "llama-3.3-70b-versatile")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODEL", "llama-3.1-8b-instant")
    monkeypatch.setattr(llm_adapter, "_call_llm_with_retry", _post_once)

    client = _CompleteClient({
        "llama-3.3-70b-versatile": _response(400, {"error": "bad"}),
    })
    monkeypatch.setattr(llm_adapter, "get_http_client", lambda: client)

    try:
        asyncio.run(llm_adapter.chat_complete([{"role": "user", "content": "hi"}]))
        raise AssertionError("expected HTTPStatusError")
    except httpx.HTTPStatusError:
        pass
    assert client.models == ["llama-3.3-70b-versatile"]


def test_chat_complete_skips_fallback_when_unset(monkeypatch):
    monkeypatch.setattr(settings, "LLM_MODEL", "llama-3.3-70b-versatile")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODEL", "")
    monkeypatch.setattr(llm_adapter, "_call_llm_with_retry", _post_once)

    client = _CompleteClient({
        "llama-3.3-70b-versatile": _response(429, {"error": "rate"}),
    })
    monkeypatch.setattr(llm_adapter, "get_http_client", lambda: client)

    try:
        asyncio.run(llm_adapter.chat_complete([{"role": "user", "content": "hi"}]))
        raise AssertionError("expected HTTPStatusError")
    except httpx.HTTPStatusError:
        pass
    assert client.models == ["llama-3.3-70b-versatile"]


def test_chat_stream_falls_back_before_tokens(monkeypatch):
    monkeypatch.setattr(settings, "LLM_MODEL", "llama-3.3-70b-versatile")
    monkeypatch.setattr(settings, "LLM_FALLBACK_MODEL", "llama-3.1-8b-instant")
    monkeypatch.setattr(settings, "LLM_BASE_URL", "https://api.groq.com/openai/v1")

    async def _no_sleep(_delay):
        return None

    monkeypatch.setattr(llm_adapter.asyncio, "sleep", _no_sleep)

    client = _StreamClient({
        "llama-3.3-70b-versatile": _StreamResponse(429, []),
        "llama-3.1-8b-instant": _StreamResponse(
            200,
            ['data: {"choices":[{"delta":{"content":"hi"}}]}', "data: [DONE]"],
        ),
    })
    monkeypatch.setattr(llm_adapter, "get_http_client", lambda: client)

    async def _collect():
        return "".join([token async for token in llm_adapter.chat_stream([{"role": "user", "content": "hi"}])])

    assert asyncio.run(_collect()) == "hi"
    assert client.models[0] == "llama-3.3-70b-versatile"
    assert client.models[-1] == "llama-3.1-8b-instant"
