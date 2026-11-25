"""The team's admin page (25 Nov 2026: the user asked for a super-admin login and a dashboard of the users, the brands
registered and the waiting list, approving a waiting check there, and their reports to read).

One login: a name and a password, the password kept only as a hash on the server (`ADMIN_USERNAME`,
`ADMIN_PASSWORD_HASH`, made by `python -m app.admin password`), never in the repository, which is public. Without both
the admin page is off and its routes answer 404. What it shows, read-only: the numbers, the accounts, the projects (the
brands registered) with the links to their reports, the free checks waiting and running. One thing it does: Approve,
which starts a waiting check at once, counted among the day's free checks even past their limit (the user's "Run now,
rest automatic": the queue's timer goes on as before), and emails its account the link when done, as the queue does.

The password chosen is short, so wrong ones are counted as the limits count (`limit_hits`): 5 an hour from one
connection, then 20 an hour from everyone, after which nobody may try until the hour has passed, and the team is emailed.
`python -m app.admin unlock` lifts it. A login is a cookie signed with the password's hash, for 12 hours: a new password
ends every session.
"""

from __future__ import annotations

import datetime
import hashlib
import hmac
import secrets
import threading
import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import func, select

from . import alerts, limits, queue
from .config import settings
from .db import Answer, Brand, FirstRun, LimitHit, Mention, Project, ReadSession, Run, Session, SessionLocal, User, now
from .projects import iso

COOKIE = "geo_admin"
SESSION_HOURS = 12
HOUR = datetime.timedelta(hours=1)
WEEK = datetime.timedelta(days=7)
# Wrong logins in an hour: from one connection, then from everyone (the login is then shut for the hour)
FAILS_PER_CONNECTION = 5
FAILS_FOR_EVERYONE = 20
FAIL = "admin_fail"
# PBKDF2 with SHA-256 at OWASP's count (2023): 0.65 s a try on the server
SCHEME = "pbkdf2_sha256"
ITERATIONS = 600_000
# A first check's stages: being read, waiting for its owner, in the queue, being asked, finished
PREPARING = ("queued", "reading_site", "ready")
RUNNING = ("asking", "reading_answers")
# Long enough for any name or password typed by hand
LONGEST = 200

router = APIRouter(prefix="/admin")


def hash_password(password: str, iterations: int = ITERATIONS) -> str:
    """The line kept as `ADMIN_PASSWORD_HASH`: the scheme, the count, a random salt and the key, joined by colons (no
    "$", which an environment file may read as a variable)."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"{SCHEME}:{iterations}:{salt.hex()}:{key.hex()}"


def password_ok(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt, key = stored.split(":")
        rounds = int(iterations)
        salt_bytes = bytes.fromhex(salt)
    except ValueError:
        return False
    if scheme != SCHEME or rounds < 1:
        return False
    tried = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, rounds)
    return hmac.compare_digest(tried.hex(), key)


def enabled() -> bool:
    return bool(settings.admin_username) and settings.admin_password_hash.startswith(SCHEME + ":")


def _signature(body: str) -> str:
    # Keyed by the password's hash, which only the server has: a new password ends every session
    key = hashlib.sha256(("seenova-admin:" + settings.admin_password_hash).encode("utf-8")).digest()
    return hmac.new(key, f"{settings.admin_username}.{body}".encode("utf-8"), hashlib.sha256).hexdigest()


def issue(moment: Optional[float] = None) -> str:
    """A login's cookie: when it ends, a random part, and the signature over both."""
    body = f"{int((moment if moment is not None else time.time()) + SESSION_HOURS * 3600)}.{secrets.token_urlsafe(12)}"
    return f"{body}.{_signature(body)}"


def valid(token: Optional[str], moment: Optional[float] = None) -> bool:
    if not token or not enabled():
        return False
    parts = token.split(".")
    if len(parts) != 3 or not parts[0].isdigit():
        return False
    if int(parts[0]) < (moment if moment is not None else time.time()):
        return False
    return hmac.compare_digest(parts[2], _signature(f"{parts[0]}.{parts[1]}"))


