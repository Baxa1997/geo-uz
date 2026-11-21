"""The tables, for SQLite on this computer and Supabase's Postgres on the server (the same models).

People, their sessions and login codes, first runs, and projects with their brands, questions, runs and
answers, the slot log of every check and the cited sites' types (since 21 Nov 2026). The rest of `backend/PLAN.md`'s data model
(suggestions, actions, wrong facts) comes with the pages that need it.
"""

from __future__ import annotations

import datetime
import time
import uuid
from typing import Any, Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine, event, exc, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import settings


def now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def new_id() -> str:
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    # Supabase's user id when Supabase does the login, our own otherwise
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)


class Session(Base):
    """The `geo_session` cookie holds the token; only its hash is stored."""

    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime)


class LoginCode(Base):
    """A six-digit code sent to an email. Used only when Supabase isn't doing the login."""

    __tablename__ = "login_codes"
    email: Mapped[str] = mapped_column(String(320), primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime)
    sent_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    attempts: Mapped[int] = mapped_column(Integer, default=0)


class FirstRun(Base):
    """A new account's first look: a website in, both assistants asked, the first statistics out."""

    __tablename__ = "first_runs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    domain: Mapped[str] = mapped_column(String(255), index=True)
    # queued, reading_site, ready (read, waiting for the owner to confirm), asking, reading_answers, done, failed
    status: Mapped[str] = mapped_column(String(20), default="queued")
    # While the check runs: what the answers in hand say (`firstrun.partial_of`), for the page to show at once
    partial: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    # What the website gave (`firstrun.prepare`): the profile, competitors and questions the owner corrects
    draft: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    answered: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # The Snapshot the frontend draws, once done
    result: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    # What it cost us, in US dollars, and the raw answers, kept because the reading rules will change
    cost_usd: Mapped[Optional[float]] = mapped_column(nullable=True)
    raw: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, index=True)
    finished_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

class DemoRequest(Base):
    """"Book a demo" on the landing page: who asked, how to reach them, their field. The team is told by email."""

    __tablename__ = "demo_requests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    sector: Mapped[str] = mapped_column(String(20))
    # What is asked for when it isn't a demo, e.g. "First Audit · <brand> · snapshot <id>" (since 21 Nov 2026)
    about: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, index=True)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(200), default="")
    city: Mapped[str] = mapped_column(String(200), default="")
    # Two-letter country code; empty on projects made before countries: Uzbekistan
    country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    services: Mapped[Any] = mapped_column(JSON, default=list)
    customers: Mapped[Any] = mapped_column(JSON, default=list)
    identity: Mapped[Any] = mapped_column(JSON, default=list)
    plan: Mapped[str] = mapped_column(String(20), default="start")
    # Whether the plan is paid for. Not yet: the account's free first check is all it has, and no further
    # check is made (the user's decision, 15 Nov 2026). We switch it on by hand: `python -m app.admin`.
    paid: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # The four checks of the client's website, as the first run found them
    site_checks: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    # The questions that name the business, asked beside the customers' ones: [{"text", "language"}]
    brand_questions: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    first_run_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    # Topics and tags that no question carries yet, the untracked brands the client hid, the brand's facts,
    # and where the report goes: small lists the pages edit as a whole
    topics: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    tags: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    dismissed: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    facts: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    report_settings: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, index=True)


class Brand(Base):
    """The client's own brand (position 0) and the competitors it tracks, in a fixed order: the order is a brand's chart color."""

    __tablename__ = "brands"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    own: Mapped[bool] = mapped_column(Boolean, default=False)
    name: Mapped[str] = mapped_column(String(200))
    aliases: Mapped[Any] = mapped_column(JSON, default=list)
    domain: Mapped[str] = mapped_column(String(255), default="")
    # The address of the icon its website names, found when the competitor was searched for; none for most brands
    logo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)


class Prompt(Base):
    __tablename__ = "prompts"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(2))
    topic: Mapped[str] = mapped_column(String(200), default="")
    location: Mapped[str] = mapped_column(String(200), default="")
    fact_check: Mapped[bool] = mapped_column(Boolean, default=True)
    tags: Mapped[Any] = mapped_column(JSON, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    archived_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)


