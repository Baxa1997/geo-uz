"""The team's alerts (`app/alerts.py`, 24 Nov 2026, the user's "Backups + failure alerts"): a free check that fails and
the OpenAI balance found empty are emailed to the team, each kind at most once in its window, and an alert never breaks
the check it reports on. Nothing is asked or sent: the assistants are stand-ins and the emails are kept in a list."""

from __future__ import annotations

import dataclasses
from email.message import EmailMessage
from typing import Any, List, Tuple

import pytest

from app import alerts, firstrun, main, queue
from app.config import settings
from app.db import FirstRun, User
from test_queue import accounts, asking, ready_run  # noqa: F401 (the fixtures)
from test_wave import stand_ins  # noqa: F401 (the fixture)


@pytest.fixture()
def team(monkeypatch: Any) -> None:
    """Email set up, and the team's address to send to."""
    monkeypatch.setattr(alerts, "settings", dataclasses.replace(settings, smtp_host="smtp.stand-in", team_emails=["team@seenova.example"], first_run_replay=False))


def alerted(sent: List[Tuple[str, EmailMessage]]) -> List[Tuple[str, str]]:
    return [(to, message["Subject"]) for to, message in sent if message["Subject"].startswith(f"{alerts.mail.BRAND}: ") and "Your" not in message["Subject"]]


def test_a_failed_check_tells_the_team_once_an_hour(db: Any, accounts: List[User], asking: List[Tuple[str, EmailMessage]], team: None, monkeypatch: Any) -> None:
    def broken(*args: Any, **kwargs: Any) -> Any:
        raise firstrun.FirstRunError("no_answers", "stand-in")

    monkeypatch.setattr(firstrun, "check", broken)
    runs = [ready_run(db, user, f"failing-{number}.example") for number, user in enumerate(accounts[:2])]
    for run in runs:
        main.work_check(run.id, run.draft, firstrun.confirmed_of(run.draft), 0.0)
    db.expire_all()
    assert [db.get(FirstRun, run.id).status for run in runs] == ["failed", "failed"]
    # One email for both: the second failure in the hour is in the log only
    emails = alerted(asking)
    assert emails == [("team@seenova.example", f"{alerts.mail.BRAND}: a free check failed")]
    body = next(message for _, message in asking if "free check failed" in message["Subject"]).get_content()
    assert "failing-0.example" in body and "no assistant answered" in body


def test_an_empty_balance_tells_the_team_and_the_check_waits(db: Any, accounts: List[User], asking: List[Tuple[str, EmailMessage]], team: None, monkeypatch: Any) -> None:
    run = ready_run(db, accounts[0], "dry.example")
    monkeypatch.setattr(queue, "ran_dry", lambda run_id: True)
    main.work_check(run.id, run.draft, firstrun.confirmed_of(run.draft), 0.0)
    db.expire_all()
    assert db.get(FirstRun, run.id).status == queue.WAITING
    assert alerted(asking) == [("team@seenova.example", f"{alerts.mail.BRAND}: the OpenAI balance is empty")]
    assert "app.queue --run N" in asking[-1][1].get_content()


def test_an_alert_never_breaks_what_it_reports_on(db: Any, team: None, monkeypatch: Any) -> None:
    def down(address: str, message: EmailMessage) -> None:
        raise OSError("the mail server is down")

    monkeypatch.setattr(alerts.mail, "send", down)
    # The email fails, the caller goes on; an unknown check is passed over
    assert alerts.send("test", "stand-in") is False
    alerts.check_failed("no-such-check", "asking")
    alerts.weekly_failed("no-such-project", "internal")
