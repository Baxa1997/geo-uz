"""The free checks' queue (22 Nov 2026, the user's choice: "Cap at 2 a day + queue", run "by hand"). Past the day's free
checks for everyone (`FREE_CHECKS_A_DAY`), a check the owner confirms is not refused: it waits, with what they
confirmed, and they are told it will be emailed. A check that the OpenAI balance ran out under goes back here too,
in its old place, so nobody is shown a failure for it.

Since 25 Nov 2026 (the user's "Run it by itself") the server asks it every 15 minutes (`deploy/geo-queue.timer`, `--auto`):
the waiting checks in order, as many as the day's free checks have room for, each counted among them and emailed its
results. Before it asks one, a request of a few tokens tells whether OpenAI takes requests (the server can't read the
balance): when it is empty, nothing is asked and the team gets the alert. By hand, on the server:

    python -m app.queue              the queue, in order: place, website, account, waiting since, likely cost
    python -m app.queue --run 5      the first 5, one after another, whatever the day's limit; each one done is emailed
    python -m app.queue --auto       what the timer runs

A run stops at the first check the balance runs out under (it goes back to its place). A check that fails for another
reason is said so; its account may start another, since a failed check doesn't use up the free one.
"""

from __future__ import annotations

import argparse
import smtplib
import time
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

from sqlalchemy import delete, select

from . import alerts, limits, mail
from .config import settings
from .db import FirstRun, LimitHit, Project, SessionLocal, Slot, User, create_tables, now

WAITING = "waiting"
# What a check costs when no finished one says so: ten questions and the brand questions on ChatGPT
CHECK_USD = 0.6
# How OpenAI says the balance is empty (a 429 with this type and code); a rate limit is only retried
EMPTY = ("insufficient_quota", "exceeded your current quota")
LANGUAGES = ("uz", "ru", "en")


def _since(run: FirstRun) -> str:
    return str((run.draft or {}).get("queuedAt") or run.created_at.isoformat())


def waiting(db: Any) -> List[FirstRun]:
    """The queue, first in first: by when each joined it."""
    return sorted(db.scalars(select(FirstRun).where(FirstRun.status == WAITING)), key=_since)


def place(db: Any, run: FirstRun) -> int:
    """A waiting check's place in the queue, from 1."""
    ahead = [other for other in waiting(db) if other.id != run.id and _since(other) < _since(run)]
    return len(ahead) + 1


def join(run: FirstRun, confirmed: Dict[str, Any], language: str) -> None:
    """Puts a confirmed check in the queue with what it is to ask, keeping its place when it was there before. The
    caller commits."""
    draft = dict(run.draft or {})
    draft["confirmed"] = confirmed
    draft["language"] = language if language in LANGUAGES else draft.get("language") or "uz"
    draft.setdefault("queuedAt", now().isoformat())
    run.draft = draft
    run.status, run.answered, run.total, run.error = WAITING, 0, 0, None
    run.partial = run.result = run.raw = None
    run.finished_at = None


def ran_dry(run_id: str) -> bool:
    """Whether a call of this check found the OpenAI balance empty."""
    with SessionLocal() as db:
        details = db.scalars(select(Slot.detail).where(Slot.first_run_id == run_id, Slot.status == "failed"))
        return any(marker in (detail or "") for detail in details for marker in EMPTY)


def put_back(run_id: str, confirmed: Dict[str, Any]) -> None:
    """A check the balance ran out under: back in the queue, its slots dropped, so it is asked whole once topped up."""
    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        if run is None:
            return
        db.execute(delete(Slot).where(Slot.first_run_id == run_id))
        join(run, confirmed, (run.draft or {}).get("language") or "uz")
        db.commit()
    print(f"queue: {run_id} back in the queue, the OpenAI balance is empty")


