"""The free checks' queue (`app/queue.py`, 22 Nov 2026): past the day's free checks for everyone a confirmed check waits
instead of being refused, a website read then skips the competitors' search, the queue runs in order by hand and emails
each check done, and a check the OpenAI balance ran out under goes back to its place. Nothing is asked or sent: the
assistants are stand-ins and the emails are kept in a list."""

from __future__ import annotations

import dataclasses
import time
from email.message import EmailMessage
from typing import Any, Dict, Iterator, List, Tuple

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, select

from app import engines, firstrun, limits, mail, main, projects, queue
from app.config import settings
from app.db import FirstRun, LimitHit, Project, Slot, User
from test_limits import visitor
from test_wave import QUESTIONS, stand_in_draft, stand_ins  # noqa: F401 (the fixture)

EMPTY_BALANCE = 'OpenAI answered 429: {"error": {"message": "You exceeded your current quota.", "type": "insufficient_quota", "code": "insufficient_quota"}}'


@pytest.fixture()
def accounts(db: Any) -> Iterator[List[User]]:
    """Three accounts with nothing yet, and the day's free checks for everyone taken."""
    made = [User(email=f"owner{number}@queue.example") for number in range(3)]
    db.add_all(made)
    db.add_all([LimitHit(kind="check", key=f"198.51.100.{index}") for index in range(settings.free_checks_a_day)])
    db.commit()
    yield made
    ids = [user.id for user in made]
    db.expire_all()
    # A check that ends is saved as its account's project
    for project in db.scalars(select(Project).where(Project.user_id.in_(ids))).all():
        projects.delete(db, project)
    db.execute(delete(Slot).where(Slot.first_run_id.in_(select(FirstRun.id).where(FirstRun.user_id.in_(ids)))))
    db.execute(delete(FirstRun).where(FirstRun.user_id.in_(ids)))
    db.execute(delete(User).where(User.id.in_(ids)))
    db.execute(delete(LimitHit))
    db.commit()


@pytest.fixture()
def asking(monkeypatch: Any, stand_ins: None) -> List[Tuple[str, EmailMessage]]:  # noqa: F811
    """ChatGPT alone, through the stand-ins, the site's address set, and the emails kept instead of sent."""
    chatgpt = dataclasses.replace(settings, openai_key="stand-in", answer_engines=["chatgpt"], frontend_origin="https://seenova.example")
    for module in (main, queue, firstrun):
        monkeypatch.setattr(module, "settings", chatgpt)
    sent: List[Tuple[str, EmailMessage]] = []
    monkeypatch.setattr(mail, "send", lambda to, message: sent.append((to, message)))
    return sent


def ready_run(db: Any, user: User, domain: str) -> FirstRun:
    draft = stand_in_draft()
    draft["own"] = domain
    run = FirstRun(user_id=user.id, domain=domain, status="ready", draft=draft, cost_usd=0.01)
    db.add(run)
    db.commit()
    return run


def confirmed(language: str = "ru") -> main.Confirmed:
    return main.Confirmed(name="Stand-in Co", prompts=[dict(question) for question in QUESTIONS], language=language)


def queued(db: Any, user: User, domain: str, language: str = "ru") -> FirstRun:
    run = ready_run(db, user, domain)
    queue.join(run, firstrun.confirmed_of(run.draft), language)
    db.commit()
    return run


def test_past_the_days_checks_a_confirmed_check_joins_the_queue(db: Any, accounts: List[User]) -> None:
    first, second, third = accounts
    run = ready_run(db, first, "first-queue.example")
    # The last step knows before the press that the check will wait
    assert main.first_run_draft(run.id, first)["queue"] is True
    waiting = main.confirm_first_run(run.id, confirmed(), visitor("203.0.113.40"), first)
    assert (waiting["status"], waiting["place"], waiting["email"]) == ("waiting", 1, first.email)
    db.expire_all()
    kept = db.get(FirstRun, run.id)
    assert kept.draft["confirmed"]["name"] == "Stand-in Co" and len(kept.draft["confirmed"]["prompts"]) == 10
    assert kept.draft["language"] == "ru" and kept.draft["queuedAt"]
    # Pressed again, or the page reloaded: the same place
    assert main.confirm_first_run(run.id, confirmed(), visitor("203.0.113.40"), first)["place"] == 1
    # Another account from the same connection comes second; a third from it is refused (2 a day a connection)
    other = ready_run(db, second, "second-queue.example")
    assert main.confirm_first_run(other.id, confirmed("uz"), visitor("203.0.113.40"), second)["place"] == 2
    late = ready_run(db, third, "third-queue.example")
    with pytest.raises(HTTPException) as refused:
        main.confirm_first_run(late.id, confirmed(), visitor("203.0.113.40"), third)
    assert refused.value.status_code == 429
    # A check in the queue is the account's free one: another website shows it, not a second check
    again = main.start_first_run(main.FirstRunRequest(domain="another-site.example"), visitor("203.0.113.41"), first)
    assert (again["id"], again["status"], again["place"]) == (run.id, "waiting", 1)
    assert [row["status"] for row in main.first_runs(first)] == ["waiting"]


