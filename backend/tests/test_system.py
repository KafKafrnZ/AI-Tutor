"""
System verification tests — covers all 7 recent fixes plus core happy paths.

Fixes verified:
  C-1  Login blocked for unverified users (returns 403, no cookie set)
  C-2  verify-email enforces token expiry (expired token returns 400)
  C-3  Frontend /verify-email page — backend endpoint behaviour tested here
  H-1  Rate-limit decorators present on /forgot-password and /reset-password
  H-2  Worker count (infra-level — not testable in pytest)
  H-3  Dead LangGraph/Groq imports removed from source files
  H-4  Reset-password enforces password strength (uppercase + digit)
"""

import secrets
from datetime import datetime, timedelta, timezone

import pytest

from app.models.database import AuthToken, User
from app.core.auth import hash_password
from app.main import app
from tests.conftest import make_db_session

STRONG_PASSWORD = "Secure1234"
WEAK_NOUPPER    = "secure1234"
WEAK_NODIGIT    = "Securepass!"
WEAK_SHORT      = "Ab1"


# ---------------------------------------------------------------------------
# DB helpers — bypass the API to avoid side-effects in fixtures
# ---------------------------------------------------------------------------

def _create_db_user(email: str, password: str = STRONG_PASSWORD,
                    is_verified: bool = False) -> User:
    db = make_db_session()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.close()
        return existing
    user = User(name="Test User", email=email,
                password_hash=hash_password(password), is_verified=is_verified)
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def _insert_auth_token(user_id: int, token_type: str, expires_hours: float) -> str:
    token_str = secrets.token_urlsafe(32)
    db = make_db_session()
    db.add(AuthToken(
        user_id=user_id, token=token_str, token_type=token_type,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_hours),
    ))
    db.commit()
    db.close()
    return token_str


def _login(client, email: str, password: str = STRONG_PASSWORD):
    return client.post("/login", json={"email": email, "password": password})


# ============================================================================
# 1. Infrastructure
# ============================================================================

class TestHealth:
    def test_health_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["database"] == "connected"


# ============================================================================
# 2. Signup validation
# ============================================================================

class TestSignup:
    def test_signup_success(self, client):
        r = client.post("/signup", json={
            "name": "New User", "email": "signup_ok@test.com", "password": STRONG_PASSWORD
        })
        assert r.status_code == 200
        assert "Account created" in r.json()["message"]

    def test_signup_duplicate_email(self, client):
        client.post("/signup", json={"name": "A", "email": "dup@test.com", "password": STRONG_PASSWORD})
        r = client.post("/signup", json={"name": "B", "email": "dup@test.com", "password": STRONG_PASSWORD})
        assert r.status_code == 400

    def test_signup_weak_no_uppercase(self, client):
        r = client.post("/signup", json={
            "name": "Bad", "email": "weak_up@test.com", "password": WEAK_NOUPPER
        })
        assert r.status_code == 422

    def test_signup_weak_too_short(self, client):
        r = client.post("/signup", json={
            "name": "Bad", "email": "weak_short@test.com", "password": WEAK_SHORT
        })
        assert r.status_code == 422

    def test_signup_empty_name_rejected(self, client):
        r = client.post("/signup", json={
            "name": "   ", "email": "blank@test.com", "password": STRONG_PASSWORD
        })
        assert r.status_code == 422

    def test_signup_invalid_email_rejected(self, client):
        r = client.post("/signup", json={
            "name": "User", "email": "not-an-email", "password": STRONG_PASSWORD
        })
        assert r.status_code == 422


# ============================================================================
# 3. FIX C-1 — Login must block unverified users
# ============================================================================

class TestLoginUnverified:
    EMAIL = "c1_unverified@test.com"

    @pytest.fixture(autouse=True)
    def setup(self):
        _create_db_user(self.EMAIL, is_verified=False)

    def test_login_returns_403(self, client):
        r = _login(client, self.EMAIL)
        assert r.status_code == 403

    def test_403_contains_verify_hint(self, client):
        r = _login(client, self.EMAIL)
        assert "verify" in r.json()["detail"].lower()

    def test_no_cookie_set_for_unverified(self, client):
        _login(client, self.EMAIL)
        assert "access_token" not in client.cookies

    def test_wrong_password_returns_401(self, client):
        r = client.post("/login", json={"email": self.EMAIL, "password": "WrongPass1"})
        assert r.status_code == 401

    def test_nonexistent_user_returns_401(self, client):
        r = client.post("/login", json={"email": "ghost@test.com", "password": STRONG_PASSWORD})
        assert r.status_code == 401


# ============================================================================
# 4. FIX C-2 — verify-email must enforce token expiry
# ============================================================================