def check_usd(db: Any) -> float:
    """What a free check costs, from the latest ones done."""
    costs = [run.cost_usd for run in db.scalars(select(FirstRun).where(FirstRun.status == "done", FirstRun.cost_usd > 0).order_by(FirstRun.created_at.desc()).limit(10))]
    return round(sum(costs) / len(costs), 2) if costs else CHECK_USD


WORDS = {
    "uz": {
        "subject": "{brand}: {site} tekshiruvi tayyor",
        "text": "Bepul tekshiruvingiz tayyor: AI yordamchilar {site} haqida nima deyishini koʻring.",
        "button": "Natijalarni ochish",
        "login": "Kirish uchun emailingizga kod yuboramiz.",
    },
    "ru": {
        "subject": "{brand}: проверка {site} готова",
        "text": "Ваша бесплатная проверка готова: посмотрите, что AI-ассистенты говорят о {site}.",
        "button": "Открыть результаты",
        "login": "Для входа мы пришлём код на вашу почту.",
    },
    "en": {
        "subject": "{brand}: your check of {site} is ready",
        "text": "Your free check is ready: see what AI assistants say about {site}.",
        "button": "Open the results",
        "login": "To log in, we email you a code.",
    },
}


def link(db: Any, run: FirstRun) -> str:
    """The project's dashboard when the check saved it (it does when it ends), else the check's own page."""
    language = (run.draft or {}).get("language") or "en"
    project_id = db.scalar(select(Project.id).where(Project.first_run_id == run.id))
    path = f"projects/{project_id}" if project_id else f"onboarding/first-run?run={run.id}"
    return f"{settings.frontend_origin.rstrip('/')}/{language}/{path}"


def ready_email(db: Any, run: FirstRun) -> EmailMessage:
    language = (run.draft or {}).get("language") or "en"
    words = WORDS[language if language in WORDS else "en"]
    site, url = run.domain, link(db, run)
    message = EmailMessage()
    message["Subject"] = words["subject"].format(brand=mail.BRAND, site=site)
    message.set_content(f"{mail.BRAND}\n\n{words['text'].format(site=site)}\n\n{url}\n\n{words['login']}\n")
    message.add_alternative(
        f"""<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#14182b;max-width:480px">
{mail.WORDMARK_HTML}
<p style="margin:0 0 20px;line-height:1.5">{words['text'].format(site=site)}</p>
<p style="margin:0 0 20px"><a href="{url}" style="display:inline-block;background:#14182b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">{words['button']}</a></p>
<p style="margin:0;color:#666b7a;font-size:13px">{words['login']}</p>
</div>""",
        subtype="html",
    )
    return message


def run_one(run_id: str) -> str:
    """Asks one waiting check, as the site would have: "done", "waiting" (the balance ran out) or "failed"."""
    from .main import work_check  # the check as the site asks it; imported here, since main imports this module

    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        if run is None or run.status != WAITING:
            return run.status if run else "missing"
        draft = dict(run.draft or {})
        confirmed, spent = draft.get("confirmed") or {}, run.cost_usd or 0.0
        run.status = "asking"
        db.commit()
    work_check(run_id, draft, confirmed, spent)
    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        return run.status if run else "missing"


def tell(run_id: str) -> bool:
    """Emails a done check's account its link. False when the email could not be handed over."""
    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        user = db.get(User, run.user_id) if run else None
        if run is None or user is None:
            return False
        message = ready_email(db, run)
    try:
        mail.send(user.email, message)
        return True
    except (OSError, smtplib.SMTPException) as error:
        print(f"queue: the email for {run_id} failed: {error!r}")
        return False


def openai_ready() -> bool:
    """Whether OpenAI takes requests: one of a few tokens, about a hundredth of a cent. False only when it answers that
    the balance is empty; anything else (OpenAI down, a rate limit) is left to the check, which handles it."""
    if "chatgpt" not in settings.engines:
        return True
    from .engines import llm  # the pilot's OpenAI client, on the path `engines` gives it

    try:
        llm.respond({"model": settings.chatgpt_model, "input": "Reply with OK.", "max_output_tokens": 16}, attempts=1)
    except llm.LlmError as error:
        return not any(marker in str(error) for marker in EMPTY)
    return True


