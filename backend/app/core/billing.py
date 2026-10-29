"""Razorpay subscriptions. Plan changes only from signed webhooks."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

import httpx

from app.core.config import settings
from app.core.quota import DAILY_LIMITS, limit_for

RAZORPAY_API = "https://api.razorpay.com/v1"
PAID_EVENTS = {
    "subscription.authenticated",
    "subscription.activated",
    "subscription.charged",
}
FREE_EVENTS = {
    "subscription.cancelled",
    "subscription.completed",
    "subscription.halted",
}


def billing_configured() -> bool:
    return bool(
        settings.RAZORPAY_KEY_ID
        and settings.RAZORPAY_KEY_SECRET
        and settings.RAZORPAY_WEBHOOK_SECRET
        and settings.RAZORPAY_PLAN_PLUS
        and settings.RAZORPAY_PLAN_PRO
    )


def verify_webhook_signature(body: bytes, signature: str, secret: str) -> bool:
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def plan_from_razorpay_plan_id(plan_id: str | None) -> str | None:
    if not plan_id:
        return None
    if plan_id == settings.RAZORPAY_PLAN_PLUS:
        return "plus"
    if plan_id == settings.RAZORPAY_PLAN_PRO:
        return "pro"
    return None


def razorpay_plan_id_for(plan: str) -> str:
    if plan == "plus":
        return settings.RAZORPAY_PLAN_PLUS
    if plan == "pro":
        return settings.RAZORPAY_PLAN_PRO
    return ""


def apply_webhook_event(event: str, subscription: dict[str, Any]) -> str | None:
    """Return the plan to write, or None to ignore the event."""
    if event in FREE_EVENTS:
        return "free"
    if event in PAID_EVENTS:
        return plan_from_razorpay_plan_id(subscription.get("plan_id"))
    return None


def plan_catalog(current_plan: str | None) -> list[dict[str, Any]]:
    current = (current_plan or "free").strip().lower()
    return [
        {
            "id": "free",
            "name": "Free",
            "price_inr": 0,
            "daily_limit": limit_for("free"),
            "current": current == "free",
        },
        {
            "id": "plus",
            "name": "Plus",
            "price_inr": settings.RAZORPAY_PLUS_PRICE_INR,
            "daily_limit": DAILY_LIMITS.get("plus", 100),
            "current": current == "plus",
        },
        {
            "id": "pro",
            "name": "Pro",
            "price_inr": settings.RAZORPAY_PRO_PRICE_INR,
            "daily_limit": DAILY_LIMITS.get("pro", 500),
            "current": current == "pro",
        },
    ]


def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    response = httpx.request(
        method,
        f"{RAZORPAY_API}{path}",
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
        json=payload,
        timeout=15.0,
    )
    response.raise_for_status()
    return response.json()


def ensure_customer(*, customer_id: str | None, name: str, email: str) -> str:
    if customer_id:
        return customer_id
    created = _request("POST", "/customers", {"name": name, "email": email})
    return str(created["id"])


def create_subscription(*, plan: str, customer_id: str, user_id: int) -> dict[str, Any]:
    plan_id = razorpay_plan_id_for(plan)
    return _request(
        "POST",
        "/subscriptions",
        {
            "plan_id": plan_id,
            "customer_id": customer_id,
            "total_count": 12,
            "quantity": 1,
            "customer_notify": 1,
            "notes": {"user_id": str(user_id), "plan": plan},
        },
    )


def cancel_subscription(subscription_id: str) -> None:
    _request("POST", f"/subscriptions/{subscription_id}/cancel", {"cancel_at_cycle_end": 0})