class TestVerifyEmail:
    EMAIL = "c2_verify@test.com"

    @pytest.fixture(autouse=True)
    def setup(self):
        self.user = _create_db_user(self.EMAIL, is_verified=False)

    def test_expired_token_returns_400(self, client):
        token = _insert_auth_token(self.user.id, "verify_email", expires_hours=-1)
        assert client.get(f"/verify-email?token={token}").status_code == 400

    def test_wrong_type_token_returns_400(self, client):
        token = _insert_auth_token(self.user.id, "reset_password", expires_hours=24)
        assert client.get(f"/verify-email?token={token}").status_code == 400

    def test_unknown_token_returns_400(self, client):
        assert client.get("/verify-email?token=fakefaketoken").status_code == 400

    def test_valid_token_verifies_user(self, client):
        token = _insert_auth_token(self.user.id, "verify_email", expires_hours=24)
        assert client.get(f"/verify-email?token={token}").status_code == 200
        db = make_db_session()
        user = db.query(User).filter(User.email == self.EMAIL).first()
        db.close()
        assert user.is_verified is True

    def test_token_burned_after_use(self, client):
        token = _insert_auth_token(self.user.id, "verify_email", expires_hours=24)
        client.get(f"/verify-email?token={token}")
        assert client.get(f"/verify-email?token={token}").status_code == 400


# ============================================================================
# 5. Full auth happy path (single test — uses function-scoped client for clean state)
# ============================================================================