class Run(Base):
    """One check of a project: every tracked question asked. `first` is the account's first run, saved as a project."""

    __tablename__ = "runs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="weekly")
    # queued, running, analyzing, done, failed
    status: Mapped[str] = mapped_column(String(20), default="queued")
    answered: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    # The `ReportMethod` the frontend shows: assistants, models, web search, samples
    method: Mapped[Any] = mapped_column(JSON, default=dict)
    # Cited site -> {"type", "brandListed"}, as found when the run read the cited pages
    sources: Mapped[Any] = mapped_column(JSON, default=dict)
    # What it cost us, in US dollars, and why it failed
    cost_usd: Mapped[Optional[float]] = mapped_column(nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Whether this run's answers were checked against the client's facts: an empty list of wrong facts
    # means "none found" only then
    facts_checked: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # What each assistant said of the business when asked by name, as `firstrun.brand_view` gives it
    brand_view: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    collected_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, index=True)


class Action(Base):
    """A recommended fix. `key` says what it is about ("listing:2gis.uz") and never changes, so a later check
    finds the same row and the client's status on it is kept."""

    __tablename__ = "actions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    key: Mapped[str] = mapped_column(String(400), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    # The kind's own fields, as the frontend's `Action` names them
    details: Mapped[Any] = mapped_column(JSON, default=dict)
    impact: Mapped[str] = mapped_column(String(10), default="medium")
    prompt_ids: Mapped[Any] = mapped_column(JSON, default=list)
    # new, in_progress, done, declined
    status: Mapped[str] = mapped_column(String(20), default="new")
    steps_done: Mapped[Any] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    done_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)


class WrongFact(Base):
    """Something an assistant states about the client that contradicts one of the client's own facts, or,
    from a brand question, its own website (`prompt_id` is then empty and `details` holds the rest)."""

    __tablename__ = "wrong_facts"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    claim: Mapped[str] = mapped_column(Text)
    correct: Mapped[str] = mapped_column(Text)
    prompt_id: Mapped[str] = mapped_column(String(32))
    first_run_id: Mapped[str] = mapped_column(String(32))
    last_run_id: Mapped[str] = mapped_column(String(32))
    # From a brand answer: {"claim": {uz, ru, en}, "correct": {uz, ru, en}, "question", "engine"}
    details: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)


class Answer(Base):
    __tablename__ = "answers"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    model: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    prompt_id: Mapped[str] = mapped_column(ForeignKey("prompts.id"), index=True)
    sample: Mapped[int] = mapped_column(Integer, default=1)
    engine: Mapped[str] = mapped_column(String(20), default="chatgpt")
    text: Mapped[str] = mapped_column(Text)
    searches: Mapped[Any] = mapped_column(JSON, default=list)


class Mention(Base):
    """A business an answer names. `brand_id` is empty for one the project doesn't track: the "new competitor" list."""

    __tablename__ = "mentions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    answer_id: Mapped[str] = mapped_column(ForeignKey("answers.id"), index=True)
    brand_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    name: Mapped[str] = mapped_column(String(300))
    position: Mapped[int] = mapped_column(Integer)
    tone: Mapped[str] = mapped_column(String(10), default="neutral")
    recommended: Mapped[bool] = mapped_column(Boolean, default=False)


class Citation(Base):
    __tablename__ = "citations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    answer_id: Mapped[str] = mapped_column(ForeignKey("answers.id"), index=True)
    url: Mapped[str] = mapped_column(Text)
    domain: Mapped[str] = mapped_column(String(255))
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Slot(Base):
    """One call a check plans to an assistant (report spec §6.1): which question, which assistant, which run of
    it, with what settings, and what came of it. Written before anything is asked, every call left out too
    (status `excluded`, with why), and closed when its answer comes or fails. A first run's slots carry
    `first_run_id` and get `run_id` when the run becomes a project's first check (`projects._save_first_run`)."""

    __tablename__ = "slots"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    run_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    first_run_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    # The project's question once there is one; a first run's questions are only their place in its list
    prompt_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    question_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # The wording asked: a brand question has no row of its own, and a question's text may change later
    question: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(2))
    # discovery (a customer's question) or branded (a question that names the business)
    prompt_group: Mapped[str] = mapped_column(String(12), default="discovery")
    engine: Mapped[str] = mapped_column(String(20))
    run_index: Mapped[int] = mapped_column(Integer, default=1)
    # planned, completed, failed, excluded
    status: Mapped[str] = mapped_column(String(12), default="planned")
    # Why it failed or was left out, as a code the pages put into words (`slots.REASONS`), and the error itself
    reason: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    model: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    # api_web_search (ChatGPT's search tool) or api_grounded (Gemini with Google Search)
    surface: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # What the call was told of where the customer is: {"country", "city", "timezone", "set", "how"}
    location: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    # Whether the answer came with a web search behind it
    searched: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    answer_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    cost_usd: Mapped[Optional[float]] = mapped_column(nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    finished_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)



