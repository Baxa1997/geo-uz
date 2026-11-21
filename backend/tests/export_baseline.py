"""One project's rows as the JSON file the tests load (`tests/fixtures/baseline.json`). It only reads.

On this computer's database, from `backend/`:

    .venv/bin/python tests/export_baseline.py <project id> > tests/fixtures/baseline.json

On the server, where the baseline lives, the script goes over SSH and runs there against the service's own
database, and its output comes back to this computer:

    ssh <server> 'cd /opt/geo-backend && .venv/bin/python - <project id>' < tests/export_baseline.py > tests/fixtures/baseline.json

What it writes: the project, its brands, questions, runs, answers, mentions, citations, wrong facts and actions,
and the first run it was made from (with the raw answers). Who owns it is left out: no user row, no email.
The file holds a client's answers in full, so it stays on this computer (git ignores `tests/fixtures/`), and
the project's id, which opens its report by link, is never written into a committed file.
"""

from __future__ import annotations

import datetime
import json
import os
import sys
from typing import Any, Dict, List

# Run from the backend's folder, as a file or from stdin (`python -`): the `app` package is in it
sys.path.insert(0, os.getcwd())

from sqlalchemy import select  # noqa: E402

from app.db import Action, Answer, Citation, FirstRun, Mention, Project, Prompt, ReadSession, Run, WrongFact, Brand  # noqa: E402

# The file's shape, which `fixture_db.load` checks
FORMAT = 1


def row(item: Any) -> Dict[str, Any]:
    """A row as its columns, dates as ISO text."""
    values = {column.name: getattr(item, column.name) for column in item.__table__.columns}
    return {name: value.isoformat() if isinstance(value, datetime.datetime) else value for name, value in values.items()}


def rows(items: Any) -> List[Dict[str, Any]]:
    return [row(item) for item in items]


def export(project_id: str) -> Dict[str, Any]:
    # The read-only session: no transaction to write in, and nothing here adds or changes a row
    with ReadSession() as db:
        project = db.get(Project, project_id)
        if project is None:
            raise SystemExit(f"No project {project_id} in this database")
        runs = list(db.scalars(select(Run).where(Run.project_id == project_id).order_by(Run.collected_at)))
        answers = list(db.scalars(select(Answer).where(Answer.run_id.in_([run.id for run in runs])).order_by(Answer.id))) if runs else []
        ids = [answer.id for answer in answers]
        first = db.get(FirstRun, project.first_run_id) if project.first_run_id else None
        return {
            "format": FORMAT,
            "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "project_id": project_id,
            "tables": {
                "projects": [row(project)],
                "brands": rows(db.scalars(select(Brand).where(Brand.project_id == project_id).order_by(Brand.position))),
                "prompts": rows(db.scalars(select(Prompt).where(Prompt.project_id == project_id).order_by(Prompt.position))),
                "runs": rows(runs),
                "answers": rows(answers),
                "mentions": rows(db.scalars(select(Mention).where(Mention.answer_id.in_(ids)).order_by(Mention.id))) if ids else [],
                "citations": rows(db.scalars(select(Citation).where(Citation.answer_id.in_(ids)).order_by(Citation.id))) if ids else [],
                "wrong_facts": rows(db.scalars(select(WrongFact).where(WrongFact.project_id == project_id).order_by(WrongFact.id))),
                "actions": rows(db.scalars(select(Action).where(Action.project_id == project_id).order_by(Action.created_at, Action.id))),
                "first_runs": [row(first)] if first else [],
            },
        }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    json.dump(export(sys.argv[1]), sys.stdout, ensure_ascii=False, indent=1, sort_keys=True)
    sys.stdout.write("\n")
