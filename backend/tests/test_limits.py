"""Limits against abuse (`app/limits.py`, 22 Nov 2026): login codes, free checks, websites read and request forms,
per connection and in all. Nothing is sent: the tests' settings have no email account, so a code goes to the log."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any, Iterator

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, func, select

from app import limits, main
from app.db import DemoRequest, LimitHit, LoginCode


def visitor(ip: str, forwarded: bool = True) -> Any:
    """A request as it reaches the backend: through Vercel and nginx, the visitor first in X-Forwarded-For."""
    headers = {"x-forwarded-for": f"{ip}, 76.76.21.21", "x-real-ip": "76.76.21.21"} if forwarded else {"x-real-ip": ip}
    return SimpleNamespace(headers=headers, client=SimpleNamespace(host="127.0.0.1"))


@pytest.fixture()
def clean(db: Any) -> Iterator[None]:
    yield
    db.execute(delete(LimitHit))
    db.execute(delete(LoginCode).where(LoginCode.email.like("%@limits.example")))
    db.execute(delete(DemoRequest).where(DemoRequest.name.like("Limits test%")))
    db.commit()


def test_the_visitor_is_the_first_forwarded_address() -> None:
    assert limits.client_ip(visitor("203.0.113.7")) == "203.0.113.7"
    assert limits.client_ip(visitor("203.0.113.8", forwarded=False)) == "203.0.113.8"
    assert limits.client_ip(SimpleNamespace(headers={}, client=SimpleNamespace(host="198.51.100.1"))) == "198.51.100.1"
    # Vercel's own header first, when it passes it on
    assert limits.client_ip(SimpleNamespace(headers={"x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "76.76.21.21"}, client=None)) == "203.0.113.9"


def test_login_codes_are_limited_per_connection_and_in_all(db: Any, clean: None) -> None:
    for number in range(5):
        assert main.send_code(main.CodeRequest(email=f"user{number}@limits.example"), visitor("203.0.113.10")) == {"resendIn": main.RESEND_SECONDS}
    with pytest.raises(HTTPException) as refused:
        main.send_code(main.CodeRequest(email="user5@limits.example"), visitor("203.0.113.10"))
    assert refused.value.status_code == 429 and refused.value.detail == "too_many_codes"
    # Another connection may go on
    main.send_code(main.CodeRequest(email="user6@limits.example"), visitor("203.0.113.11"))
    # 300 in a day from everyone: the next is refused whoever asks, and the team is told once
    db.add_all([LimitHit(kind="code", key=f"198.51.100.{index % 250}") for index in range(300)])
    db.commit()
    for attempt in range(2):
        with pytest.raises(HTTPException):
            main.send_code(main.CodeRequest(email=f"late{attempt}@limits.example"), visitor(f"192.0.2.{attempt}"))
    assert db.scalar(select(func.count()).select_from(LimitHit).where(LimitHit.kind == "alert:code")) == 1


def test_free_checks_and_readings_are_limited(db: Any, clean: None) -> None:
    for _ in range(2):
        assert limits.over(db, "check", "203.0.113.20") is None
        limits.record(db, "check", "203.0.113.20")
    db.commit()
    assert limits.over(db, "check", "203.0.113.20") == "connection"
    assert limits.over(db, "check", "203.0.113.21") is None
    # FREE_CHECKS_A_DAY (20) from everyone
    db.add_all([LimitHit(kind="check", key=f"198.51.100.{index}") for index in range(limits.settings.free_checks_a_day)])
    db.commit()
    assert limits.over(db, "check", "203.0.113.22") == "everyone"
    # Websites read: 6 a day from one connection, none for everyone
    for _ in range(6):
        limits.record(db, "read", "203.0.113.23")
    db.commit()
    assert limits.over(db, "read", "203.0.113.23") == "connection" and limits.over(db, "read", "203.0.113.24") is None
    assert limits.exempt(None) is False


def test_request_forms_are_dropped_past_three_a_day_or_a_repeated_phone(db: Any, clean: None) -> None:
    def ask(number: int, ip: str, phone: str = "") -> None:
        main.demo_request(main.DemoBody(name=f"Limits test {number}", phone=phone or f"+99890000000{number}", sector="other"), visitor(ip))

    for number in range(5):
        ask(number, "203.0.113.30")
    ask(6, "203.0.113.31", phone="+998900000000")
    kept = list(db.scalars(select(DemoRequest).where(DemoRequest.name.like("Limits test%"))))
    # Three from the first connection; the other connection's repeated the first phone the same day
    assert sorted(request.name for request in kept) == ["Limits test 0", "Limits test 1", "Limits test 2"]