def test_a_website_read_past_the_days_checks_skips_the_search(db: Any, accounts: List[User], monkeypatch: Any) -> None:
    started: List[Tuple[Any, ...]] = []
    monkeypatch.setattr(main, "work_prepare", lambda *args: started.append(args))
    main.start_first_run(main.FirstRunRequest(domain="read-queue.example"), visitor("203.0.113.42"), accounts[0])
    for _ in range(50):
        if started:
            break
        time.sleep(0.02)
    assert started and started[0][-1] is False
    # The reading itself: no search asked, the profile's own competitors kept and said to be so
    searched: List[str] = []
    monkeypatch.setattr(firstrun.web, "read_site", lambda domain, language: [{"url": f"https://{domain}/", "text": "A stand-in business."}])
    monkeypatch.setattr(firstrun, "_raw", lambda url: "")
    monkeypatch.setattr(firstrun, "site_checks", lambda *args: [])
    monkeypatch.setattr(firstrun, "search_competitors", lambda *args: searched.append("asked") or ([], 0.0))
    monkeypatch.setattr(firstrun, "profile", lambda *args: ({**stand_in_draft()["who"], "competitors": [{"name": "Recalled Rival", "domain": ""}]}, 0.0))
    draft, _ = firstrun.prepare("read-queue.example", None, None, "UZ", search=False)
    assert searched == [] and draft["who"]["competitors"] == [{"name": "Recalled Rival", "domain": ""}]
    assert draft["who"]["competitorsSearched"] is False
    firstrun.prepare("read-queue.example", None, None, "UZ")
    assert searched == ["asked"]


def test_the_queue_runs_in_order_and_emails_each_check_done(db: Any, accounts: List[User], asking: List[Tuple[str, EmailMessage]], capsys: Any) -> None:
    first = queued(db, accounts[0], "first-run-queue.example", "ru")
    second = queued(db, accounts[1], "second-run-queue.example", "en")
    queue.main([])
    listed = capsys.readouterr().out
    assert listed.index("first-run-queue.example") < listed.index("second-run-queue.example") and "2 waiting" in listed
    queue.main(["--run", "1"])
    db.expire_all()
    assert db.get(FirstRun, first.id).status == "done" and db.get(FirstRun, first.id).result
    assert db.get(FirstRun, second.id).status == "waiting"
    with main.ReadSession() as read:
        assert queue.place(read, db.get(FirstRun, second.id)) == 1
    # One email, to the account, in the language its page had, with the link to its results
    assert len(asking) == 1
    to, message = asking[0]
    assert to == accounts[0].email and "проверка first-run-queue.example готова" in message["Subject"]
    # The check saved itself as the account's project when it ended: the email opens its dashboard
    saved = db.scalar(select(Project).where(Project.first_run_id == first.id))
    assert saved is not None and saved.user_id == accounts[0].id
    assert f"https://seenova.example/ru/projects/{saved.id}" in message.get_body(("plain",)).get_content()
    assert main.first_run_progress(first.id, accounts[0])["projectId"] == saved.id
    assert "emailed" in capsys.readouterr().out


def test_the_links_must_open_somewhere(db: Any, accounts: List[User], asking: List[Tuple[str, EmailMessage]], monkeypatch: Any) -> None:
    queued(db, accounts[0], "nowhere-queue.example")
    monkeypatch.setattr(queue, "settings", dataclasses.replace(queue.settings, frontend_origin="http://localhost:3000"))
    with pytest.raises(SystemExit):
        queue.main(["--run", "1"])
    assert asking == []


