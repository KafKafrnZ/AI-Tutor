from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.billing import (
    apply_webhook_event,
    billing_configured,
    cancel_subscription,
    create_subscription,
    ensure_customer,
    plan_catalog,
    verify_webhook_signature,
)
from app.core.config import settings
from app.core.dependencies import get_current_user, limiter
from app.core.error_handler import api_error
from app.core.quota import quota_snapshot
from app.models.database import User, get_db
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["billing"])


class CheckoutRequest(BaseModel):
    plan: str = Field(..., max_length=16)


@router.get("/billing/plans")
def list_plans(current_user: Any = Depends(get_current_user)):
    return {
        "plans": plan_catalog(current_user.plan),
        "subscription_id": current_user.razorpay_subscription_id,
        "configured": billing_configured(),
        **quota_snapshot(current_user.id, current_user.plan),
    }


@router.post("/billing/checkout")
@limiter.limit("5/minute")
def start_checkout(
    request: Request,
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    plan = body.plan.strip().lower()
    if plan not in {"plus", "pro"}:
        raise api_error(400, "BAD_REQUEST", "Choose plus or pro.")
    if not billing_configured():
        raise api_error(503, "BILLING_UNCONFIGURED", "Billing is not connected yet.")
    if (current_user.plan or "free").lower() == plan and current_user.razorpay_subscription_id:
        raise api_error(409, "ALREADY_SUBSCRIBED", "You already have this plan.")

    try:
        customer_id = ensure_customer(
            customer_id=current_user.razorpay_customer_id,
            name=current_user.name,
            email=current_user.email,
        )
        subscription = create_subscription(plan=plan, customer_id=customer_id, user_id=current_user.id)
    except httpx.HTTPError as exc:
        logger.warning("razorpay_checkout_failed", error=str(exc))
        raise api_error(502, "BILLING_UPSTREAM", "Could not start checkout. Try again shortly.") from exc

    checkout_url = subscription.get("short_url")
    if not checkout_url:
        raise api_error(502, "BILLING_UPSTREAM", "Razorpay did not return a checkout URL.")

    current_user.razorpay_customer_id = customer_id
    current_user.razorpay_subscription_id = subscription["id"]
    db.add(current_user)
    db.commit()
    return {"checkout_url": checkout_url, "subscription_id": subscription["id"]}


@router.post("/billing/cancel")
@limiter.limit("5/minute")
def cancel_plan(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    sub_id = current_user.razorpay_subscription_id
    if sub_id and billing_configured():
        try:
            cancel_subscription(sub_id)
        except httpx.HTTPError as exc:
            logger.warning("razorpay_cancel_failed", error=str(exc))
            raise api_error(502, "BILLING_UPSTREAM", "Could not cancel at Razorpay. Try again shortly.") from exc

    current_user.plan = "free"
    current_user.razorpay_subscription_id = None
    db.add(current_user)
    db.commit()
    return {"plan": "free"}


@router.post("/billing/webhook")
@limiter.limit("60/minute")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise api_error(503, "BILLING_UNCONFIGURED", "Webhook secret is not set.")

    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not verify_webhook_signature(raw, signature, settings.RAZORPAY_WEBHOOK_SECRET):
        raise api_error(400, "INVALID_SIGNATURE", "Webhook signature is invalid.")

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise api_error(400, "BAD_REQUEST", "Webhook body is not JSON.") from exc

    event = str(payload.get("event") or "")
    subscription = ((payload.get("payload") or {}).get("subscription") or {}).get("entity") or {}
    next_plan = apply_webhook_event(event, subscription)
    if next_plan is None:
        return {"ok": True, "ignored": True}

    sub_id = subscription.get("id")
    notes = subscription.get("notes") or {}
    user = None
    if sub_id:
        user = db.query(User).filter(User.razorpay_subscription_id == sub_id).first()
    if user is None and notes.get("user_id"):
        try:
            user = db.query(User).filter(User.id == int(notes["user_id"])).first()
        except (TypeError, ValueError):
            user = None
    if user is None:
        logger.warning("billing_webhook_user_missing", event=event, subscription_id=sub_id)
        return {"ok": True, "ignored": True}

    user.plan = next_plan
    if next_plan == "free":
        user.razorpay_subscription_id = None
    elif sub_id:
        user.razorpay_subscription_id = sub_id
    db.add(user)
    db.commit()
    logger.info("billing_plan_updated", user_id=user.id, plan=next_plan, event=event)
    return {"ok": True, "plan": next_plan}
