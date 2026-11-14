"""Settings, read from the environment and from `backend/.env` (never committed).

Locally nothing has to be set: the database is a file beside the code, login codes are printed to the
server's log, and only the assistants whose keys exist are asked. On the server, `DATABASE_URL` points at
Supabase's Postgres and `SUPABASE_URL` + `SUPABASE_ANON_KEY` turn on Supabase's email login.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

BACKEND = Path(__file__).resolve().parent.parent


def _load(path: Path) -> None:
    """KEY=value lines into the environment; what is already set wins."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load(BACKEND / ".env")
_load(BACKEND / "pilot" / ".env")  # the pilot script's key, so one file is enough on this computer


@dataclass(frozen=True)
class Settings:
    database_url: str = field(default_factory=lambda: os.environ.get("DATABASE_URL", f"sqlite:///{BACKEND / 'local.db'}"))
    # Where the frontend runs: the only origin allowed to call with the session cookie
    frontend_origin: str = field(default_factory=lambda: os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"))
    # Supabase's email login; without them the backend makes and checks the codes itself (development)
    supabase_url: Optional[str] = field(default_factory=lambda: os.environ.get("SUPABASE_URL"))
    supabase_anon_key: Optional[str] = field(default_factory=lambda: os.environ.get("SUPABASE_ANON_KEY"))
    openai_key: Optional[str] = field(default_factory=lambda: os.environ.get("OPENAI_API_KEY"))
    gemini_key: Optional[str] = field(default_factory=lambda: os.environ.get("GEMINI_API_KEY"))
    # The models that answer customers' questions, and the one that reads the answers
    chatgpt_model: str = field(default_factory=lambda: os.environ.get("CHATGPT_MODEL", "gpt-6.1-terra"))
    gemini_model: str = field(default_factory=lambda: os.environ.get("GEMINI_MODEL", "gemini-4-hydrogen"))
    read_model: str = field(default_factory=lambda: os.environ.get("READ_MODEL", "gpt-6.1-terra"))
    # The first run a new account gets: questions, each asked once to every assistant
    first_run_questions: int = field(default_factory=lambda: int(os.environ.get("FIRST_RUN_QUESTIONS", "10")))
    # A first run costs real money: how many one account may start in a day
    first_runs_a_day: int = field(default_factory=lambda: int(os.environ.get("FIRST_RUNS_A_DAY", "3")))
    session_days: int = 30
    # Cookies go over HTTPS only on the server
    secure_cookies: bool = field(default_factory=lambda: os.environ.get("SECURE_COOKIES", "false") == "true")

    @property
    def supabase_login(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def engines(self) -> List[str]:
        """The assistants that can be asked now: those with a key."""
        return [name for name, key in (("chatgpt", self.openai_key), ("gemini", self.gemini_key)) if key]


settings = Settings()