def current_admin(geo_admin: Optional[str] = Cookie(default=None)) -> str:
    if not enabled():
        raise HTTPException(404, "admin_off")
    if not valid(geo_admin):
        raise HTTPException(401, "not_admin")
    return settings.admin_username


def _fails(db: Any, ip: Optional[str] = None) -> int:
    query = select(func.count()).select_from(LimitHit).where(LimitHit.kind == FAIL, LimitHit.created_at > now() - HOUR)
    if ip is not None:
        query = query.where(LimitHit.key == ip)
    return db.scalar(query) or 0


def locked(db: Any, ip: str) -> bool:
    """Whether a login may not even be tried: too many wrong ones from this connection, or from everyone, this hour."""
    return _fails(db, ip) >= FAILS_PER_CONNECTION or _fails(db) >= FAILS_FOR_EVERYONE


class Login(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: Login, request: Request, response: Response) -> Dict[str, Any]:
    if not enabled():
        raise HTTPException(404, "admin_off")
    ip = limits.client_ip(request)
    with SessionLocal() as db:
        if locked(db, ip):
            raise HTTPException(429, "admin_locked")
        # Both are worked out every time, so a wrong name takes as long as a wrong password
        name_ok = hmac.compare_digest(body.username.strip()[:LONGEST].encode("utf-8"), settings.admin_username.encode("utf-8"))
        password_right = password_ok(body.password[:LONGEST], settings.admin_password_hash)
        if not (name_ok and password_right):
            limits.record(db, FAIL, ip)
            db.commit()
            if _fails(db) >= FAILS_FOR_EVERYONE:
                alerts.send("admin_locked", f"{FAILS_FOR_EVERYONE} wrong admin logins in an hour: the admin login is shut until the hour has passed (python -m app.admin unlock opens it). The last came from {ip}.")
            raise HTTPException(401, "wrong_login")
    response.set_cookie(COOKIE, issue(), max_age=SESSION_HOURS * 3600, httponly=True, samesite="lax", secure=settings.secure_cookies, path="/")
    return {"username": settings.admin_username}


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/")


@router.get("/me")
def me(admin: str = Depends(current_admin)) -> Dict[str, Any]:
    """Who is logged in, and how many checks wait: the menu's mark beside the waiting list."""
    with ReadSession() as db:
        waiting = db.scalar(select(func.count()).select_from(FirstRun).where(FirstRun.status == queue.WAITING)) or 0
    return {"username": admin, "waiting": waiting}


def _team(db: Any) -> Set[str]:
    """The team's accounts (`TEAM_EMAILS`): marked on the page, since their checks aren't counted in the day's limit."""
    if not settings.team_emails:
        return set()
    return set(db.scalars(select(User.id).where(func.lower(User.email).in_(settings.team_emails))))


