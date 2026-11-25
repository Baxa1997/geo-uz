"""The team's admin page (`app/superadmin.py`, 25 Nov 2026): one login whose password is kept as a hash, wrong logins that
shut it, read-only lists counted from the database, and Approve, which starts a waiting check exactly once. Nothing is
asked or sent: the assistants are stand-ins and the emails are kept in a list."""

from __future__ import annotations

import dataclasses
import time
from email.message import EmailMessage
from typing import Any, Iterator, List, Tuple

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, func, select
from starlette.responses import Response

from app import admin, queue, superadmin, wave
from app.config import settings
from app.db import FirstRun, LimitHit, Project, User
from test_limits import visitor
from test_queue import accounts, asking, queued  # noqa: F401 (fixtures)
from test_wave import stand_ins  # noqa: F401 (the fixture `asking` needs)

PASSWORD = "a-long-test-password"


@pytest.fixture()
def admin_on(monkeypatch: Any, db: Any) -> Iterator[List[str]]:
    """The admin page on, with a cheap hash (a thousand rounds), and the alerts kept instead of sent."""
    monkeypatch.setattr(superadmin, "settings", dataclasses.replace(settings, admin_username="test-admin", admin_password_hash=superadmin.hash_password(PASSWORD, 1_000)))
    alerted: List[str] = []
    monkeypatch.setattr(superadmin.alerts, "send", lambda kind, text, key="*": alerted.append(kind) or True)
    yield alerted
    db.execute(delete(LimitHit).where(LimitHit.kind == superadmin.FAIL))
    db.commit()


def log_in(ip: str, password: str = PASSWORD, username: str = "test-admin") -> Response:
    response = Response()
    superadmin.login(superadmin.Login(username=username, password=password), visitor(ip), response)
    return response


def cookie_of(response: Response) -> str:
    header = response.headers["set-cookie"]
    return header.split(";")[0].split("=", 1)[1]


def test_the_password_is_kept_as_a_hash_only() -> None:
    kept = superadmin.hash_password("super-secret-1")
    scheme, rounds, salt, key = kept.split(":")
    assert (scheme, int(rounds), len(salt), len(key)) == ("pbkdf2_sha256", 600_000, 32, 64)
    assert "super-secret-1" not in kept and "$" not in kept
    assert superadmin.password_ok("super-secret-1", kept)
    assert not superadmin.password_ok("super-secret-2", kept)
    # Each hash has its own salt, and a line that isn't one is refused
    assert superadmin.hash_password("super-secret-1", 1_000) != superadmin.hash_password("super-secret-1", 1_000)
    assert not superadmin.password_ok("super-secret-1", "") and not superadmin.password_ok("x", "pbkdf2_sha256:many:zz:zz")


def test_the_admin_page_is_off_without_its_settings() -> None:
    with pytest.raises(HTTPException) as off:
        superadmin.current_admin("anything")
    assert off.value.status_code == 404
    with pytest.raises(HTTPException) as off:
        log_in("203.0.113.60")
    assert off.value.status_code == 404


def test_a_login_is_a_signed_cookie_for_twelve_hours(admin_on: List[str], monkeypatch: Any) -> None:
    response = log_in("203.0.113.61")
    header = response.headers["set-cookie"].lower()
    assert header.startswith("geo_admin=") and "httponly" in header and "max-age=43200" in header and "samesite=lax" in header
    token = cookie_of(response)
    assert superadmin.current_admin(token) == "test-admin"
    # Not after 12 hours, not changed by a character, not without the cookie
    assert not superadmin.valid(token, time.time() + 12 * 3600 + 5)
    assert not superadmin.valid(token[:-1] + ("0" if token[-1] != "0" else "1"))
    for wrong in (None, "", "1.2", token.replace(".", "-")):
        with pytest.raises(HTTPException) as refused:
            superadmin.current_admin(wrong)
        assert refused.value.status_code == 401
    # A new password ends every session
    monkeypatch.setattr(superadmin, "settings", dataclasses.replace(superadmin.settings, admin_password_hash=superadmin.hash_password("another-password", 1_000)))
    assert not superadmin.valid(token)


