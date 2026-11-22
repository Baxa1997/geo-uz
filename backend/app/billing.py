"""Paying for a plan with Stripe (22 Nov 2026; the user has a Stripe account and chose it). Standard and Pro are paid
through Stripe's own checkout page, monthly or yearly (a year costs 10 months, the decision of 10 Oct 2026); the
customer changes plan, card or cancels on Stripe's own billing page; Stripe tells us by its webhook, which keeps each
project's plan, status and "paid until" date. Enterprise and Managed GEO stay at a custom price ("Custom"), switched on by hand
(`python -m app.admin plan`).

The trial (the user's choice): a project's first check is free and its report stays; for 7 days the dashboard says
how long is left, then that the trial has ended; weekly checks only for a paid-up project. A failed payment pauses the
checks until it goes through (the user's choice: "Stop until paid").

Set up once, in Stripe's test mode first, on the server where the keys are:

    python -m app.billing setup --webhook-url https://<api>/stripe/webhook --env-file .env [--use start:month=price_…]

It makes the products and prices (found again by their lookup keys, so it can be run twice), Stripe's billing page
settings, and the webhook, whose signing secret it writes into the env file as STRIPE_WEBHOOK_SECRET: no secret passes
through a chat or git. STRIPE_SECRET_KEY is put into the server's env by hand (from `backend/.env.server`). `--use` takes
a price made by hand in Stripe's dashboard in the place of one it would make (the user made Standard's monthly price
there on 22 Nov 2026): checked against `PLANS` and given its lookup key, which is how the webhook knows the plan; the
missing ones are then made, a plan's other cycle on the same product.
"""

from __future__ import annotations

import argparse
import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session as Db

from .config import settings
from .db import Project, SessionLocal, User, now

# The plans Stripe sells: our plan's name, its product's name, and its price a month and a year (10 months), in
# cents. The user's prices of 22 Nov 2026 (were $39.99 and $89.99); the frontend shows `PLAN_PRICES`, kept the same
PLANS: Dict[str, Tuple[str, int, int]] = {
    "start": ("Seenova AI Standard", 3499, 34990),
    "business": ("Seenova AI Pro", 7999, 79990),
}
CYCLES = {"month": "month", "year": "year"}
TRIAL_DAYS = 7
# Stripe's statuses under which the weekly checks run: a failed payment ("past_due", "unpaid") pauses them
PAID_STATUSES = ("active", "trialing")
WEBHOOK_EVENTS = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
]
PORTAL_MARK = "seenova"


class BillingError(RuntimeError):
    def __init__(self, status: int, code: str) -> None:
        super().__init__(code)
        self.status, self.code = status, code


def ready() -> bool:
    """Whether Stripe can be used: its secret key is set."""
    return bool(settings.stripe_secret_key)


def _client() -> Any:
    if not ready():
        raise BillingError(503, "billing_unavailable")
    stripe.api_key = settings.stripe_secret_key
    return stripe


def lookup_key(plan: str, cycle: str) -> str:
    return f"seenova_{plan}_{cycle}"


