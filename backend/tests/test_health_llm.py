import pytest
import httpx
from fastapi.testclient import TestClient
from app.core.llm_adapter import llm_ping
from app.core.config import settings

def test_health_llm_connected(client: TestClient, monkeypatch):
    monkeypatch.setattr("app.routers.health.llm_ping", lambda: {"ok": True, "provider": "groq", "error": None})
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["llm"] == "connected"
    assert r.json()["database"] == "connected"

def test_health_llm_unavailable(client: TestClient, monkeypatch):
    monkeypatch.setattr("app.routers.health.llm_ping", lambda: {"ok": False, "provider": "groq", "error": "timeout"})
    r = client.get("/health")
    assert r.status_code == 200  # Should NOT be 503
    assert r.json()["llm"] == "unavailable"

def test_health_llm_unconfigured(client: TestClient, monkeypatch):
    monkeypatch.setattr("app.routers.health.llm_ping", lambda: {"ok": False, "provider": "groq", "error": "unconfigured"})
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["llm"] == "unconfigured"

def test_llm_ping_unit_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "LLM_API_KEY", "")

    def fail_client(*args, **kwargs):
        raise AssertionError("httpx.Client must not be constructed when unconfigured")

    monkeypatch.setattr(httpx, "Client", fail_client)
    res = llm_ping()
    assert res["ok"] is False
    assert res["error"] == "unconfigured"

def test_llm_ping_unit_connect_error(monkeypatch):
    monkeypatch.setattr(settings, "LLM_API_KEY", "dummy")
    
    class MockClient:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def get(self, url):
            raise httpx.ConnectError("Connection failed")
            
    monkeypatch.setattr(httpx, "Client", MockClient)
    res = llm_ping()
    assert res["ok"] is False
    assert "Connection failed" in res["error"]

def test_llm_ping_unit_reachable_auth_error(monkeypatch):
    monkeypatch.setattr(settings, "LLM_API_KEY", "dummy")
    
    class MockClient:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def get(self, url):
            return httpx.Response(401, request=httpx.Request("GET", url))
            
    monkeypatch.setattr(httpx, "Client", MockClient)
    res = llm_ping()
    assert res["ok"] is True
    assert res["error"] is None
