import hashlib
import hmac
import json

import pytest

from app.core.billing import apply_webhook_event, plan_catalog, verify_webhook_signature
from app.core.csrf import csrf_should_reject
from app.models.database import User
from tests.conftest import make_db_session
from tests.test_system import _create_db_user, _error_body, _login


def test_verify_webhook_signature():
    secret = "whsec_test"
    body = b'{"event":"subscription.activated"}'
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert verify_webhook_signature(body, sig, secret) is True
    assert verify_webhook_signature(body, "deadbeef", secret) is False
    assert verify_webhook_signature(body, sig, "") is False


def test_apply_webhook_event_paid_and_cancel(monkeypatch):
    monkeypatch.setattr("app.core.billing.settings.RAZORPAY_PLAN_PLUS", "plan_plus")
    monkeypatch.setattr("app.core.billing.settings.RAZORPAY_PLAN_PRO", "plan_pro")
    assert apply_webhook_event("subscription.activated", {"plan_id": "plan_plus"}) == "plus"
    assert apply_webhook_event("subscription.charged", {"plan_id": "plan_pro"}) == "pro"
    assert apply_webhook_event("subscription.cancelled", {"plan_id": "plan_plus"}) == "free"
    assert apply_webhook_event("payment.captured", {"plan_id": "plan_plus"}) is None


def test_plan_catalog_marks_current():
    ids = [p["id"] for p in plan_catalog("plus")]
    assert ids == ["free", "plus", "pro"]
    assert plan_catalog("plus")[1]["current"] is True


def test_csrf_skips_billing_webhook():
    assert (
        csrf_should_reject(
            method="POST",
            origin="",
            referer="",
            allowed_origins=["https://app.example"],
            environment="production",
            path="/billing/webhook",
        )
        is False
    )


class TestBillingRoutes:
    EMAIL = "billing@test.com"

    @pytest.fixture(autouse=True)
    def logged_in(self, client):
        _create_db_user(self.EMAIL, is_verified=True)
        assert _login(client, self.EMAIL).status_code == 200

    def test_plans_and_unconfigured_checkout(self, client):
        r = client.get("/billing/plans")
        assert r.status_code == 200
        body = r.json()
        assert body["configured"] is False
        assert [p["id"] for p in body["plans"]] == ["free", "plus", "pro"]
        r = client.post("/billing/checkout", json={"plan": "plus"})
        assert r.status_code == 503
        assert _error_body(r)["code"] == "BILLING_UNCONFIGURED"

    def test_me_includes_daily_limit(self, client):
        r = client.get("/me")
        assert r.status_code == 200
        assert r.json()["plan"] == "free"
        assert r.json()["daily_limit"] == 20
        assert r.json()["daily_used"] == 0
        assert r.json()["daily_remaining"] == 20

    def test_webhook_sets_plan_from_signed_body(self, client, monkeypatch):
        monkeypatch.setattr("app.core.billing.settings.RAZORPAY_PLAN_PLUS", "plan_plus")
        monkeypatch.setattr("app.core.config.settings.RAZORPAY_WEBHOOK_SECRET", "whsec_test")
        monkeypatch.setattr("app.routers.billing.settings.RAZORPAY_WEBHOOK_SECRET", "whsec_test")

        db = make_db_session()
        user = db.query(User).filter(User.email == self.EMAIL).first()
        user.razorpay_subscription_id = "sub_test_1"
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()

        payload = {
            "event": "subscription.activated",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_test_1",
                        "plan_id": "plan_plus",
                        "notes": {"user_id": str(user_id)},
                    }
                }
            },
        }
        raw = json.dumps(payload).encode()
        sig = hmac.new(b"whsec_test", raw, hashlib.sha256).hexdigest()
        r = client.post("/billing/webhook", content=raw, headers={"X-Razorpay-Signature": sig})
        assert r.status_code == 200
        db = make_db_session()
        updated = db.query(User).filter(User.id == user_id).first()
        assert updated.plan == "plus"
        db.close()

    def test_webhook_rejects_bad_signature(self, client, monkeypatch):
        monkeypatch.setattr("app.core.config.settings.RAZORPAY_WEBHOOK_SECRET", "whsec_test")
        monkeypatch.setattr("app.routers.billing.settings.RAZORPAY_WEBHOOK_SECRET", "whsec_test")
        r = client.post(
            "/billing/webhook",
            content=b'{"event":"subscription.activated"}',
            headers={"X-Razorpay-Signature": "nope"},
        )
        assert r.status_code == 400
        assert _error_body(r)["code"] == "INVALID_SIGNATURE"