def _plan_of(key: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Our plan and cycle from a price's lookup key ("seenova_business_year" → business, year)."""
    parts = (key or "").split("_")
    if len(parts) == 3 and parts[0] == "seenova" and parts[1] in PLANS and parts[2] in CYCLES:
        return parts[1], parts[2]
    return None, None


def _get(value: Any, name: str, default: Any = None) -> Any:
    """A field of a Stripe object or a plain dict alike."""
    if value is None:
        return default
    try:
        return value[name]
    except (KeyError, TypeError, AttributeError):
        return getattr(value, name, default)


# --- the trial ------------------------------------------------------------------------------------------------


def trial_ends(project: Project) -> datetime.datetime:
    return project.created_at + datetime.timedelta(days=TRIAL_DAYS)


def status(project: Project) -> str:
    """What the pages say: "active" (paid up: checked on its plan's days), "unpaid" (a payment failed: paused until it
    goes through), "trial" (the 7 days after the free check), "trial_ended", or "canceled" (a subscription ended)."""
    if project.paid:
        return "active"
    if project.billing_status in ("past_due", "unpaid", "incomplete"):
        return "unpaid"
    if project.billing_status in ("canceled", "incomplete_expired"):
        return "canceled"
    return "trial" if now() < trial_ends(project) else "trial_ended"


def billing_json(project: Project) -> Dict[str, Any]:
    """The project's billing as the pages read it (`Project.billing`)."""
    return {
        "cycle": project.billing_cycle or "month",
        "renewsAt": project.paid_until.isoformat() + "Z" if project.paid_until and project.paid else None,
        "status": status(project),
        "trialEndsAt": trial_ends(project).isoformat() + "Z",
        "cancelsAt": project.cancels_at.isoformat() + "Z" if project.cancels_at else None,
        # Stripe's checkout and billing page can be opened: the key is set, and for the billing page a customer exists
        "online": ready(),
        "portal": ready() and bool(project.stripe_customer_id),
    }


# --- checkout and the billing page ----------------------------------------------------------------------------


def _price(client: Any, plan: str, cycle: str) -> str:
    found = client.Price.list(lookup_keys=[lookup_key(plan, cycle)], active=True, limit=1)
    data = _get(found, "data") or []
    if not data:
        raise BillingError(503, "billing_not_set_up")
    return _get(data[0], "id")


def _customer(client: Any, db: Db, project: Project, user: User) -> str:
    if project.stripe_customer_id:
        return project.stripe_customer_id
    made = client.Customer.create(email=user.email, metadata={"project_id": project.id, "account": user.id})
    project.stripe_customer_id = _get(made, "id")
    db.flush()
    return project.stripe_customer_id


def _page(project_id: str, language: str, query: str = "") -> str:
    return f"{settings.frontend_origin.rstrip('/')}/{language}/projects/{project_id}/settings/plan{query}"


def checkout(db: Db, project: Project, user: User, plan: str, cycle: str, language: str) -> str:
    """The address of Stripe's checkout page for a plan; Stripe's billing page when the project pays already (a plan is
    changed there). The caller commits (a new Stripe customer is kept)."""
    if plan not in PLANS or cycle not in CYCLES:
        raise BillingError(422, "bad_plan")
    client = _client()
    if project.stripe_subscription_id and project.billing_status not in ("canceled", "incomplete_expired", None):
        return portal(db, project, language)
    session = client.checkout.Session.create(
        mode="subscription",
        customer=_customer(client, db, project, user),
        line_items=[{"price": _price(client, plan, cycle), "quantity": 1}],
        client_reference_id=project.id,
        metadata={"project_id": project.id},
        subscription_data={"metadata": {"project_id": project.id}},
        success_url=_page(project.id, language, "?checkout=done"),
        cancel_url=_page(project.id, language),
        allow_promotion_codes=True,
    )
    return _get(session, "url")


def _portal_configuration(client: Any) -> Optional[str]:
    for configuration in _get(client.billing_portal.Configuration.list(limit=20), "data") or []:
        if (_get(configuration, "metadata") or {}).get(PORTAL_MARK):
            return _get(configuration, "id")
    return None


def portal(db: Db, project: Project, language: str) -> str:
    """The address of Stripe's billing page for the project's customer: change plan, card, cancel, invoices."""
    client = _client()
    if not project.stripe_customer_id:
        raise BillingError(409, "no_customer")
    made: Dict[str, Any] = {"customer": project.stripe_customer_id, "return_url": _page(project.id, language)}
    configuration = _portal_configuration(client)
    if configuration:
        made["configuration"] = configuration
    return _get(client.billing_portal.Session.create(**made), "url")


# --- what Stripe tells us -------------------------------------------------------------------------------------


def _period_end(subscription: Any) -> Optional[datetime.datetime]:
    """When the period paid for ends: on the subscription's item since Stripe's 2025 API, on the subscription before."""
    items = _get(_get(subscription, "items"), "data") or []
    stamp = _get(items[0], "current_period_end") if items else None
    stamp = stamp or _get(subscription, "current_period_end")
    return datetime.datetime.utcfromtimestamp(stamp) if stamp else None


def apply(db: Db, project: Project, subscription: Any) -> None:
    """A Stripe subscription onto its project: the plan and cycle of its price, its status, paid or not, until when."""
    items = _get(_get(subscription, "items"), "data") or []
    price = _get(items[0], "price") if items else None
    plan, cycle = _plan_of(_get(price, "lookup_key"))
    state = _get(subscription, "status")
    project.stripe_subscription_id = _get(subscription, "id")
    customer = _get(subscription, "customer")
    project.stripe_customer_id = customer if isinstance(customer, str) else _get(customer, "id") or project.stripe_customer_id
    project.billing_status = state
    if plan:
        project.plan, project.billing_cycle = plan, cycle
    project.paid = state in PAID_STATUSES
    project.paid_until = _period_end(subscription)
    cancel_at = _get(subscription, "cancel_at")
    project.cancels_at = datetime.datetime.utcfromtimestamp(cancel_at) if cancel_at and state in PAID_STATUSES else None


def _project_for(db: Db, subscription_id: Optional[str], project_id: Optional[str], customer_id: Optional[str]) -> Optional[Project]:
    if project_id:
        found = db.get(Project, project_id)
        if found is not None:
            return found
    for column, value in ((Project.stripe_subscription_id, subscription_id), (Project.stripe_customer_id, customer_id)):
        if value:
            found = db.scalar(select(Project).where(column == value))
            if found is not None:
                return found
    return None


def _invoice_subscription(invoice: Any) -> Optional[str]:
    """An invoice's subscription: under `parent` since Stripe's 2025 API, on the invoice before."""
    details = _get(_get(invoice, "parent"), "subscription_details")
    found = _get(details, "subscription") or _get(invoice, "subscription")
    return found if isinstance(found, str) else _get(found, "id")


def handle(payload: bytes, signature: str) -> str:
    """One webhook event from Stripe, its signature checked. Returns what was done, for the log."""
    if not settings.stripe_webhook_secret:
        raise BillingError(503, "billing_unavailable")
    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except (ValueError, stripe.SignatureVerificationError) as error:
        raise BillingError(400, "bad_signature") from error
    kind, thing = _get(event, "type"), _get(_get(event, "data"), "object")
    client = _client()
    subscription: Any = None
    project_id: Optional[str] = None
    if kind == "checkout.session.completed":
        project_id = _get(thing, "client_reference_id") or (_get(thing, "metadata") or {}).get("project_id")
        if _get(thing, "subscription"):
            subscription = client.Subscription.retrieve(_get(thing, "subscription"))
    elif kind and kind.startswith("customer.subscription."):
        # Read again: Stripe's events can come out of order, and the subscription as it is now is what counts
        subscription = client.Subscription.retrieve(_get(thing, "id"))
    elif kind in ("invoice.paid", "invoice.payment_failed"):
        found = _invoice_subscription(thing)
        if found:
            subscription = client.Subscription.retrieve(found)
    if subscription is None:
        return f"{kind}: nothing to do"
    project_id = project_id or (_get(subscription, "metadata") or {}).get("project_id")
    customer = _get(subscription, "customer")
    with SessionLocal() as db:
        project = _project_for(db, _get(subscription, "id"), project_id, customer if isinstance(customer, str) else _get(customer, "id"))
        if project is None:
            return f"{kind}: no project for subscription {_get(subscription, 'id')}"
        apply(db, project, subscription)
        db.commit()
        return f"{kind}: project {project.id} {project.plan} {project.billing_status} paid={project.paid}"


def refresh(db: Db, project: Project) -> None:
    """The project's subscription read again from Stripe, before a weekly check: a missed webhook can't keep checking
    a project that stopped paying, nor stop one that paid. The caller commits."""
    if not (ready() and project.stripe_subscription_id):
        return
    try:
        apply(db, project, _client().Subscription.retrieve(project.stripe_subscription_id))
    except stripe.StripeError as error:
        print(f"billing: project {project.id}: Stripe couldn't be read, the stored status stands: {error!r}")


# --- setting Stripe up ----------------------------------------------------------------------------------------


def adopt(client: Any, plan: str, cycle: str, price_id: str) -> None:
    """A price made in Stripe's dashboard, taken as `plan` and `cycle` once it is what `PLANS` sells: our lookup key
    goes onto it (moved from any price that had it), so checkout finds it and the webhook knows its plan."""
    if plan not in PLANS or cycle not in CYCLES:
        raise SystemExit(f"billing: --use {plan}:{cycle}: the plans are {', '.join(PLANS)}, the cycles month and year")
    _, month, year = PLANS[plan]
    amount = month if cycle == "month" else year
    try:
        price = client.Price.retrieve(price_id)
    except stripe.InvalidRequestError:
        # An id read off a screen: a capital I and a small l look alike. The account's prices this plan could be
        like = [_get(each, "id") for each in _get(client.Price.list(active=True, type="recurring", limit=100), "data") or [] if _get(each, "unit_amount") == amount and _get(_get(each, "recurring") or {}, "interval") == cycle]
        raise SystemExit(f"billing: no price {price_id} in this Stripe account ({'test' if 'test' in (settings.stripe_secret_key or '') else 'live'} key); its prices of {amount} usd a {cycle}: {', '.join(like) or 'none'}")
    recurring = _get(price, "recurring") or {}
    found = (_get(price, "unit_amount"), _get(price, "currency"), _get(recurring, "interval"), _get(recurring, "interval_count") or 1, _get(price, "active"))
    if found != (amount, "usd", cycle, 1, True):
        raise SystemExit(f"billing: {price_id} is {found[0]} {found[1]} every {found[3]} {found[2]} (active {found[4]}); {plan}:{cycle} sells {amount} usd every 1 {cycle}")
    if _get(price, "lookup_key") == lookup_key(plan, cycle):
        print(f"  {lookup_key(plan, cycle)}: {price_id} has it already")
        return
    client.Price.modify(price_id, lookup_key=lookup_key(plan, cycle), transfer_lookup_key=True)
    print(f"  {lookup_key(plan, cycle)}: given to {price_id}, ${amount / 100:.2f} a {cycle}")


def setup(webhook_url: Optional[str], env_file: Optional[Path], use: Optional[Dict[Tuple[str, str], str]] = None) -> None:
    """The products and prices, the billing page's settings and the webhook, each found again when it exists.
    `use`: prices made in Stripe's dashboard, by plan and cycle, taken in the place of new ones (`adopt`)."""
    client = _client()
    mode = "live" if (settings.stripe_secret_key or "").startswith(("sk_live", "rk_live")) else "test"
    print(f"Stripe, {mode} mode")
    for (plan, cycle), price_id in (use or {}).items():
        adopt(client, plan, cycle, price_id)
    price_ids = []
    for plan, (name, month, year) in PLANS.items():
        product = None
        for cycle, amount in (("month", month), ("year", year)):
            found = _get(client.Price.list(lookup_keys=[lookup_key(plan, cycle)], active=True, limit=1), "data") or []
            if found:
                price_ids.append((plan, _get(found[0], "product"), _get(found[0], "id")))
                product = product or _get(found[0], "product")
                charged = _get(found[0], "unit_amount")
                # A price can't be changed on Stripe once made: a new one takes its lookup key in Stripe's dashboard
                note = "" if charged == amount else f", but ${(charged or 0) / 100:.2f}, not ${amount / 100:.2f}: change it in Stripe"
                print(f"  {lookup_key(plan, cycle)}: there{note}")
                continue
            if product is None:
                product = _get(client.Product.create(name=name, metadata={"plan": plan}), "id")
            made = client.Price.create(product=product, currency="usd", unit_amount=amount, recurring={"interval": cycle}, lookup_key=lookup_key(plan, cycle))
            price_ids.append((plan, product, _get(made, "id")))
            print(f"  {lookup_key(plan, cycle)}: made, ${amount / 100:.2f} a {cycle}")
    if _portal_configuration(client) is None:
        products: Dict[str, Any] = {}
        for _, product, price in price_ids:
            products.setdefault(product, []).append(price)
        client.billing_portal.Configuration.create(
            business_profile={"headline": "Seenova AI"},
            features={
                "customer_update": {"enabled": True, "allowed_updates": ["email", "name", "address", "tax_id"]},
                "invoice_history": {"enabled": True},
                "payment_method_update": {"enabled": True},
                "subscription_cancel": {"enabled": True, "mode": "at_period_end"},
                "subscription_update": {"enabled": True, "default_allowed_updates": ["price"], "proration_behavior": "create_prorations", "products": [{"product": product, "prices": prices} for product, prices in products.items()]},
            },
            metadata={PORTAL_MARK: "1"},
        )
        print("  billing page settings: made")
    else:
        print("  billing page settings: there")
    if not webhook_url:
        return
    existing = [endpoint for endpoint in _get(client.WebhookEndpoint.list(limit=100), "data") or [] if _get(endpoint, "url") == webhook_url]
    if existing:
        print(f"  webhook {webhook_url}: there (its secret is only shown when made; STRIPE_WEBHOOK_SECRET must be set already)")
        return
    endpoint = client.WebhookEndpoint.create(url=webhook_url, enabled_events=WEBHOOK_EVENTS, description="Seenova AI")
    secret = _get(endpoint, "secret")
    if env_file:
        with env_file.open("a", encoding="utf-8") as file:
            file.write(f"\n# Stripe's webhook signing secret ({mode} mode), written by app.billing setup\nSTRIPE_WEBHOOK_SECRET={secret}\n")
        print(f"  webhook {webhook_url}: made; its secret written to {env_file}")
    else:
        print(f"  webhook {webhook_url}: made; run again with --env-file to keep its secret (it can't be read again: delete the endpoint in Stripe first)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Stripe for Seenova AI")
    sub = parser.add_subparsers(dest="command", required=True)
    made = sub.add_parser("setup", help="products, prices, the billing page and the webhook")
    made.add_argument("--webhook-url", help="https://<api>/stripe/webhook")
    made.add_argument("--env-file", type=Path, help="where the webhook's secret is written (the server's .env)")
    made.add_argument("--use", action="append", default=[], metavar="PLAN:CYCLE=PRICE_ID", help="a price made in Stripe's dashboard, e.g. start:month=price_…")
    chosen = parser.parse_args()
    if chosen.command == "setup":
        use: Dict[Tuple[str, str], str] = {}
        for given in chosen.use:
            which, _, price_id = given.partition("=")
            plan, _, cycle = which.partition(":")
            if not price_id.startswith("price_"):
                raise SystemExit(f"billing: --use {given}: write it as start:month=price_…")
            use[(plan.strip(), cycle.strip())] = price_id.strip()
        setup(chosen.webhook_url, chosen.env_file, use)


if __name__ == "__main__":
    main()