def test_wrong_logins_shut_the_connection_then_everyone(db: Any, admin_on: List[str]) -> None:
    for _ in range(superadmin.FAILS_PER_CONNECTION):
        with pytest.raises(HTTPException) as wrong:
            log_in("203.0.113.62", "a-wrong-password")
        assert wrong.value.status_code == 401
    # The right password from that connection is refused for the hour; another connection may still log in
    with pytest.raises(HTTPException) as shut:
        log_in("203.0.113.62")
    assert (shut.value.status_code, shut.value.detail) == (429, "admin_locked")
    assert cookie_of(log_in("203.0.113.63"))
    # A wrong name counts as a wrong password
    with pytest.raises(HTTPException):
        log_in("203.0.113.64", username="admin")
    # Twenty in an hour from everyone: nobody may try, and the team is told once
    for index in range(superadmin.FAILS_FOR_EVERYONE - superadmin.FAILS_PER_CONNECTION - 1):
        with pytest.raises(HTTPException):
            log_in(f"198.51.100.{100 + index}", "wrong-password")
    assert admin_on == ["admin_locked"]
    with pytest.raises(HTTPException) as everyone:
        log_in("203.0.113.65")
    assert everyone.value.status_code == 429
    # `python -m app.admin unlock` opens it again
    admin.main(["unlock"])
    assert cookie_of(log_in("203.0.113.65"))


def test_the_lists_count_what_the_report_counts(db: Any, admin_on: List[str], run_id: str) -> None:
    project = db.scalar(select(Project).limit(1))
    rows = {row["id"]: row for row in superadmin.project_rows(db)}
    row = rows[project.id]
    # The latest check's buyer answers naming the client, of all of them: the report's own headline
    seen = wave.payload(db, project, run_id)["metrics"]["visibility"]
    assert (row["answers"], row["named"]) == (seen["answers"], seen["named"]) and row["checks"] >= 1
    owner = db.get(User, project.user_id)
    assert row["owner"] == owner.email and row["firstRunId"] == project.first_run_id and row["latestCheckAt"].endswith("+00:00")
    users = {user["id"]: user for user in superadmin.user_rows(db)}
    assert {"id": project.id, "domain": row["domain"]} in users[owner.id]["projects"]
    numbers = superadmin.overview("test-admin")
    assert numbers["users"]["total"] == db.scalar(select(func.count()).select_from(User))
    assert numbers["projects"]["total"] == db.scalar(select(func.count()).select_from(Project))
    assert numbers["checksADay"] == settings.free_checks_a_day and len(numbers["latestProjects"]) <= 5


def wait_for(condition: Any, seconds: float = 30.0) -> bool:
    ends = time.time() + seconds
    while time.time() < ends:
        if condition():
            return True
        time.sleep(0.05)
    return False


def test_the_queue_gives_a_check_to_one_asker(db: Any, accounts: List[User]) -> None:  # noqa: F811
    run = queued(db, accounts[0], "claimed-once.example")
    taken = queue.claim(run.id)
    assert taken is not None and taken[1]["name"] == "Stand-in Co"
    assert queue.claim(run.id) is None and queue.status_of(run.id) == "asking"


def test_approve_starts_a_waiting_check_once_and_emails_it(db: Any, admin_on: List[str], accounts: List[User], asking: List[Tuple[str, EmailMessage]]) -> None:  # noqa: F811
    first = queued(db, accounts[0], "approved-first.example", "en")
    second = queued(db, accounts[1], "approved-second.example", "ru")
    listed = superadmin.waiting_list("test-admin")
    assert [(row["domain"], row["place"], row["questions"]) for row in listed["waiting"]] == [("approved-first.example", 1, 10), ("approved-second.example", 2, 10)]
    assert listed["waiting"][0]["email"] == accounts[0].email and listed["checksToday"] >= listed["checksADay"]
    # The second, past the day's limit: started at once, counted, and the first keeps its place
    assert superadmin.approve(second.id, "test-admin") == {"id": second.id, "status": "asking"}
    assert db.scalar(select(func.count()).select_from(LimitHit).where(LimitHit.kind == "check", LimitHit.key == "admin")) == 1
    with pytest.raises(HTTPException) as again:
        superadmin.approve(second.id, "test-admin")
    assert again.value.status_code == 409
    assert wait_for(lambda: len(asking) == 1)
    db.expire_all()
    assert db.get(FirstRun, second.id).status == "done" and db.get(FirstRun, first.id).status == "waiting"
    to, message = asking[0]
    assert to == accounts[1].email and "approved-second.example" in message["Subject"]
    assert [row["domain"] for row in superadmin.waiting_list("test-admin")["waiting"]] == ["approved-first.example"]
    with pytest.raises(HTTPException) as missing:
        superadmin.approve("no-such-check", "test-admin")
    assert missing.value.status_code == 404