class DomainType(Base):
    """A cited site's type (report spec §4.6) as a person reviewed it (`founder-reviewed`, for one project or
    every project) or as the AI read it at the end of a check (`automated`, for that project). The seed list and
    the project's own sites are in `domains.py`, not here (Phase 0 item 0.4)."""

    __tablename__ = "domain_types"
    __table_args__ = (UniqueConstraint("domain", "project_id", "review"),)
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    domain: Mapped[str] = mapped_column(String(253), index=True)
    # None: a review that holds for every project
    project_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    # One of `domains.TYPES`
    type: Mapped[str] = mapped_column(String(20))
    # How a business gets onto the site, {"how", "url"}: only from a review by hand, never from the AI
    route: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    review: Mapped[str] = mapped_column(String(20))
    model: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    # The AI's reason, in a few words
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

_SQLITE = settings.database_url.startswith("sqlite")
# Every statement is a round trip to the database, which on the server is far away (Supabase's region, 17 Nov
# 2026: about 0.12 s each, and 2 s to open a connection). So the pool keeps its connections open (TCP
# keepalives stop them going stale behind a router) and checks one only when it has rested a while, not before
# every request as `pool_pre_ping` did: that was a round trip on each.
engine = create_engine(
    settings.database_url,
    pool_size=8,
    max_overflow=8,
    connect_args={"check_same_thread": False} if _SQLITE else {"keepalives": 1, "keepalives_idle": 30, "keepalives_interval": 10, "keepalives_count": 3},
)
IDLE_CHECK_SECONDS = 120


@event.listens_for(engine, "checkin")
def _rested(dbapi_connection: Any, record: Any) -> None:
    record.info["rested_at"] = time.monotonic()


@event.listens_for(engine, "checkout")
def _still_open(dbapi_connection: Any, record: Any, proxy: Any) -> None:
    """A connection that rested long is tried before use; a dead one is replaced (the pool retries)."""
    rested = record.info.get("rested_at")
    if _SQLITE or rested is None or time.monotonic() - rested < IDLE_CHECK_SECONDS:
        return
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("select 1")
        cursor.close()
        dbapi_connection.rollback()
    except Exception as error:
        raise exc.DisconnectionError() from error


SessionLocal = sessionmaker(engine, expire_on_commit=False)
# For requests that only read: no BEGIN and ROLLBACK around them, two round trips fewer. Same pool.
ReadSession = sessionmaker(engine if _SQLITE else engine.execution_options(isolation_level="AUTOCOMMIT"), expire_on_commit=False)


def create_tables() -> None:
    Base.metadata.create_all(engine)
    # A column added to a table that exists already: `create_all` makes new tables only. Every such column
    # is nullable, so adding it is safe on a database with rows.
    existing = inspect(engine)
    with engine.begin() as db:
        for table in Base.metadata.sorted_tables:
            have = {column["name"] for column in existing.get_columns(table.name)}
            for column in table.columns:
                if column.name not in have:
                    db.execute(text(f'alter table "{table.name}" add column "{column.name}" {column.type.compile(engine.dialect)}'))
    if engine.dialect.name == "postgresql":
        # Supabase serves every table of the public schema through its own API to anyone holding the
        # project's public key, unless the table is locked. Only this service may read ours (it connects
        # as the database's owner, which the lock doesn't bind): lock each one, every start, new ones too.
        with engine.begin() as db:
            roles = {row[0] for row in db.execute(text("select rolname from pg_roles where rolname in ('anon', 'authenticated')"))}
            for table in Base.metadata.tables:
                db.execute(text(f'alter table public."{table}" enable row level security'))
                for role in roles:
                    db.execute(text(f'revoke all on public."{table}" from {role}'))
