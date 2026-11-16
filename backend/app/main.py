"""The API the frontend calls (`frontend/CLAUDE.md`, "API contract"), a slice at a time.

Built so far: login by a code sent to an email, a new account's first run, and projects with their report
(read only: a first run saved as a project).

    uvicorn app.main:app --reload --port 8000      (from backend/, with its .venv active)
"""

from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import re
import secrets
import smtplib
import threading
import time
import urllib.error
import urllib.request
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

from fastapi import Body, Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func, select

from . import delivery, firstrun, fixes, mail, projects
from .config import settings
from .db import Brand, DemoRequest, FirstRun, LoginCode, Project, Run, Session, SessionLocal, User, create_tables, now

SESSION_COOKIE = "geo_session"
CODE_MINUTES = 10
RESEND_SECONDS = 60
MAX_ATTEMPTS = 5

app = FastAPI(title="GEO backend")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
create_tables()


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def user_json(user: User) -> Dict[str, Any]:
    # `phone` and `telegramUsername` stay in the shape for the pages that read them; login is by email now
    return {"id": user.id, "name": user.name, "email": user.email, "phone": None, "telegramUsername": None}


# --- login ---------------------------------------------------------------------------------------------


class CodeRequest(BaseModel):
    email: str


class VerifyRequest(BaseModel):
    email: str
    code: str


def clean_email(email: str) -> str:
    email = email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 320:
        raise HTTPException(422, "bad_email")
    return email