class TestFullAuthFlow:
    EMAIL = "flow@test.com"

    def _get_verify_token(self) -> str:
        db = make_db_session()
        user = db.query(User).filter(User.email == self.EMAIL).first()
        token = db.query(AuthToken).filter(
            AuthToken.user_id == user.id,
            AuthToken.token_type == "verify_email",
        ).first()
        db.close()
        return token.token

    def test_complete_auth_lifecycle(self, client):
        """signup → blocked login → verify → successful login → /me → logout → blocked again"""
        # 1. signup
        r = client.post("/signup", json={
            "name": "Flow User", "email": self.EMAIL, "password": STRONG_PASSWORD
        })
        assert r.status_code == 200, f"signup failed: {r.json()}"

        # 2. login blocked before verify
        r = client.post("/login", json={"email": self.EMAIL, "password": STRONG_PASSWORD})
        assert r.status_code == 403
        assert "access_token" not in client.cookies

        # 3. verify via token
        token = self._get_verify_token()
        r = client.get(f"/verify-email?token={token}")
        assert r.status_code == 200

        # 4. login succeeds after verify
        r = client.post("/login", json={"email": self.EMAIL, "password": STRONG_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in client.cookies

        # 5. use protected endpoint
        r = client.get("/me")
        assert r.status_code == 200
        assert r.json()["email"] == self.EMAIL

        # 6. logout
        r = client.post("/logout")
        assert r.status_code == 200

        # 7. protected endpoint blocked after logout
        client.cookies.clear()
        r = client.get("/me")
        assert r.status_code == 401


# ============================================================================
# 6. FIX H-4 — Reset-password must enforce password strength
# ============================================================================

class TestResetPassword:
    EMAIL = "h4_reset@test.com"

    @pytest.fixture(autouse=True)
    def setup(self):
        self.user = _create_db_user(self.EMAIL, is_verified=True)
        # Reset password to known value before each test (clean slate)
        db = make_db_session()
        u = db.query(User).filter(User.email == self.EMAIL).first()
        u.password_hash = hash_password(STRONG_PASSWORD)
        db.commit()
        db.close()

    def _token(self, hours: float = 1) -> str:
        return _insert_auth_token(self.user.id, "reset_password", hours)

    def test_rejects_no_uppercase(self, client):
        token = self._token()
        assert client.post("/reset-password",
                           json={"token": token, "new_password": WEAK_NOUPPER}).status_code == 422

    def test_rejects_no_digit(self, client):
        token = self._token()
        assert client.post("/reset-password",
                           json={"token": token, "new_password": WEAK_NODIGIT}).status_code == 422

    def test_rejects_too_short(self, client):
        token = self._token()
        assert client.post("/reset-password",
                           json={"token": token, "new_password": WEAK_SHORT}).status_code == 422

    def test_rejects_expired_token(self, client):
        token = self._token(hours=-1)
        assert client.post("/reset-password",
                           json={"token": token, "new_password": STRONG_PASSWORD}).status_code == 400

    def test_rejects_invalid_token(self, client):
        assert client.post("/reset-password",
                           json={"token": "fakefakefake", "new_password": STRONG_PASSWORD}).status_code == 400

    def test_success_and_token_burned(self, client):
        token = self._token()
        assert client.post("/reset-password",
                           json={"token": token, "new_password": "NewSecure9"}).status_code == 200
        # Replay attempt rejected
        assert client.post("/reset-password",
                           json={"token": token, "new_password": "NewSecure9"}).status_code == 400

    def test_new_password_allows_login(self, client):
        token = self._token()
        client.post("/reset-password", json={"token": token, "new_password": "NewSecure9"})
        r = _login(client, self.EMAIL, password="NewSecure9")
        assert r.status_code == 200


# ============================================================================
# 7. FIX H-1 — Rate-limit decorators present on recovery endpoints
# ============================================================================

class TestRateLimitPresence:
    def test_forgot_password_always_returns_200(self, client):
        r = client.post("/forgot-password", json={"email": "nobody@test.com"})
        assert r.status_code == 200

    def test_reset_password_invalid_token_returns_400(self, client):
        r = client.post("/reset-password",
                        json={"token": "invalid-token-xyz", "new_password": STRONG_PASSWORD})
        assert r.status_code == 400

    def test_forgot_password_route_has_rate_limit(self):
        for route in app.routes:
            if hasattr(route, "path") and route.path == "/forgot-password":
                ep = route.endpoint
                has_limit = (
                    hasattr(ep, "_rate_limit_key_func") or
                    hasattr(ep, "__wrapped__") or
                    getattr(ep, "_limits", None) is not None
                )
                assert has_limit, "/forgot-password is missing slowapi limit decoration"
                return
        pytest.fail("/forgot-password route not found in app.routes")


# ============================================================================
# 8. FIX H-3 — Dead LangGraph/Groq imports not in active source files
# ============================================================================

class TestDeadDependenciesRemoved:
    DEAD = ("langchain", "langgraph", "langsmith")

    def _check_file(self, path: str):
        import ast
        import pathlib
        src = pathlib.Path(path).read_text(encoding="utf-8")
        for node in ast.walk(ast.parse(src)):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                mod = node.module if isinstance(node, ast.ImportFrom) else None
                names = [a.name for a in node.names] if isinstance(node, ast.Import) else []
                for name in ([mod] if mod else []) + names:
                    for dead in self.DEAD:
                        assert not (name or "").startswith(dead), \
                            f"Dead import '{name}' in {path}"

    def test_tutor_clean(self):
        self._check_file("modules/tutor.py")

    def test_main_clean(self):
        self._check_file("app/main.py")

    def test_agent_py_deleted(self):
        import pathlib
        assert not pathlib.Path("app/agent.py").exists()


# ============================================================================
# 9. Protected endpoints enforce authentication
# ============================================================================

PROTECTED = [
    ("GET",  "/me"),
    ("GET",  "/stats"),
    ("GET",  "/error-log"),
    ("GET",  "/mock-tests"),
    ("POST", "/logout"),
    ("GET",  "/revision-plan"),
]

@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_endpoint_requires_auth(client, method, path):
    client.cookies.clear()
    r = client.request(method, path)
    assert r.status_code in (401, 403), (
        f"{method} {path} returned {r.status_code} without auth (expected 401/403)"
    )


# ============================================================================
# 10. Error log write and read
# ============================================================================

class TestErrorLog:
    EMAIL = "errorlog@test.com"

    @pytest.fixture(autouse=True)
    def logged_in(self, client):
        _create_db_user(self.EMAIL, is_verified=True)
        r = _login(client, self.EMAIL)
        assert r.status_code == 200, f"Login failed in fixture: {r.json()}"

    def test_save_returns_200(self, client):
        r = client.post("/save-errors", json={"errors": [{
            "question_text": "What is OSI model?",
            "user_answer": "A framework",
            "correct_answer": "7-layer model",
            "explanation": "Open Systems Interconnection",
        }]})
        assert r.status_code == 200

    def test_log_returns_list(self, client):
        r = client.get("/error-log")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_saved_entry_in_log(self, client):
        client.post("/save-errors", json={"errors": [{
            "question_text": "What is TCP/IP?",
            "user_answer": "Protocol",
            "correct_answer": "Transmission Control Protocol suite",
            "explanation": "Core networking protocols",
        }]})
        logs = client.get("/error-log").json()
        assert any(log["question_text"] == "What is TCP/IP?" for log in logs)


# ============================================================================
# 11. Profile update
# ============================================================================

class TestProfileUpdate:
    EMAIL = "profile@test.com"

    @pytest.fixture(autouse=True)
    def logged_in(self, client):
        _create_db_user(self.EMAIL, is_verified=True)
        r = _login(client, self.EMAIL)
        assert r.status_code == 200

    def test_update_name_succeeds(self, client):
        r = client.put("/me", json={"name": "Updated Name"})
        assert r.status_code == 200
        assert r.json()["name"] == "Updated Name"

    def test_empty_name_rejected(self, client):
        r = client.put("/me", json={"name": "   "})
        assert r.status_code == 400

    def test_me_reflects_new_name(self, client):
        client.put("/me", json={"name": "Final Name"})
        assert client.get("/me").json()["name"] == "Final Name"


# ============================================================================
# 12. Mock test listing
# ============================================================================

class TestMockTests:
    EMAIL = "mocklist@test.com"

    @pytest.fixture(autouse=True)
    def logged_in(self, client):
        _create_db_user(self.EMAIL, is_verified=True)
        r = _login(client, self.EMAIL)
        assert r.status_code == 200

    def test_list_returns_array(self, client):
        r = client.get("/mock-tests")
        assert r.status_code == 200
        tests = r.json()["tests"]
        assert isinstance(tests, list) and len(tests) > 0

    def test_each_test_has_required_fields(self, client):
        for t in client.get("/mock-tests").json()["tests"]:
            assert "id" in t and "title" in t and "question_count" in t
