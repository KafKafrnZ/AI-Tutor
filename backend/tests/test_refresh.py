import pytest
import inspect
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.database import User, AuthToken
from app.core.auth import hash_password, create_refresh_token, lookup_refresh
from datetime import datetime, timezone, timedelta

class TestRefreshToken:
    @pytest.fixture
    def test_user(self, db_session: Session):
        import uuid
        unique_email = f"refresh_{uuid.uuid4()}@test.com"
        user = User(
            name="Refresh Test",
            email=unique_email,
            password_hash=hash_password("Password123!"),
            is_verified=True,
            plan="free"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    def test_refresh_success(self, client: TestClient, test_user: User):
        r = client.post("/login", json={"email": test_user.email, "password": "Password123!"})
        assert r.status_code == 200
        cookies = dict(client.cookies)
        assert "refresh_token" in cookies
        
        # Test client cookies are limited to their path, but TestClient might not handle path=/auth automatically.
        # We can just manually pass the cookie to /auth/refresh
        raw_refresh = cookies["refresh_token"]
        
        # Now refresh
        client.cookies.clear() # simulate clean slate, though client.cookies handles it
        r2 = client.post("/auth/refresh", cookies={"refresh_token": raw_refresh})
        assert r2.status_code == 200
        new_cookies = dict(client.cookies)
        assert "access_token" in new_cookies
        assert "refresh_token" in new_cookies
        assert new_cookies["refresh_token"] != raw_refresh

    def test_refresh_garbage_cookie(self, client: TestClient):
        r = client.post("/auth/refresh", cookies={"refresh_token": "garbage_token_value_here"})
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "TOKEN_INVALID"

    def test_refresh_old_cookie_fails(self, client: TestClient, test_user: User):
        r = client.post("/login", json={"email": test_user.email, "password": "Password123!"})
        raw_refresh = client.cookies.get("refresh_token")
        
        # Refresh once
        r2 = client.post("/auth/refresh", cookies={"refresh_token": raw_refresh})
        assert r2.status_code == 200
        
        # Try refreshing again with the old cookie
        r3 = client.post("/auth/refresh", cookies={"refresh_token": raw_refresh})
        assert r3.status_code == 401
        assert r3.json()["error"]["code"] == "TOKEN_INVALID"

    def test_lookup_refresh_unit_test(self, db_session: Session, test_user: User):
        # Insert two refresh rows
        r1, h1 = create_refresh_token()
        r2, h2 = create_refresh_token()
        exp = datetime.now(timezone.utc) + timedelta(days=1)
        
        t1 = AuthToken(user_id=test_user.id, token="t1", token_type="refresh", refresh_token=h1, refresh_expires_at=exp)
        t2 = AuthToken(user_id=test_user.id, token="t2", token_type="refresh", refresh_token=h2, refresh_expires_at=exp)
        db_session.add_all([t1, t2])
        db_session.commit()
        
        # Call lookup_refresh
        found = lookup_refresh(db_session, r1)
        assert found is not None
        assert found.token == "t1"
        
        # Inspect source code
        source = inspect.getsource(lookup_refresh)
        assert ".all()" not in source
        assert "refresh_token ==" in source or "== hashed" in source

    def test_refresh_after_logout(self, client: TestClient, test_user: User):
        r = client.post("/login", json={"email": test_user.email, "password": "Password123!"})
        raw_refresh = client.cookies.get("refresh_token")
        
        # Logout
        # We need an access_token to logout
        r_logout = client.post("/logout")
        assert r_logout.status_code == 200
        
        # Now try to refresh
        r2 = client.post("/auth/refresh", cookies={"refresh_token": raw_refresh})
        assert r2.status_code == 401
        assert r2.json()["error"]["code"] == "TOKEN_INVALID"