def project_rows(db: Any, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """The projects, newest first: whose, what plan, its checks, and in its latest check how many buyer answers named it
    of all of them (the report's headline, counted here from the stored mentions)."""
    query = select(Project).order_by(Project.created_at.desc())
    found = db.scalars(query.limit(limit) if limit else query).all()
    if not found:
        return []
    ids = [project.id for project in found]
    owners = {user.id: user for user in db.scalars(select(User).where(User.id.in_({project.user_id for project in found})))}
    own = {brand.project_id: brand for brand in db.scalars(select(Brand).where(Brand.project_id.in_(ids), Brand.own.is_(True)))}
    done: Dict[str, List[Run]] = defaultdict(list)
    for run in db.scalars(select(Run).where(Run.project_id.in_(ids), Run.status == "done").order_by(Run.collected_at)):
        done[run.project_id].append(run)
    latest = {project_id: runs[-1] for project_id, runs in done.items()}
    latest_ids = [run.id for run in latest.values()]
    answers = dict(db.execute(select(Answer.run_id, func.count()).where(Answer.run_id.in_(latest_ids)).group_by(Answer.run_id)).all()) if latest_ids else {}
    named: Dict[str, Set[str]] = defaultdict(set)
    own_ids = {brand.id: project_id for project_id, brand in own.items()}
    if latest_ids and own_ids:
        for run_id, answer_id, brand_id in db.execute(select(Answer.run_id, Answer.id, Mention.brand_id).join(Mention, Mention.answer_id == Answer.id).where(Answer.run_id.in_(latest_ids), Mention.brand_id.in_(list(own_ids)))):
            if latest.get(own_ids[brand_id]) is not None and latest[own_ids[brand_id]].id == run_id:
                named[run_id].add(answer_id)
    team = _team(db)
    rows = []
    for project in found:
        brand, owner, last = own.get(project.id), owners.get(project.user_id), latest.get(project.id)
        rows.append({
            "id": project.id,
            "name": brand.name if brand else "",
            "domain": brand.domain if brand else "",
            "owner": owner.email if owner else None,
            "team": project.user_id in team,
            "createdAt": iso(project.created_at),
            "plan": project.plan,
            "paid": bool(project.paid),
            "billingStatus": project.billing_status,
            "country": project.country or "UZ",
            "checks": len(done.get(project.id, [])),
            "latestCheckAt": iso(last.collected_at) if last else None,
            "answers": answers.get(last.id, 0) if last else 0,
            "named": len(named.get(last.id, set())) if last else 0,
            "firstRunId": project.first_run_id,
        })
    return rows


def user_rows(db: Any, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """The accounts, newest first: their projects, their free check's state, and when they last logged in (a session lasts
    `session_days` from its login; unknown once they logged out)."""
    query = select(User).order_by(User.created_at.desc())
    found = db.scalars(query.limit(limit) if limit else query).all()
    if not found:
        return []
    ids = [user.id for user in found]
    owned: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for project_id, user_id, domain in db.execute(select(Project.id, Project.user_id, Brand.domain).join(Brand, (Brand.project_id == Project.id) & Brand.own.is_(True)).where(Project.user_id.in_(ids)).order_by(Project.created_at)):
        owned[user_id].append({"id": project_id, "domain": domain})
    checks: Dict[str, List[FirstRun]] = defaultdict(list)
    for run in db.scalars(select(FirstRun).where(FirstRun.user_id.in_(ids)).order_by(FirstRun.created_at)):
        checks[run.user_id].append(run)
    logins = dict(db.execute(select(Session.user_id, func.max(Session.expires_at)).where(Session.user_id.in_(ids)).group_by(Session.user_id)).all())
    team = _team(db)
    rows = []
    for user in found:
        last = checks[user.id][-1] if checks.get(user.id) else None
        expires = logins.get(user.id)
        rows.append({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "team": user.id in team,
            "createdAt": iso(user.created_at),
            "lastLoginAt": iso(expires - datetime.timedelta(days=settings.session_days)) if expires else None,
            "projects": owned.get(user.id, []),
            "firstChecks": len(checks.get(user.id, [])),
            "freeCheck": {"id": last.id, "domain": last.domain, "status": last.status, "at": iso(last.created_at)} if last else None,
        })
    return rows


@router.get("/overview")
def overview(admin: str = Depends(current_admin)) -> Dict[str, Any]:
    with ReadSession() as db:
        week_ago = now() - WEEK
        count = lambda model, *where: db.scalar(select(func.count()).select_from(model).where(*where)) or 0  # noqa: E731
        statuses = Counter(db.scalars(select(FirstRun.status)))
        spent = lambda *where: round(float(db.scalar(select(func.coalesce(func.sum(FirstRun.cost_usd), 0.0)).where(*where)) or 0.0), 2)  # noqa: E731
        plan_checks = round(float(db.scalar(select(func.coalesce(func.sum(Run.cost_usd), 0.0)).where(Run.kind == "weekly")) or 0.0), 2)
        return {
            "users": {"total": count(User), "week": count(User, User.created_at > week_ago)},
            "projects": {"total": count(Project), "week": count(Project, Project.created_at > week_ago)},
            "checksToday": limits.checks_today(db),
            "checksADay": settings.free_checks_a_day,
            "firstChecks": {
                "done": statuses.get("done", 0),
                "failed": statuses.get("failed", 0),
                "waiting": statuses.get(queue.WAITING, 0),
                "running": sum(statuses.get(status, 0) for status in RUNNING),
                "preparing": sum(statuses.get(status, 0) for status in PREPARING),
            },
            "cost": {"freeChecks": spent(), "freeChecksWeek": spent(FirstRun.created_at > week_ago), "planChecks": plan_checks},
            "latestProjects": project_rows(db, 5),
            "latestUsers": user_rows(db, 5),
        }


@router.get("/projects")
def all_projects(admin: str = Depends(current_admin)) -> List[Dict[str, Any]]:
    with ReadSession() as db:
        return project_rows(db)


@router.get("/users")
def all_users(admin: str = Depends(current_admin)) -> List[Dict[str, Any]]:
    with ReadSession() as db:
        return user_rows(db)


@router.get("/waiting")
def waiting_list(admin: str = Depends(current_admin)) -> Dict[str, Any]:
    """The queue in order, the checks being asked now, what a check costs and the day's count."""
    with ReadSession() as db:
        waiting = queue.waiting(db)
        running = db.scalars(select(FirstRun).where(FirstRun.status.in_(RUNNING)).order_by(FirstRun.created_at)).all()
        accounts = {user.id: user.email for user in db.scalars(select(User).where(User.id.in_({run.user_id for run in [*waiting, *running]})))} if waiting or running else {}
        team = _team(db)
        return {
            "waiting": [
                {
                    "id": run.id,
                    "place": place,
                    "domain": run.domain,
                    "email": accounts.get(run.user_id),
                    "team": run.user_id in team,
                    "since": iso(datetime.datetime.fromisoformat(queue.since(run))),
                    "language": (run.draft or {}).get("language") or "uz",
                    "name": ((run.draft or {}).get("confirmed") or {}).get("name") or "",
                    "questions": len(((run.draft or {}).get("confirmed") or {}).get("prompts") or []),
                }
                for place, run in enumerate(waiting, start=1)
            ],
            "running": [
                {"id": run.id, "domain": run.domain, "email": accounts.get(run.user_id), "status": run.status, "answered": run.answered, "total": run.total, "since": iso(run.created_at)}
                for run in running
            ],
            "checkUsd": queue.check_usd(db),
            "checksToday": limits.checks_today(db),
            "checksADay": settings.free_checks_a_day,
        }


def _ask(run_id: str, claimed: Tuple[Dict[str, Any], Dict[str, Any], float]) -> None:
    """The approved check, asked as the queue asks one, and emailed to its account when done."""
    from .main import work_check  # the check as the site asks it; imported here, since main imports this module

    started = time.time()
    work_check(run_id, *claimed)
    outcome = queue.status_of(run_id)
    emailed = outcome == "done" and queue.tell(run_id)
    print(f"admin: approved {run_id}: {outcome} in {time.time() - started:.0f}s{', emailed' if emailed else ''}")


@router.post("/waiting/{run_id}/approve", status_code=202)
def approve(run_id: str, admin: str = Depends(current_admin)) -> Dict[str, Any]:
    """Starts a waiting check now, whatever the day's count; 409 when it isn't waiting any more (the timer took it, or
    it was approved already), 404 when there is no such check."""
    claimed = queue.claim(run_id)
    if claimed is None:
        status = queue.status_of(run_id)
        raise HTTPException(404 if status == "missing" else 409, "not_found" if status == "missing" else "not_waiting")
    # Counted among the day's free checks, as one the timer asks is
    with SessionLocal() as db:
        db.add(LimitHit(kind="check", key="admin"))
        db.commit()
    threading.Thread(target=_ask, args=(run_id, claimed), daemon=True).start()
    return {"id": run_id, "status": "asking"}
