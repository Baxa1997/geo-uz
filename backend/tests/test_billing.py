"""Paying with Stripe (`app/billing.py`): the trial's statuses, Stripe's checkout and billing page, and the webhook's
events signed as Stripe signs them. Nothing reaches Stripe: its calls are stand-ins that record what they were asked."""

from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Iterator, List

import pytest
import stripe
from sqlalchemy import delete

from app import billing
from app.config import Settings
from app.db import Project, User, now

SECRET = "whsec_test_seenova"


@pytest.fixture()
def keys(monkeypatch: Any) -> None:
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_seenova")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", SECRET)
    monkeypatch.setattr(billing, "settings", Settings())


@pytest.fixture()
def fresh(db: Any) -> Iterator[Project]:
    owner = User(email="billing@example.test")
    db.add(owner)
    db.flush()
    project = Project(user_id=owner.id, category="tests", city="", country="UZ")
    db.add(project)
    db.commit()
    yield project
    db.execute(delete(Project).where(Project.id == project.id))
    db.execute(delete(User).where(User.id == owner.id))
    db.commit()


def subscription(project_id: str, status: str, key: str = "seenova_business_year", cancel_at: Any = None) -> Dict[str, Any]:
    end = int(time.time()) + 365 * 86400
    return {
        "id": "sub_test_1",
        "object": "subscription",
        "status": status,
        "customer": "cus_test_1",
        "metadata": {"project_id": project_id},
        "cancel_at": cancel_at,
        "items": {"object": "list", "data": [{"id": "si_1", "current_period_end": end, "price": {"id": "price_1", "lookup_key": key}}]},
    }


def signed(event: Dict[str, Any]) -> Any:
    payload = json.dumps(event).encode("utf-8")
    stamp = int(time.time())
    mac = hmac.new(SECRET.encode(), f"{stamp}.".encode() + payload, hashlib.sha256).hexdigest()
    return payload, f"t={stamp},v1={mac}"


def test_the_trial_lasts_seven_days_then_tracking_needs_a_plan(db: Any, fresh: Project) -> None:
    assert billing.status(fresh) == "trial"
    fresh.created_at = now() - datetime.timedelta(days=8)
    assert billing.status(fresh) == "trial_ended"
    fresh.billing_status = "past_due"
    assert billing.status(fresh) == "unpaid"
    fresh.paid = True
    assert billing.status(fresh) == "active"
    shown = billing.billing_json(fresh)
    assert shown["status"] == "active" and shown["trialEndsAt"].endswith("Z") and shown["online"] is False


def test_checkout_sells_standard_and_pro_through_stripe(db: Any, fresh: Project, keys: None, monkeypatch: Any) -> None:
    asked: List[Dict[str, Any]] = []
    monkeypatch.setattr(stripe.Price, "list", lambda **kwargs: {"data": [{"id": f"price_{kwargs['lookup_keys'][0]}"}]})
    monkeypatch.setattr(stripe.Customer, "create", lambda **kwargs: {"id": "cus_test_1"})
    monkeypatch.setattr(stripe.checkout.Session, "create", lambda **kwargs: asked.append(kwargs) or {"url": "https://checkout.stripe.test/s"})
    owner = db.get(User, fresh.user_id)
    assert billing.checkout(db, fresh, owner, "business", "year", "ru") == "https://checkout.stripe.test/s"
    made = asked[0]
    assert made["mode"] == "subscription" and made["line_items"] == [{"price": "price_seenova_business_year", "quantity": 1}]
    assert made["client_reference_id"] == fresh.id and made["subscription_data"]["metadata"]["project_id"] == fresh.id
    assert made["success_url"].endswith(f"/ru/projects/{fresh.id}/settings/plan?checkout=done") and fresh.stripe_customer_id == "cus_test_1"
    with pytest.raises(billing.BillingError):
        billing.checkout(db, fresh, owner, "agency", "month", "ru")
    # A project that pays already changes plan on Stripe's billing page
    fresh.stripe_subscription_id, fresh.billing_status = "sub_test_1", "active"
    monkeypatch.setattr(stripe.billing_portal.Configuration, "list", lambda **kwargs: {"data": [{"id": "bpc_1", "metadata": {"seenova": "1"}}]})
    monkeypatch.setattr(stripe.billing_portal.Session, "create", lambda **kwargs: {"url": f"https://billing.stripe.test/{kwargs['configuration']}"})
    assert billing.checkout(db, fresh, owner, "start", "month", "ru") == "https://billing.stripe.test/bpc_1"


def test_the_webhook_keeps_the_plan_and_pauses_on_a_failed_payment(db: Any, fresh: Project, keys: None, monkeypatch: Any) -> None:
    # Stripe's events can come out of order: the subscription is read again as it is now
    monkeypatch.setattr(stripe.Subscription, "retrieve", lambda found: subscription(fresh.id, "active"))
    payload, signature = signed({"id": "evt_1", "object": "event", "type": "customer.subscription.updated", "data": {"object": subscription(fresh.id, "incomplete")}})
    assert "paid=True" in billing.handle(payload, signature)
    db.expire_all()
    project = db.get(Project, fresh.id)
    assert (project.plan, project.billing_cycle, project.paid, project.billing_status) == ("business", "year", True, "active") and project.paid_until > now()
    # A renewal that fails: the invoice's subscription read from Stripe, past due, the checks paused
    monkeypatch.setattr(stripe.Subscription, "retrieve", lambda found: subscription(fresh.id, "past_due"))
    invoice = {"id": "in_1", "object": "invoice", "parent": {"subscription_details": {"subscription": "sub_test_1"}}}
    payload, signature = signed({"id": "evt_2", "object": "event", "type": "invoice.payment_failed", "data": {"object": invoice}})
    billing.handle(payload, signature)
    db.expire_all()
    assert billing.status(db.get(Project, fresh.id)) == "unpaid" and db.get(Project, fresh.id).paid is False
    # Cancelled: the subscription ends
    monkeypatch.setattr(stripe.Subscription, "retrieve", lambda found: subscription(fresh.id, "canceled"))
    payload, signature = signed({"id": "evt_3", "object": "event", "type": "customer.subscription.deleted", "data": {"object": subscription(fresh.id, "canceled")}})
    billing.handle(payload, signature)
    db.expire_all()
    assert billing.status(db.get(Project, fresh.id)) == "canceled"
    # A forged event is refused
    with pytest.raises(billing.BillingError) as refused:
        billing.handle(payload, "t=1,v1=00")
    assert refused.value.status == 400


def test_the_timer_reads_the_subscription_again_before_a_check(db: Any, fresh: Project, keys: None, monkeypatch: Any) -> None:
    fresh.stripe_subscription_id, fresh.paid, fresh.billing_status = "sub_test_1", True, "active"
    monkeypatch.setattr(stripe.Subscription, "retrieve", lambda found: subscription(fresh.id, "unpaid", key="seenova_start_month"))
    billing.refresh(db, fresh)
    assert fresh.paid is False and fresh.plan == "start" and fresh.billing_cycle == "month"