def supabase(path: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Supabase's own email login: it sends the code and checks it."""
    request = urllib.request.Request(
        f"{settings.supabase_url}/auth/v1/{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"apikey": settings.supabase_anon_key or "", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as reply:
            return json.loads(reply.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as error:
        raise HTTPException(429 if error.code == 429 else 401, "login_failed") from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise HTTPException(503, "login_unavailable") from error


@app.post("/auth/code")
def send_code(body: CodeRequest) -> Dict[str, int]:
    email = clean_email(body.email)
    if settings.supabase_login:
        supabase("otp", {"email": email, "create_user": True})
        return {"resendIn": RESEND_SECONDS}
    with SessionLocal() as db:
        last = db.get(LoginCode, email)
        if last and (now() - last.sent_at).total_seconds() < RESEND_SECONDS:
            return {"resendIn": RESEND_SECONDS - int((now() - last.sent_at).total_seconds())}
        code = f"{secrets.randbelow(1_000_000):06d}"
        if settings.own_email:
            # Sent before it is stored: a code nobody received must not start the wait for the next one
            try:
                mail.send_code(email, code, CODE_MINUTES)
            except (OSError, smtplib.SMTPException) as error:
                print(f"login email failed: {error!r}")
                raise HTTPException(503, "email_unavailable") from error
        else:
            # Development only: no email is sent, the code is in the server's log
            print(f"LOGIN CODE for {email}: {code}")
        db.merge(LoginCode(email=email, code_hash=digest(code), expires_at=now() + datetime.timedelta(minutes=CODE_MINUTES), sent_at=now(), attempts=0))
        db.commit()
    return {"resendIn": RESEND_SECONDS}


@app.post("/auth/code/verify")
def verify_code(body: VerifyRequest, response: Response) -> Dict[str, Any]:
    email = clean_email(body.email)
    code = body.code.strip()
    with SessionLocal() as db:
        if settings.supabase_login:
            found = supabase("verify", {"type": "email", "email": email, "token": code})
            user_id = (found.get("user") or {}).get("id")
            if not user_id:
                raise HTTPException(401, "wrong_code")
            user = db.get(User, user_id) or db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(id=user_id, email=email)
                db.add(user)
        else:
            sent = db.get(LoginCode, email)
            if sent is None or sent.expires_at < now() or sent.attempts >= MAX_ATTEMPTS:
                raise HTTPException(401, "code_expired")
            if not hmac.compare_digest(sent.code_hash, digest(code)):
                sent.attempts += 1
                db.commit()
                raise HTTPException(401, "wrong_code")
            db.delete(sent)
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(email=email)
                db.add(user)
                db.flush()
        token = secrets.token_urlsafe(32)
        db.add(Session(token_hash=digest(token), user_id=user.id, expires_at=now() + datetime.timedelta(days=settings.session_days)))
        db.commit()
        response.set_cookie(SESSION_COOKIE, token, max_age=settings.session_days * 86400, httponly=True, samesite="lax", secure=settings.secure_cookies, path="/")
        return user_json(user)


def current_user(geo_session: Optional[str] = Cookie(default=None)) -> User:
    if not geo_session:
        raise HTTPException(401, "not_logged_in")
    with SessionLocal() as db:
        session = db.get(Session, digest(geo_session))
        if session is None or session.expires_at < now():
            raise HTTPException(401, "not_logged_in")
        user = db.get(User, session.user_id)
        if user is None:
            raise HTTPException(401, "not_logged_in")
        return user


@app.get("/auth/me")
def me(user: User = Depends(current_user)) -> Dict[str, Any]:
    return user_json(user)


class MeUpdate(BaseModel):
    name: str


@app.patch("/auth/me")
def update_me(body: MeUpdate, user: User = Depends(current_user)) -> Dict[str, Any]:
    name = body.name.strip()
    if len(name) > 120:
        raise HTTPException(422, "name_too_long")
    with SessionLocal() as db:
        found = db.get(User, user.id)
        found.name = name or None
        db.commit()
        return user_json(found)


@app.post("/auth/logout", status_code=204)
def logout(response: Response, geo_session: Optional[str] = Cookie(default=None)) -> None:
    if geo_session:
        with SessionLocal() as db:
            session = db.get(Session, digest(geo_session))
            if session:
                db.delete(session)
                db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


# --- the first run --------------------------------------------------------------------------------------


class FirstRunRequest(BaseModel):
    domain: str
    # The company's name as its owner writes it, when given with the website
    name: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    # The country the business serves, as its two-letter code: asked with the website (the user, 16 Nov 2026)
    country: Optional[str] = None


def run_json(run: FirstRun) -> Dict[str, Any]:
    return {"id": run.id, "domain": run.domain, "status": run.status, "answered": run.answered, "total": run.total, "error": run.error}


def _saved_run(db: Any, run_id: str) -> Optional[FirstRun]:
    # A run that kept its raw answers first: a project saved from the replay then has all of it
    return db.scalar(select(FirstRun).where(FirstRun.status == "done", FirstRun.id != run_id).order_by(FirstRun.raw.is_(None), FirstRun.created_at.desc()))


def replay(run_id: str, progress: Any) -> Dict[str, Any]:
    """Development (`FIRST_RUN_REPLAY`): the latest saved run again, at a watchable pace, asking nobody."""
    with SessionLocal() as db:
        saved = _saved_run(db, run_id)
        if saved is None or not saved.result:
            raise firstrun.FirstRunError("no_saved_run")
        result, raw = dict(saved.result), saved.raw
    total = int(result.get("answers") or 0) or sum(len(item["answers"]) for item in result.get("prompts", []))
    for answered in range(1, total + 1):
        time.sleep(0.6)
        progress("asking", answered, total)
    progress("reading_answers", total, total)
    time.sleep(2)
    # `replayed` tells the page to say that these are a saved run's numbers, not this website's
    return {"status": "done", "result": {**result, "id": run_id, "replayed": True}, "raw": raw, "cost_usd": 0.0}


def replay_draft(run_id: str) -> Dict[str, Any]:
    """Development: the saved run's business as the draft, marked `replayed` so every step says whose it is."""
    with SessionLocal() as db:
        saved = _saved_run(db, run_id)
        if saved is None or not saved.result:
            raise firstrun.FirstRunError("no_saved_run")
        result, who = saved.result, dict((saved.raw or {}).get("profile") or {})
    who = {
        "name": result["brand"]["name"],
        "aliases": result["brand"].get("aliases") or [],
        "category": result.get("category") or "",
        "city": result.get("city") or "",
        "cityEn": who.get("cityEn") or result.get("city") or "",
        "country": result.get("country") or "UZ",
        "description": result.get("description") or "",
        "services": result.get("services") or [],
        "questions": [{key: item["prompt"][key] for key in ("text", "language", "topic")} for item in result.get("prompts", [])],
        "competitors": [{"name": rival["name"], "domain": rival.get("domain") or ""} for rival in result.get("competitors", [])],
        "brandQuestions": [],
    }
    time.sleep(2)
    return {"who": who, "country": who["country"], "own": result["domain"], "checks": result.get("siteChecks") or [], "siteText": "", "brandQuestions": [{"text": q["text"], "language": q["language"]} for q in result.get("brandQuestions") or []], "replayed": True}


def _finish(run_id: str, outcome: Dict[str, Any], over: bool = True) -> None:
    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        if run:
            for key, value in outcome.items():
                setattr(run, key, value)
            if over:
                run.finished_at = now()
            db.commit()


def _progress(run_id: str) -> Any:
    def progress(status: str, answered: int, total: int) -> None:
        with SessionLocal() as db:
            run = db.get(FirstRun, run_id)
            if run:
                run.status, run.answered, run.total = status, answered, total
                db.commit()

    return progress


def work_prepare(run_id: str, domain: str, category: Optional[str], city: Optional[str], country: Optional[str] = None, name: Optional[str] = None) -> None:
    """Reads the website outside the request that started the run, and leaves the draft for the owner: `ready`."""
    _progress(run_id)("reading_site", 0, 0)
    try:
        if settings.first_run_replay:
            draft, cost = replay_draft(run_id), 0.0
        else:
            draft, cost = firstrun.prepare(domain, category, city, country, name)
        _finish(run_id, {"status": "ready", "draft": draft, "cost_usd": cost}, over=False)
    except firstrun.FirstRunError as error:
        _finish(run_id, {"status": "failed", "error": error.code})
    except Exception as error:  # a run must never stay "reading" for ever
        print(f"first run {run_id} failed while reading the site: {error!r}")
        _finish(run_id, {"status": "failed", "error": "internal"})


def work_check(run_id: str, draft: Dict[str, Any], confirmed: Dict[str, Any], spent: float) -> None:
    """Asks what the owner confirmed, outside the request that started it, writing its progress as it goes."""
    progress = _progress(run_id)
    try:
        if settings.first_run_replay:
            outcome: Dict[str, Any] = replay(run_id, progress)
        else:
            snapshot, raw, cost = firstrun.check(draft, confirmed, progress)
            outcome = {"status": "done", "result": {"id": run_id, **snapshot}, "raw": raw, "cost_usd": round(spent + cost, 4)}
    except firstrun.FirstRunError as error:
        outcome = {"status": "failed", "error": error.code}
    except Exception as error:  # a run must never stay "asking" for ever
        print(f"first run {run_id} failed: {error!r}")
        outcome = {"status": "failed", "error": "internal"}
    _finish(run_id, outcome)


# A check that asked the assistants: what the daily limit counts. Reading a website costs a cent, asking half a dollar.
CHECKED = ("asking", "reading_answers", "done")


def _checks_today(db: Any, user: User) -> int:
    day = now() - datetime.timedelta(days=1)
    return db.scalar(select(func.count()).select_from(FirstRun).where(FirstRun.user_id == user.id, FirstRun.created_at > day, FirstRun.status.in_(CHECKED))) or 0


def _free_check_used(db: Any, user: User, but: str = "") -> bool:
    """One free check an account (the user's rule, 15 Nov 2026: "the first check free, every next one only on
    a paid account"): true when the account has a project, or a check other than `but` that asked the
    assistants. An account that pays for Enterprise (several projects) and our own accounts may go on."""
    if settings.first_run_replay or (user.email or "").lower() in settings.team_emails:
        return False
    owned = list(db.scalars(select(Project).where(Project.user_id == user.id)))
    if any(project.paid and project.plan == "agency" for project in owned):
        return False
    return bool(owned) or bool(db.scalar(select(func.count()).select_from(FirstRun).where(FirstRun.user_id == user.id, FirstRun.id != but, FirstRun.status.in_(CHECKED))))


@app.post("/first-runs", status_code=202)
def start_first_run(body: FirstRunRequest, user: User = Depends(current_user)) -> Dict[str, Any]:
    """Starts reading a website and returns at once; the frontend then asks for its progress. Nobody is asked
    yet: the run stops at `ready`, with a draft for the owner to correct (`/draft`, then `/start`)."""
    try:
        domain = firstrun.normalize(body.domain)
    except firstrun.FirstRunError as error:
        raise HTTPException(422, error.code) from error
    with SessionLocal() as db:
        # One website, one project: asked before the run, so nobody pays for a check that can't be saved
        if projects.domain_taken(db, domain):
            raise HTTPException(409, "domain_taken")
        day = now() - datetime.timedelta(days=1)
        # The same website again within a day: the run it already has, not a second one to pay for
        again = db.scalar(select(FirstRun).where(FirstRun.user_id == user.id, FirstRun.domain == domain, FirstRun.created_at > day, FirstRun.status != "failed").order_by(FirstRun.created_at.desc()))
        if again:
            return run_json(again)
        if _free_check_used(db, user):
            raise HTTPException(402, "free_check_used")
        if not settings.first_run_replay and _checks_today(db, user) >= settings.first_runs_a_day:
            raise HTTPException(429, "first_run_limit")
        # Reading is cheap, not free: an account may read a few websites more than it may check
        if (db.scalar(select(func.count()).select_from(FirstRun).where(FirstRun.user_id == user.id, FirstRun.created_at > day)) or 0) >= settings.first_runs_a_day * 5:
            raise HTTPException(429, "first_run_limit")
        run = FirstRun(user_id=user.id, domain=domain)
        db.add(run)
        db.commit()
        started = run_json(run)
    threading.Thread(target=work_prepare, args=(started["id"], domain, body.category, body.city, projects._country(body.country) or None, _words(body.name, 120) or None), daemon=True).start()
    return started


def _words(value: Any, limit: int = 300) -> str:
    return " ".join(str(value or "").split())[:limit]


def draft_json(run: FirstRun) -> Dict[str, Any]:
    """The draft as the setup's steps show it."""
    draft = run.draft or {}
    who = draft.get("who") or {}
    return {
        "id": run.id,
        "domain": draft.get("own") or run.domain,
        "name": who.get("name") or "",
        "aliases": who.get("aliases") or [],
        "category": who.get("category") or "",
        "country": draft.get("country") or "UZ",
        "city": who.get("city") or "",
        "description": who.get("description") or "",
        "services": who.get("services") or [],
        "competitors": [{"name": rival["name"], "aliases": [], "domain": rival.get("domain") or "", "logo": rival.get("logo")} for rival in who.get("competitors") or []],
        "questions": who.get("questions") or [],
        "brandQuestions": draft.get("brandQuestions") or [],
        # How many customers' questions a first check asks
        "maxQuestions": settings.first_run_questions,
        "replayed": bool(draft.get("replayed")),
    }


@app.get("/first-runs/{run_id}/draft")
def first_run_draft(run_id: str, user: User = Depends(current_user)) -> Dict[str, Any]:
    run = own_run(run_id, user)
    if not run.draft:
        raise HTTPException(409, run.error or run.status)
    return draft_json(run)


class Confirmed(BaseModel):
    name: str
    aliases: List[str] = []
    category: str = ""
    country: Optional[str] = None
    city: str = ""
    description: str = ""
    services: List[str] = []
    competitors: List[Dict[str, Any]] = []
    prompts: List[Dict[str, Any]] = []
    brandQuestions: List[Dict[str, Any]] = []


@app.post("/first-runs/{run_id}/start", status_code=202)
def confirm_first_run(run_id: str, body: Confirmed, user: User = Depends(current_user)) -> Dict[str, Any]:
    """The owner has corrected the draft: the check itself starts, on what they confirmed."""
    run = own_run(run_id, user)
    if run.status != "ready":
        # Pressed twice, or the page reloaded: the check that is running or done
        if run.status in CHECKED:
            return run_json(run)
        raise HTTPException(409, run.error or run.status)
    draft = run.draft or {}
    language = lambda value: value if value in firstrun.QUESTION_LANGUAGES else "ru"  # noqa: E731
    name = _words(body.name, 120)
    prompts: List[Dict[str, str]] = []
    for given in body.prompts:
        text = _words(given.get("text"))
        if len(text) >= 5 and all(text.lower() != kept["text"].lower() for kept in prompts):
            prompts.append({"text": text, "language": language(given.get("language")), "topic": _words(given.get("topic"), 60) or "other"})
    if not name:
        raise HTTPException(422, "name_required")
    if not prompts:
        raise HTTPException(422, "no_questions")
    if len(prompts) > settings.first_run_questions:
        raise HTTPException(422, "too_many_questions")
    competitors: List[Dict[str, Any]] = []
    for given in body.competitors:
        rival = _words(given.get("name"), 120)
        if rival and rival.lower() != name.lower() and all(rival.lower() != kept["name"].lower() for kept in competitors):
            competitors.append({"name": rival, "aliases": [_words(alias, 120) for alias in given.get("aliases") or [] if _words(alias, 120)], "domain": firstrun.web.domain_of(str(given.get("domain") or "").strip()) if given.get("domain") else ""})
    brand_questions: List[Dict[str, str]] = []
    for given in body.brandQuestions:
        text = _words(given.get("text"))
        if len(text) >= 5 and all(text.lower() != kept["text"].lower() for kept in brand_questions):
            brand_questions.append({"text": text, "language": language(given.get("language"))})
    confirmed = {
        "name": name,
        "aliases": [_words(alias, 120) for alias in body.aliases if _words(alias, 120)],
        "category": _words(body.category, 120),
        "country": projects._country(body.country) or draft.get("country") or "UZ",
        "city": _words(body.city, 120),
        "description": _words(body.description, 600),
        "services": [_words(service, 120) for service in body.services if _words(service, 120)],
        "competitors": competitors[: firstrun.COMPETITOR_LIMIT],
        "prompts": prompts,
        "brandQuestions": brand_questions[: firstrun.BRAND_QUESTION_LIMIT],
    }
    with SessionLocal() as db:
        if not settings.first_run_replay and _checks_today(db, user) >= settings.first_runs_a_day:
            raise HTTPException(429, "first_run_limit")
        if _free_check_used(db, user, run_id):
            raise HTTPException(402, "free_check_used")
        found = db.get(FirstRun, run_id)
        # Taken here, in one transaction, so two presses start one check
        if found is None or found.status != "ready":
            return run_json(found or run)
        found.status, found.answered, found.total = "asking", 0, 0
        db.commit()
        started = run_json(found)
    threading.Thread(target=work_check, args=(run_id, draft, confirmed, run.cost_usd or 0.0), daemon=True).start()
    return started


@app.get("/first-runs")
def first_runs(user: User = Depends(current_user)) -> Any:
    """The account's first runs, newest first: after login the frontend goes on from the latest."""
    with SessionLocal() as db:
        return [run_json(run) for run in db.scalars(select(FirstRun).where(FirstRun.user_id == user.id).order_by(FirstRun.created_at.desc()).limit(20))]


def own_run(run_id: str, user: User) -> FirstRun:
    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        if run is None or run.user_id != user.id:
            raise HTTPException(404, "not_found")
        return run


@app.get("/first-runs/{run_id}")
def first_run_progress(run_id: str, user: User = Depends(current_user)) -> Dict[str, Any]:
    return run_json(own_run(run_id, user))


@app.get("/first-runs/{run_id}/result")
def first_run_result(run_id: str, user: User = Depends(current_user)) -> Any:
    run = own_run(run_id, user)
    if run.status != "done":
        raise HTTPException(409, run.error or run.status)
    return run.result


# --- projects ------------------------------------------------------------------------------------------
# A first run saved as a project, what the dashboard's pages read, and what their buttons change. The weekly
# check itself is `app/weekly.py`, started by the server's timer.


def in_project(work: Any) -> Any:
    """Runs `work(db)` and turns a ProjectError into its HTTP answer."""
    try:
        with SessionLocal() as db:
            done = work(db)
            db.commit()
            return done
    except projects.ProjectError as error:
        raise HTTPException(error.status, error.code) from error


@app.get("/projects")
def list_projects(user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: [projects.project_json(db, project) for project in db.scalars(select(Project).where(Project.user_id == user.id).order_by(Project.created_at))])


@app.post("/projects")
def create_project(body: Dict[str, Any] = Body(...), user: User = Depends(current_user)) -> Any:
    def work(db: Any) -> Dict[str, Any]:
        project, run_id = projects.create(db, user, body)
        if run_id:
            fixes.sync(db, project)
        return {"project": projects.project_json(db, project), "runId": run_id}

    made = in_project(work)
    if made["runId"]:
        # The cited pages are read after the answer is sent: who each names, and whether the client is on them
        threading.Thread(target=fixes.after_creation, args=(made["project"]["id"], made["runId"]), daemon=True).start()
    return made


@app.get("/projects/{project_id}")
def get_project(project_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: projects.project_json(db, projects.own(db, user, project_id)))


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, user: User = Depends(current_user)) -> None:
    """Removes the project with its checks and answers; its website is then free for a new project."""
    in_project(lambda db: projects.delete(db, projects.own(db, user, project_id)))


@app.get("/projects/{project_id}/prompts")
def get_prompts(project_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: [projects.prompt_json(prompt) for prompt in projects.prompts_of(db, projects.own(db, user, project_id).id)])


# The report is read without login: its page is the link a client shares (`/projects/{id}/report`), and the
# server prints the same page as a PDF. The project's id, 32 random characters, is what the link's holder knows.
@app.get("/projects/{project_id}/report")
def get_report(project_id: str, language: Optional[str] = None, topic: Optional[str] = None, engine: Optional[str] = None) -> Any:
    return in_project(lambda db: projects.report(db, projects.shared(db, project_id), language=language, topic=topic, engine=engine))


@app.get("/projects/{project_id}/prompts/{prompt_id}/report")
def get_prompt_report(project_id: str, prompt_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: projects.report(db, projects.own(db, user, project_id), prompt_id=prompt_id))


@app.get("/projects/{project_id}/reports/{run_id}")
def get_run_report(project_id: str, run_id: str) -> Any:
    return in_project(lambda db: projects.report(db, projects.shared(db, project_id), run_id=run_id))


@app.get("/projects/{project_id}/reports/{run_id}/pdf")
def get_report_pdf(project_id: str, run_id: str, lang: str = "uz", user: User = Depends(current_user)) -> Response:
    """The run's report as a PDF, printed from the report's own page."""
    in_project(lambda db: projects.report(db, projects.own(db, user, project_id), run_id=run_id) and None)
    try:
        printed = delivery.pdf(project_id, run_id, lang if lang in ("uz", "ru", "en") else "uz")
    except delivery.DeliveryError as error:
        raise HTTPException(503, error.args[0]) from error
    return Response(printed, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="geo-report-{run_id[:8]}.pdf"'})


@app.get("/projects/{project_id}/topics")
def get_topics(project_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: projects.topics(db, projects.own(db, user, project_id)))


@app.get("/projects/{project_id}/tags")
def get_tags(project_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: projects.tags(db, projects.own(db, user, project_id)))


# Nothing is kept for these yet; an empty answer lets their pages open on a real project
@app.get("/projects/{project_id}/prompt-suggestions")
def nothing_yet(project_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: [] if projects.own(db, user, project_id) else [])


@app.get("/projects/{project_id}/actions")
def get_actions(project_id: str) -> Any:
    """Read without login, like the report: the report lists its recommendations."""
    return in_project(lambda db: fixes.listed(db, projects.shared(db, project_id)))


Json = Dict[str, Any]


def changed(user: User, project_id: str, change: Any, answer: Any = None) -> Any:
    """Makes a change to the user's own project; answers with `answer(db, project)`, or with the project."""

    def work(db: Any) -> Any:
        project = projects.own(db, user, project_id)
        made = change(db, project)
        db.flush()
        return answer(db, project) if answer else made if made is not None else projects.project_json(db, project)

    return in_project(work)


@app.patch("/projects/{project_id}")
def update_project(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.update_project(db, project, body))


@app.post("/projects/{project_id}/competitors")
def add_competitor(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.add_competitor(db, project, body))


@app.patch("/projects/{project_id}/competitors/{brand_id}")
def update_competitor(project_id: str, brand_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.update_competitor(db, project, brand_id, body))


@app.delete("/projects/{project_id}/competitors/{brand_id}")
def remove_competitor(project_id: str, brand_id: str, user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.remove_competitor(db, project, brand_id))


@app.patch("/projects/{project_id}/untracked-brands", status_code=204)
def dismiss_brand(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> None:
    changed(user, project_id, lambda db, project: projects.dismiss_brand(db, project, body))


@app.post("/projects/{project_id}/prompts")
def add_prompts(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.add_prompts(db, project, body))


@app.patch("/projects/{project_id}/prompts")
def update_prompts(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.update_prompts(db, project, body))


@app.put("/projects/{project_id}/prompts/{prompt_id}")
def update_prompt(project_id: str, prompt_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.update_prompt(db, project, prompt_id, body))


@app.patch("/projects/{project_id}/prompts/{prompt_id}")
def archive_prompt(project_id: str, prompt_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.update_prompts(db, project, {"ids": [prompt_id], "archived": bool(body.get("archived"))})[0])


@app.post("/projects/{project_id}/topics")
def add_topic(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.add_topic(db, project, body))


@app.patch("/projects/{project_id}/topics/{topic}")
def rename_topic(project_id: str, topic: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.rename_topic(db, project, topic, body))


@app.delete("/projects/{project_id}/topics/{topic}", status_code=204)
def delete_topic(project_id: str, topic: str, user: User = Depends(current_user)) -> None:
    changed(user, project_id, lambda db, project: projects.delete_topic(db, project, topic))


@app.post("/projects/{project_id}/tags")
def add_tags(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.add_tags(db, project, body))


@app.patch("/projects/{project_id}/tags/{tag}")
def rename_tag(project_id: str, tag: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.rename_tag(db, project, tag, body))


@app.delete("/projects/{project_id}/tags/{tag}", status_code=204)
def delete_tag(project_id: str, tag: str, user: User = Depends(current_user)) -> None:
    changed(user, project_id, lambda db, project: projects.delete_tag(db, project, tag))


@app.patch("/projects/{project_id}/actions")
def update_actions(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: fixes.update_many(db, project, body))


@app.post("/projects/{project_id}/actions")
def add_content_action(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: fixes.add_content(db, project, body))


@app.patch("/projects/{project_id}/actions/{action_id}")
def update_action(project_id: str, action_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: fixes.update(db, project, action_id, body))


@app.get("/projects/{project_id}/facts")
def get_facts(project_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: list(projects.own(db, user, project_id).facts or []))


@app.put("/projects/{project_id}/facts")
def set_facts(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.set_facts(db, project, body))


@app.get("/projects/{project_id}/report-settings")
def get_report_settings(project_id: str, user: User = Depends(current_user)) -> Any:
    return in_project(lambda db: projects.report_settings(projects.own(db, user, project_id)))


@app.patch("/projects/{project_id}/report-settings")
def set_report_settings(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> Any:
    return changed(user, project_id, lambda db, project: projects.set_report_settings(db, project, body))


@app.post("/projects/{project_id}/plan-requests", status_code=204)
def request_plan(project_id: str, body: Json = Body(...), user: User = Depends(current_user)) -> None:
    """Billing doesn't exist: the request is written to the log and emailed to us, and we change the plan by hand
    (`python -m app.admin plan <project id> <plan>`)."""

    def work(db: Any) -> None:
        project = projects.own(db, user, project_id)
        brand = db.scalar(select(Brand).where(Brand.project_id == project.id, Brand.own.is_(True)))
        plan, cycle = str(body.get("plan") or "")[:20], str(body.get("cycle") or "same cycle")[:20]
        print(f"PLAN REQUEST: project {project.id}, account {user.id}: {plan} ({cycle})")
        if settings.own_email:
            message = EmailMessage()
            message["Subject"] = f"GEO: plan request — {plan}"
            message.set_content(f"Account: {user.email}\nProject: {brand.name if brand else '?'} ({brand.domain if brand else '?'})\nProject id: {project.id}\nNow: {project.plan}, {'paid' if project.paid else 'trial'}\nAsked for: {plan} ({cycle})\n\nTo switch it on: python -m app.admin plan {project.id} <start|business|agency>\n")
            try:
                mail.send(settings.smtp_from or settings.smtp_user or "", message)
            except (OSError, smtplib.SMTPException) as error:
                print(f"plan request email failed: {error!r}")

    in_project(work)


@app.get("/members")
def get_members(user: User = Depends(current_user)) -> Any:
    def work(db: Any) -> Any:
        ids = list(db.scalars(select(Project.id).where(Project.user_id == user.id)))
        return [{"id": user.id, "name": user.name, "phone": None, "telegramUsername": None, "role": "owner", "status": "active", "projectIds": ids}]

    return in_project(work)


@app.get("/runs/{run_id}/progress")
def run_progress(run_id: str, user: User = Depends(current_user)) -> Any:
    def work(db: Any) -> Dict[str, Any]:
        run = db.get(Run, run_id)
        if run is None:
            raise projects.ProjectError(404, "not_found")
        projects.own(db, user, run.project_id)
        return {"id": run.id, "projectId": run.project_id, "status": run.status, "answered": run.answered, "total": run.total}

    return in_project(work)


# --- the landing page's form ------------------------------------------------------------------------

DEMO_SECTORS = ("clinic", "real_estate", "education", "retail", "other")


class DemoBody(BaseModel):
    name: str
    phone: str
    sector: str


def tell_team(request: Dict[str, str]) -> None:
    """Emails a new demo request to the team's own inbox (the account that sends the login codes)."""
    if not settings.own_email:
        return
    message = EmailMessage()
    message["Subject"] = f"GEO: demo — {request['name']}"
    message.set_content(f"Ism / Имя / Name: {request['name']}\nTelefon / Телефон / Phone: {request['phone']}\nSoha / Сфера / Field: {request['sector']}\n")
    try:
        mail.send(settings.smtp_from or settings.smtp_user or "", message)
    except (OSError, smtplib.SMTPException) as error:
        print(f"demo request email failed: {error!r}")


@app.post("/demo-requests", status_code=204)
def demo_request(body: DemoBody) -> None:
    """"Book a demo": kept, written to the log and emailed to the team. No login: the visitor has no account yet."""
    name = body.name.strip()[:120]
    phone = re.sub(r"[^\d+]", "", body.phone)
    if not name or not re.fullmatch(r"\+998\d{9}", phone) or body.sector not in DEMO_SECTORS:
        raise HTTPException(422, "bad_request")
    with SessionLocal() as db:
        # One a phone in ten minutes: a second click, or someone filling the form in a loop
        recent = db.scalar(select(DemoRequest).where(DemoRequest.phone == phone, DemoRequest.created_at > now() - datetime.timedelta(minutes=10)))
        if recent:
            return
        db.add(DemoRequest(name=name, phone=phone, sector=body.sector))
        db.commit()
    print(f"DEMO REQUEST: {name}, {phone}, {body.sector}")
    threading.Thread(target=tell_team, args=({"name": name, "phone": phone, "sector": body.sector},), daemon=True).start()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "engines": settings.engines, "replay": settings.first_run_replay, "login": settings.login}
