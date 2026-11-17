"""What this process keeps in memory to answer without asking the database again.

The database is far from the server (17 Nov 2026: about 0.12 s a statement), and every page asks who is logged
in and for the project's report, which is eleven statements. So:

- a session's user is kept for a minute (logging out and renaming drop it at once);
- a report is kept until its project changes: every write to a project through this API marks it changed
  (`touch`), and a report is only reused for the same latest check. A weekly check runs in another process
  and goes on writing after it marks the check done (the pages it reads), so a report is also kept no
  longer than a couple of minutes.

One process serves the API (`uvicorn` without workers), so a dictionary is enough.
"""

from __future__ import annotations

import threading
import time
from typing import Any, Callable, Dict, Hashable, Optional, Tuple

SESSION_SECONDS = 60
REPORT_SECONDS = 120
REPORTS_KEPT = 300

_lock = threading.Lock()
_sessions: Dict[str, Tuple[float, Any]] = {}
_reports: Dict[Hashable, Tuple[float, Hashable, Any]] = {}
_versions: Dict[str, int] = {}


def session_user(token_hash: str) -> Optional[Any]:
    with _lock:
        kept = _sessions.get(token_hash)
        if kept and kept[0] > time.monotonic():
            return kept[1]
        _sessions.pop(token_hash, None)
        return None


def keep_session(token_hash: str, user: Any) -> None:
    with _lock:
        _sessions[token_hash] = (time.monotonic() + SESSION_SECONDS, user)


def drop_session(token_hash: str) -> None:
    with _lock:
        _sessions.pop(token_hash, None)


def drop_user(user_id: str) -> None:
    """After the user's own details change: every session of theirs is read again."""
    with _lock:
        for token_hash in [key for key, (_, user) in _sessions.items() if getattr(user, "id", None) == user_id]:
            del _sessions[token_hash]


def touch(project_id: str) -> None:
    """Something of the project changed: its reports are made again."""
    with _lock:
        _versions[project_id] = _versions.get(project_id, 0) + 1


def version(project_id: str) -> int:
    with _lock:
        return _versions.get(project_id, 0)


def report(key: Hashable, stamp: Hashable, make: Callable[[], Any]) -> Any:
    """The report under `key`, made again when its stamp (the project's version, its latest check) differs."""
    now = time.monotonic()
    with _lock:
        kept = _reports.get(key)
        if kept and kept[0] > now and kept[1] == stamp:
            return kept[2]
    made = make()
    with _lock:
        if len(_reports) >= REPORTS_KEPT:
            # The oldest go first
            for old in sorted(_reports, key=lambda name: _reports[name][0])[: REPORTS_KEPT // 4]:
                del _reports[old]
        _reports[key] = (now + REPORT_SECONDS, stamp, made)
    return made
