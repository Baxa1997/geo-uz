"""The API the frontend calls (`frontend/CLAUDE.md`, "API contract"), a slice at a time.

Built so far: login by a code sent to an email, and a new account's first run.

    uvicorn app.main:app --reload --port 8000      (from backend/, with its .venv active)
"""

from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import re
import secrets
import threading
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func, select

from . import firstrun
from .config import settings
from .db import FirstRun, LoginCode, Session, SessionLocal, User, create_tables, now

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
        db.merge(LoginCode(email=email, code_hash=digest(code), expires_at=now() + datetime.timedelta(minutes=CODE_MINUTES), sent_at=now(), attempts=0))
        db.commit()
    # Development only: no email is sent, the code is in the server's log
    print(f"LOGIN CODE for {email}: {code}")
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
    category: Optional[str] = None
    city: Optional[str] = None


def run_json(run: FirstRun) -> Dict[str, Any]:
    return {"id": run.id, "domain": run.domain, "status": run.status, "answered": run.answered, "total": run.total, "error": run.error}


def work(run_id: str, domain: str, category: Optional[str], city: Optional[str]) -> None:
    """Does a first run outside the request that started it, writing its progress as it goes."""

    def progress(status: str, answered: int, total: int) -> None:
        with SessionLocal() as db:
            run = db.get(FirstRun, run_id)
            if run:
                run.status, run.answered, run.total = status, answered, total
                db.commit()

    try:
        snapshot, raw, cost = firstrun.run(domain, category, city, progress)
        outcome: Dict[str, Any] = {"status": "done", "result": {"id": run_id, **snapshot}, "raw": raw, "cost_usd": cost}
    except firstrun.FirstRunError as error:
        outcome = {"status": "failed", "error": error.code}
    except Exception as error:  # a run must never stay "asking" for ever
        print(f"first run {run_id} failed: {error!r}")
        outcome = {"status": "failed", "error": "internal"}
    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        if run:
            for key, value in outcome.items():
                setattr(run, key, value)
            run.finished_at = now()
            db.commit()


@app.post("/first-runs", status_code=202)
def start_first_run(body: FirstRunRequest, user: User = Depends(current_user)) -> Dict[str, Any]:
    """Starts a first run for a website and returns at once; the frontend then asks for its progress."""
    try:
        domain = firstrun.normalize(body.domain)
    except firstrun.FirstRunError as error:
        raise HTTPException(422, error.code) from error
    with SessionLocal() as db:
        day = now() - datetime.timedelta(days=1)
        # The same website again within a day: the run it already has, not a second one to pay for
        again = db.scalar(select(FirstRun).where(FirstRun.user_id == user.id, FirstRun.domain == domain, FirstRun.created_at > day, FirstRun.status != "failed").order_by(FirstRun.created_at.desc()))
        if again:
            return run_json(again)
        if (db.scalar(select(func.count()).select_from(FirstRun).where(FirstRun.user_id == user.id, FirstRun.created_at > day)) or 0) >= settings.first_runs_a_day:
            raise HTTPException(429, "first_run_limit")
        run = FirstRun(user_id=user.id, domain=domain)
        db.add(run)
        db.commit()
        started = run_json(run)
    threading.Thread(target=work, args=(started["id"], domain, body.category, body.city), daemon=True).start()
    return started


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


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "engines": settings.engines, "login": "supabase" if settings.supabase_login else "development"}
