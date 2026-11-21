"""An exported project (`export_baseline.py`) put into the tests' own database.

That database is a SQLite file of the tests' own: `conftest.py` points `DATABASE_URL` at it before `app` is
imported, so nothing here can reach this computer's local.db or the server's.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict

from sqlalchemy import DateTime

from app.db import Base, create_tables, engine

FORMAT = 1
# Parents before children
ORDER = ["projects", "brands", "prompts", "runs", "answers", "mentions", "citations", "wrong_facts", "actions", "first_runs"]


def _value(column: Any, value: Any) -> Any:
    """A value as the column takes it: the export writes dates as ISO text."""
    if isinstance(value, str) and isinstance(column.type, DateTime):
        return datetime.datetime.fromisoformat(value)
    return value


def load(fixture: Dict[str, Any]) -> None:
    if fixture.get("format") != FORMAT:
        raise ValueError(f"A fixture of format {fixture.get('format')!r}; this loader reads {FORMAT}: export it again")
    create_tables()
    tables = Base.metadata.tables
    given = fixture["tables"]
    # The owner isn't exported: a stand-in account holds the project and its first run
    owners = sorted({item["user_id"] for name in ("projects", "first_runs") for item in given.get(name) or []})
    with engine.begin() as db:
        for number, owner in enumerate(owners, start=1):
            db.execute(tables["users"].insert(), {"id": owner, "email": f"owner-{number}@fixture.test"})
        for name in ORDER:
            table = tables[name]
            items = given.get(name) or []
            if items:
                # A column the export doesn't have takes its default; one this code doesn't know is left out
                db.execute(table.insert(), [{column.name: _value(column, item[column.name]) for column in table.columns if column.name in item} for item in items])