def test_a_check_the_balance_ran_out_under_goes_back_to_its_place(db: Any, accounts: List[User], asking: List[Tuple[str, EmailMessage]], monkeypatch: Any) -> None:
    def empty(engine: str, question: str, *place: Any) -> Dict[str, Any]:
        raise engines.EngineError(EMPTY_BALANCE)

    first = queued(db, accounts[0], "dry-queue.example")
    second = queued(db, accounts[1], "dry-second-queue.example")
    since = first.draft["queuedAt"]
    monkeypatch.setattr(engines, "ask", empty)
    # The run stops at the first: it is back in the queue, first, with no slot left from the failed try
    queue.main(["--run", "2"])
    db.expire_all()
    back = db.get(FirstRun, first.id)
    assert (back.status, back.draft["queuedAt"], back.error) == ("waiting", since, None)
    assert db.scalars(select(Slot).where(Slot.first_run_id == first.id)).first() is None
    assert db.get(FirstRun, second.id).status == "waiting" and asking == []
    # A check started from the site goes to the queue too, with what was confirmed, instead of failing
    live = ready_run(db, accounts[2], "live-dry-queue.example")
    asked = firstrun.confirmed_of(live.draft)
    live.status = "asking"
    db.commit()
    main.work_check(live.id, live.draft, asked, 0.0)
    db.expire_all()
    waiting = db.get(FirstRun, live.id)
    assert waiting.status == "waiting" and waiting.draft["confirmed"] == asked
    with main.ReadSession() as read:
        assert queue.place(read, waiting) == 3


def test_a_finished_check_saves_itself_and_one_that_cant_stays_done(db: Any, accounts: List[User], asking: List[Tuple[str, EmailMessage]]) -> None:
    """The user, 23 Nov 2026: "after that report it must automatically save the project and navigate to dashboard"."""
    runs = [ready_run(db, user, "saved-itself.example") for user in accounts[:2]]
    for run in runs:
        run.status = "asking"
    db.commit()
    for run in runs:
        main.work_check(run.id, run.draft, firstrun.confirmed_of(run.draft), 0.0)
    db.expire_all()
    first, second = (main.first_run_progress(run.id, user) for run, user in zip(runs, accounts))
    assert first["status"] == "done" and first["projectId"]
    project = db.get(Project, first["projectId"])
    assert project.user_id == accounts[0].id and project.first_run_id == runs[0].id
    # The same website for another account: taken, so the check is only done, and its page saves it by hand as before
    assert second["status"] == "done" and second["projectId"] is None


def test_the_login_code_is_answered_before_its_email(db: Any, monkeypatch: Any) -> None:
    """The user, 23 Nov 2026: the login was slow. The code is stored and answered at once, the email sent after; one
    that couldn't be sent is dropped, so asking again isn't held back."""
    from app.db import LoginCode

    monkeypatch.setattr(main, "settings", dataclasses.replace(main.settings, smtp_host="smtp.example"))
    sending = __import__("threading").Event()

    def fails(to: str, code: str, minutes: int) -> None:
        sending.wait(5)
        raise OSError("stand-in: the mail server is away")

    monkeypatch.setattr(main.mail, "send_code", fails)
    email = "slow-mail@queue.example"
    try:
        assert main.send_code(main.CodeRequest(email=email), visitor("203.0.113.50")) == {"resendIn": main.RESEND_SECONDS}
        # Answered while the email is still on its way, the code already stored
        assert db.get(LoginCode, email) is not None
        sending.set()
        for _ in range(100):
            db.expire_all()
            if db.get(LoginCode, email) is None:
                break
            time.sleep(0.02)
        assert db.get(LoginCode, email) is None
    finally:
        db.execute(delete(LoginCode).where(LoginCode.email == email))
        db.execute(delete(LimitHit))
        db.commit()


def test_a_tour_is_seen_once_for_the_account_on_any_device(db: Any) -> None:
    """The user, 23 Nov 2026: "the Touring must be showed only once ... even in different devices": the tours an
    account has seen are kept on it, once each, and come with the account wherever it logs in."""
    user = User(email="tours@queue.example")
    db.add(user)
    db.commit()
    try:
        assert main.me(user)["seenTours"] == []
        assert main.tour_seen(main.TourSeen(tour="overview"), user) == {"seenTours": ["overview"]}
        # Again, from another device: kept once
        assert main.tour_seen(main.TourSeen(tour="overview"), user) == {"seenTours": ["overview"]}
        assert main.tour_seen(main.TourSeen(tour="prompts"), user)["seenTours"] == ["overview", "prompts"]
        db.expire_all()
        assert main.user_json(db.get(User, user.id))["seenTours"] == ["overview", "prompts"]
        # Only a tour's id: anything else is refused
        with pytest.raises(HTTPException) as refused:
            main.tour_seen(main.TourSeen(tour="../etc"), user)
        assert refused.value.status_code == 422
    finally:
        db.execute(delete(User).where(User.id == user.id))
        db.commit()
