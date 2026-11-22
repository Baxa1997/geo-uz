"""Limits against abuse, for the day the site opens to everyone (22 Nov 2026, the user's numbers). Every free first
check costs about $0.6, accounts are free, and the login codes go out from one Gmail account with a daily sending
limit, so each is counted per connection and in all:

- a login code sent: 5 an hour and 20 a day from one connection, 300 a day in all;
- a free check asked (the owner confirmed the draft): 2 a day from one connection, `FREE_CHECKS_A_DAY` (20) in all;
  past the day's limit for everyone a check joins the queue instead (`app/queue.py`), 2 a day from one connection;
- a website read for a first check (a cent or so, the competitors' search): 6 a day from one connection;
- a request form (a demo, the First Audit): 3 a day from one connection.

The team's accounts (`TEAM_EMAILS`) and a replayed check are not counted. When a limit for everyone is reached the
team is emailed once that day. The connection is Vercel's `x-vercel-forwarded-for` when it passes it on, else the first
address of `X-Forwarded-For` (kept by nginx), else nginx's `X-Real-IP`. Vercel's documentation doesn't say which it
sends to an outside server, so the login-code route logs them (`describe`) until one real login through the site has
shown it. A caller who reaches the API directly can write those headers, so the limits for everyone are the ones that
hold whatever they say.
"""

from __future__ import annotations

import datetime
import smtplib
from email.message import EmailMessage
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session as Db

from . import mail
from .config import settings
from .db import LimitHit, now

HOUR = datetime.timedelta(hours=1)
DAY = datetime.timedelta(days=1)

# kind → ((per connection, window), ...) and the day's limit for everyone (None: none)
LIMITS: Dict[str, Tuple[Tuple[Tuple[int, datetime.timedelta], ...], Optional[int]]] = {
    "code": (((5, HOUR), (20, DAY)), 300),
    "check": (((2, DAY),), None),
    "queue": (((2, DAY),), None),
    "read": (((6, DAY),), None),
    "form": (((3, DAY),), None),
}
# Alerts already sent are hits of their own kind
ALERT = "alert:"


def client_ip(request: Any) -> str:
    """The visitor's address: Vercel's own header, else the first of `X-Forwarded-For`, else `X-Real-IP`, else the
    connection's own."""
    headers = getattr(request, "headers", {}) or {}
    for name in ("x-vercel-forwarded-for", "x-forwarded-for"):
        first = (headers.get(name) or "").split(",")[0].strip()
        if first:
            return first[:64]
    client = getattr(request, "client", None)
    return ((headers.get("x-real-ip") or "").strip() or (getattr(client, "host", "") or "") or "unknown")[:64]


def describe(request: Any) -> str:
    """The address headers a request came with, for the log: which one carries the visitor is checked on the live site."""
    headers = getattr(request, "headers", {}) or {}
    return " ".join(f"{name}={headers.get(name)!r}" for name in ("x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"))


def _everyone_limit(kind: str) -> Optional[int]:
    return settings.free_checks_a_day if kind == "check" else LIMITS[kind][1]


def _count(db: Db, kind: str, since: datetime.datetime, key: Optional[str] = None) -> int:
    query = select(func.count()).select_from(LimitHit).where(LimitHit.kind == kind, LimitHit.created_at > since)
    if key is not None:
        query = query.where(LimitHit.key == key)
    return db.scalar(query) or 0


def over(db: Db, kind: str, ip: str) -> Optional[str]:
    """Whether one more `kind` from `ip` is past a limit: "connection", "everyone", or None."""
    moment = now()
    for most, window in LIMITS[kind][0]:
        if _count(db, kind, moment - window, ip) >= most:
            return "connection"
    everyone = _everyone_limit(kind)
    if everyone is not None and _count(db, kind, moment - DAY) >= everyone:
        _alert_once(db, kind, everyone)
        return "everyone"
    return None


def checks_full(db: Db) -> bool:
    """Whether the day's free checks for everyone are taken: a check confirmed now joins the queue, and a website read
    now skips the competitors' search on ChatGPT, since its check won't be asked today."""
    return _count(db, "check", now() - DAY) >= settings.free_checks_a_day


def record(db: Db, kind: str, ip: str) -> None:
    """Counts one `kind` from `ip`, and lets go of what is older than two days. The caller commits."""
    db.add(LimitHit(kind=kind, key=ip))
    db.execute(delete(LimitHit).where(LimitHit.created_at < now() - 2 * DAY))


def _alert_once(db: Db, kind: str, limit: int) -> None:
    """Emails the team the first time in a day a limit for everyone is reached."""
    if _count(db, ALERT + kind, now() - DAY):
        return
    db.add(LimitHit(kind=ALERT + kind, key="*"))
    db.commit()
    what = {"code": "login codes sent", "check": "free first checks"}.get(kind, kind)
    print(f"limits: {limit} {what} in a day reached")
    if not settings.own_email:
        return
    message = EmailMessage()
    message["Subject"] = f"{mail.BRAND}: the day's limit of {what} reached"
    message.set_content(f"{limit} {what} in the last 24 hours: new ones are refused until the count falls below it.\nThe limit: app/limits.py (free checks: FREE_CHECKS_A_DAY).")
    try:
        mail.send(settings.smtp_from or settings.smtp_user or "", message)
    except (OSError, smtplib.SMTPException) as error:
        print(f"limits: the alert email failed: {error!r}")


def exempt(email: Optional[str]) -> bool:
    """The team's own accounts and a replayed check aren't counted."""
    return settings.first_run_replay or (email or "").lower() in settings.team_emails
