"""The tables, for SQLite on this computer and Supabase's Postgres on the server (the same models).

Only what the first slice needs: people, their sessions and login codes, and first runs. The rest of
`backend/PLAN.md`'s data model (projects, prompts, weekly runs) comes with the pages that need it.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, create_engine, text
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
    # queued, reading_site, asking, reading_answers, done, failed
    status: Mapped[str] = mapped_column(String(20), default="queued")
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


engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {})
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def create_tables() -> None:
    Base.metadata.create_all(engine)
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
