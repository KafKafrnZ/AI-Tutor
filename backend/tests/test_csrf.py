"""Unit tests for CSRF origin matching — no HTTP stack."""

from app.core.csrf import csrf_should_reject, origin_allowed, request_origin

ALLOWED = ["https://allowed.example"]


def test_request_origin_prefers_origin_over_referer():
    assert request_origin("https://a.example", "https://b.example/path") == "https://a.example"


def test_request_origin_strips_referer_path():
    assert request_origin("", "https://allowed.example/login?x=1") == "https://allowed.example"


def test_origin_allowed_exact_only():
    assert origin_allowed("https://allowed.example", ALLOWED) is True
    assert origin_allowed("https://allowed.example.evil.com", ALLOWED) is False
    assert origin_allowed("https://evil-allowed.example", ALLOWED) is False


def test_reject_missing_origin_only_in_production():
    kwargs = dict(method="POST", origin="", referer="", allowed_origins=ALLOWED)
    assert csrf_should_reject(environment="production", **kwargs) is True
    assert csrf_should_reject(environment="development", **kwargs) is False


def test_safe_methods_never_reject():
    for method in ("GET", "HEAD", "OPTIONS"):
        assert csrf_should_reject(
            method=method,
            origin="",
            referer="",
            allowed_origins=ALLOWED,
            environment="production",
        ) is False