def auto() -> None:
    """What the server's timer runs every 15 minutes (25 Nov 2026): the waiting checks in order, as many as the day's free
    checks for everyone have room for, each counted among them before it is asked and emailed when done. Nothing is
    asked while OpenAI says its balance is empty: the team is told (at most once a day) and the queue waits."""
    with SessionLocal() as db:
        ids = [run.id for run in waiting(db)]
        room = settings.free_checks_a_day - limits.checks_today(db) if ids else 0
    if not ids:
        return
    if room <= 0:
        print(f"queue: {len(ids)} waiting; the day's {settings.free_checks_a_day} free checks are taken")
        return
    if not settings.engines or "localhost" in settings.frontend_origin or "127.0.0.1" in settings.frontend_origin:
        print(f"queue: {len(ids)} waiting; not asked here (no assistant, or FRONTEND_ORIGIN is {settings.frontend_origin})")
        return
    if not openai_ready():
        print(f"queue: {len(ids)} waiting; the OpenAI balance is empty")
        alerts.openai_empty()
        return
    for run_id in ids[:room]:
        # Counted among the day's free checks before it is asked, as a check started from the site is
        with SessionLocal() as db:
            db.add(LimitHit(kind="check", key="queue"))
            db.commit()
        started = time.time()
        outcome = run_one(run_id)
        emailed = outcome == "done" and tell(run_id)
        print(f"queue: {run_id} {outcome} in {time.time() - started:.0f}s{', emailed' if emailed else ''}")
        if outcome == WAITING:
            # The balance ran out under it: it is back in its place, and the team was told
            break


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.queue", description="The free checks' queue.")
    parser.add_argument("--run", type=int, metavar="N", help="ask the first N checks of the queue, and email each one done")
    parser.add_argument("--auto", action="store_true", help="what the timer runs: the waiting checks the day's free checks have room for")
    chosen = parser.parse_args(argv)
    create_tables()
    if chosen.auto:
        auto()
        return
    with SessionLocal() as db:
        queue = waiting(db)
        usd = check_usd(db)
        accounts = {user.id: user.email for user in db.scalars(select(User).where(User.id.in_([run.user_id for run in queue])))} if queue else {}
        rows = [(run.id, run.domain, accounts.get(run.user_id, "?"), _since(run)[:16].replace("T", " "), len(((run.draft or {}).get("confirmed") or {}).get("prompts") or [])) for run in queue]
    if not chosen.run:
        for number, (_, domain, email, since, questions) in enumerate(rows, start=1):
            print(f"{number:3}. {domain:32} {email:32} since {since}  {questions} questions")
        print(f"{len(rows)} waiting, about ${usd:.2f} each, ${usd * len(rows):.2f} in all" if rows else "The queue is empty.")
        return
    if chosen.run < 1:
        parser.error("--run takes a number from 1")
    if not settings.engines:
        raise SystemExit("No assistant has a key: nothing can be asked.")
    if "localhost" in settings.frontend_origin or "127.0.0.1" in settings.frontend_origin:
        raise SystemExit(f"FRONTEND_ORIGIN is {settings.frontend_origin}: the emails' links would open nowhere. Set it to the site's address first.")
    picked = rows[: chosen.run]
    print(f"Asking {len(picked)} of {len(rows)} waiting checks, about ${usd * len(picked):.2f}.")
    for number, (run_id, domain, email, _, _) in enumerate(picked, start=1):
        started = time.time()
        outcome = run_one(run_id)
        emailed = "" if outcome != "done" else ", emailed" if tell(run_id) else ", not emailed (the email failed)"
        print(f"{number}. {domain}: {outcome}, {time.time() - started:.0f}s{emailed}")
        if outcome == WAITING:
            print("The OpenAI balance is empty: the queue stops here, this check back in its place.")
            break


if __name__ == "__main__":
    main()
