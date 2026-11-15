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
    # Our own login emails: with these set, this service makes the six-digit code and sends it itself
    # (Gmail: smtp.gmail.com, 465, the address, an app password). Supabase's own emails are then not used:
    # its dashboard kept sending the default sign-in link whatever the saved template said (15 Nov 2026).
    smtp_host: Optional[str] = field(default_factory=lambda: os.environ.get("SMTP_HOST"))
    smtp_port: int = field(default_factory=lambda: int(os.environ.get("SMTP_PORT", "465")))
    smtp_user: Optional[str] = field(default_factory=lambda: os.environ.get("SMTP_USER"))
    smtp_password: Optional[str] = field(default_factory=lambda: os.environ.get("SMTP_PASSWORD"))
    smtp_from: Optional[str] = field(default_factory=lambda: os.environ.get("SMTP_FROM"))
    openai_key: Optional[str] = field(default_factory=lambda: os.environ.get("OPENAI_API_KEY"))
    gemini_key: Optional[str] = field(default_factory=lambda: os.environ.get("GEMINI_API_KEY"))
    # The models that answer customers' questions, and the one that reads the answers
    chatgpt_model: str = field(default_factory=lambda: os.environ.get("CHATGPT_MODEL", "gpt-6.1-terra"))
    gemini_model: str = field(default_factory=lambda: os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"))
    # Gemini through Vertex AI (Google Cloud): the project, its location ("global" for Gemini 3 models) and a
    # credentials file named by GOOGLE_APPLICATION_CREDENTIALS, which Google's own library reads. With a
    # project set, Vertex is used and GEMINI_API_KEY is not.
    google_cloud_project: Optional[str] = field(default_factory=lambda: os.environ.get("GOOGLE_CLOUD_PROJECT"))
    google_cloud_location: str = field(default_factory=lambda: os.environ.get("GOOGLE_CLOUD_LOCATION", "global"))
    # The models that work for us, not the ones measured. READ_MODEL reads who an answer names, gathers a
    # business's spellings and checks facts; WRITE_MODEL writes a website's profile and questions, the first
    # check's conclusion and the briefs. Gemini's on Vertex when a Google Cloud project is set (the user's
    # decision, 15 Nov 2026), else OpenAI's. Reading is many calls at once, so it has the steadier model.
    read_model: str = field(default_factory=lambda: os.environ.get("READ_MODEL") or ("gemini-3.8-flash" if os.environ.get("GOOGLE_CLOUD_PROJECT") else "gpt-6.1-terra"))
    write_model: str = field(default_factory=lambda: os.environ.get("WRITE_MODEL") or ("gemini-4-hydrogen" if os.environ.get("GOOGLE_CLOUD_PROJECT") else "gpt-6.1-terra"))
    # The first run a new account gets: questions, each asked once to every assistant
    first_run_questions: int = field(default_factory=lambda: int(os.environ.get("FIRST_RUN_QUESTIONS", "10")))
    # Of those, how many ChatGPT is asked when Gemini is asked too (the user's decision, 15 Nov 2026: Gemini
    # answers all of them, ChatGPT about half, to keep a free first check cheap). Alone, ChatGPT is asked all.
    first_run_chatgpt_questions: int = field(default_factory=lambda: int(os.environ.get("FIRST_RUN_CHATGPT_QUESTIONS", "5")))
    # A first run costs real money: how many one account may start in a day
    first_runs_a_day: int = field(default_factory=lambda: int(os.environ.get("FIRST_RUNS_A_DAY", "3")))
    # Development: a first run replays the latest saved one in the place of asking the assistants, so the
    # pages can be built and tried without a paid request. Never set on the server.
    first_run_replay: bool = field(default_factory=lambda: os.environ.get("FIRST_RUN_REPLAY", "false") == "true")
    # A weekly check: how many times each tracked question is asked to each assistant. One until the prices
    # are decided: every extra sample multiplies what a check costs.
    run_samples: int = field(default_factory=lambda: int(os.environ.get("RUN_SAMPLES", "1")))
    # Whether the server's timer starts the weekly checks (Mondays, 01:00 UTC): the report then says when the
    # next one is. Set where the timer is installed, nowhere else.
    weekly_runs: bool = field(default_factory=lambda: os.environ.get("WEEKLY_RUNS", "false") == "true")
    # The browser that prints a report as a PDF (Chrome or Chromium). Left out, the usual places are tried.
    chrome_path: Optional[str] = field(default_factory=lambda: os.environ.get("CHROME_PATH"))
    session_days: int = 30
    # Cookies go over HTTPS only on the server
    secure_cookies: bool = field(default_factory=lambda: os.environ.get("SECURE_COOKIES", "false") == "true")

    @property
    def own_email(self) -> bool:
        """This service sends the login code itself."""
        return bool(self.smtp_host)

    @property
    def supabase_login(self) -> bool:
        """Supabase sends and checks the code: only when this service doesn't send its own emails."""
        return bool(self.supabase_url and self.supabase_anon_key) and not self.own_email

    @property
    def login(self) -> str:
        return "email" if self.own_email else "supabase" if self.supabase_login else "development"

    @property
    def can_read(self) -> bool:
        """A model that reads and writes for us can be reached."""
        return bool(self.openai_key or self.google_cloud_project)

    @property
    def engines(self) -> List[str]:
        """The assistants that can be asked now: those with a key."""
        return [name for name, key in (("chatgpt", self.openai_key), ("gemini", self.gemini_key or self.google_cloud_project)) if key]


settings = Settings()
