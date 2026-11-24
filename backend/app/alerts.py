"""Emails to the team when something goes wrong that a visitor or a client meets (24 Nov 2026, the user's "Backups +
failure alerts", before the site's first post to many people): a free check that fails, a project's check that fails,
the OpenAI balance found empty, the night's database copy failed. Each kind is emailed at most once in its window (a
failure that repeats is in the server's log), to the team's accounts (`TEAM_EMAILS`, else the address the emails go
out from). Printed to the log either way. An alert never raises into what it reports on.

    python -m app.alerts test                  one email, to see the alerts arrive
    python -m app.alerts <kind> "<text>"       one alert of that kind (the backup script's failure)
"""

from __future__ import annotations

import datetime
import smtplib
import sys
from email.message import EmailMessage
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func, select

from . import mail
from .config import settings
from .db import FirstRun, LimitHit, SessionLocal, User, now

HOUR = datetime.timedelta(hours=1)
DAY = datetime.timedelta(days=1)

# kind → the email's subject, and how often at most (None: every time)
KINDS: Dict[str, Tuple[str, Optional[datetime.timedelta]]] = {
    "check_failed": ("a free check failed", HOUR),
    "weekly_failed": ("a project's check failed", DAY),
    "openai_empty": ("the OpenAI balance is empty", DAY),
    "backup_failed": ("the database copy failed", DAY),
    "test": ("alerts are on", None),
}
# Kept beside the limits' hits, as the limits' own alerts are
PREFIX = "alert:"

# A failed first check's error, in words
REASONS = {
    "site_unreadable": "the website could not be read (it may be down, or turn robots away)",
    "internal": "an error in our code",
    "no_answers": "no assistant answered",
}


def _recipients() -> List[str]:
    return list(settings.team_emails) or [address for address in [settings.smtp_from or settings.smtp_user] if address]


def send(kind: str, text: str, key: str = "*") -> bool:
    """Emails the team about `kind`, unless one went in its window (for this `key`). True when an email went."""
    subject, window = KINDS[kind]
    print(f"alert: {kind}: {text.splitlines()[0] if text else ''}")
    # On this computer checks are replayed: nothing there is worth an email
    if settings.first_run_replay:
        return False
    try:
        with SessionLocal() as db:
            if window and db.scalar(select(func.count()).select_from(LimitHit).where(LimitHit.kind == PREFIX + kind, LimitHit.key == key[:64], LimitHit.created_at > now() - window)):
                return False
            db.add(LimitHit(kind=PREFIX + kind, key=key[:64]))
            db.commit()
    except Exception as error:  # the database may be what failed: the email still goes
        print(f"alert: not recorded: {error!r}")
    recipients = _recipients()
    if not settings.own_email or not recipients:
        return False
    message = EmailMessage()
    message["Subject"] = f"{mail.BRAND}: {subject}"
    message.set_content(f"{text}\n\n— Seenova AI's server (app/alerts.py). The same alert is emailed at most once {'an hour' if window == HOUR else 'a day' if window == DAY else 'each time'}; the rest are in the server's log.")
    sent = False
    for address in recipients:
        try:
            mail.send(address, message)
            sent = True
        except (OSError, smtplib.SMTPException) as error:
            print(f"alert: the email to the team failed: {error!r}")
    return sent


def check_failed(run_id: str, stage: str) -> None:
    """A visitor's free check failed: while reading the website ("reading") or asking the assistants ("asking")."""
    try:
        with SessionLocal() as db:
            run = db.get(FirstRun, run_id)
            if run is None:
                return
            user = db.get(User, run.user_id)
            reason = REASONS.get(run.error or "", run.error or "unknown")
            text = (
                f"A visitor's free check failed while {'reading the website' if stage == 'reading' else 'asking the assistants'}: {reason}.\n"
                f"Website: {run.domain}\nAccount: {user.email if user else '?'}\nAt: {now():%d %b %Y %H:%M} UTC\n\n"
                "They see that it failed, and can start it again. The details are in the server's log:\n"
                '  journalctl -u geo-backend --since "1 hour ago"'
            )
        send("check_failed", text)
    except Exception as error:
        print(f"alert: check_failed for {run_id} not sent: {error!r}")


def openai_empty() -> None:
    """A check found the OpenAI balance empty and went back to the queue: so will the next ones, until it is topped up."""
    try:
        send(
            "openai_empty",
            "OpenAI's balance is empty: a free check went back to the queue instead of failing, and the next ones will too.\n\n"
            "Top it up at https://platform.openai.com/settings/organization/billing, then on the server:\n"
            "  cd /opt/geo-backend && sudo -u geo ./.venv/bin/python -m app.queue            (the queue and its cost)\n"
            "  cd /opt/geo-backend && sudo -u geo ./.venv/bin/python -m app.queue --run N    (asks the first N, emails each)",
        )
    except Exception as error:
        print(f"alert: openai_empty not sent: {error!r}")


def weekly_failed(project_id: str, error: Optional[str]) -> None:
    """A project's check by its plan failed: the client gets no report this time."""
    try:
        send(
            "weekly_failed",
            f"A project's check failed ({error or 'unknown'}): project {project_id}.\nIts client gets no report this time. The details are in the server's log:\n"
            '  journalctl -u geo-weekly --since "1 day ago"',
            key=project_id,
        )
    except Exception as exception:
        print(f"alert: weekly_failed for {project_id} not sent: {exception!r}")


def main(arguments: List[str]) -> None:
    if arguments[:1] == ["test"]:
        sent = send("test", "Alerts are on: an email comes when a visitor's free check fails, a project's check fails, the OpenAI balance runs out, or the night's database copy fails.")
        print("sent" if sent else "not sent: no email is set up here (SMTP_*), or no one to send to (TEAM_EMAILS)")
    elif len(arguments) == 2 and arguments[0] in KINDS:
        send(arguments[0], arguments[1])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
