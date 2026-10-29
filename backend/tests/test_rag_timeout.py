import concurrent.futures
import time

from app.core import rag


def _pool(monkeypatch, timeout: float) -> concurrent.futures.ThreadPoolExecutor:
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=1, thread_name_prefix="rag-test")
    monkeypatch.setattr(rag, "_rag_pool", pool)
    monkeypatch.setattr(rag.settings, "RAG_QUERY_TIMEOUT_SECONDS", timeout)
    monkeypatch.addfinalizer(lambda: pool.shutdown(wait=False))
    return pool


def test_retrieve_timeout_uses_json_fallback(monkeypatch):
    _pool(monkeypatch, 0.05)

    def hang(query, k):
        time.sleep(2)
        return ["vector"]

    monkeypatch.setattr(rag, "_retrieve_vector", hang)
    monkeypatch.setattr(rag, "_json_keyword_fallback", lambda q, k: ["json-hit"])

    started = time.monotonic()
    assert rag.retrieve("IBPS full form") == ["json-hit"]
    assert time.monotonic() - started < 1.0


def test_retrieve_returns_vector_hits(monkeypatch):
    _pool(monkeypatch, 1)
    monkeypatch.setattr(rag, "_retrieve_vector", lambda q, k: ["vector-hit"])
    assert rag.retrieve("IBPS") == ["vector-hit"]


def test_retrieve_empty_query_skips_chroma():
    assert rag.retrieve("   ") == []
