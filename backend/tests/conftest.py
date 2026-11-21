"""The tests' isolation, and the data they share.

Before `app` is imported anywhere: a database of the tests' own, and every key blanked, so no test can reach
this computer's local.db, the server, an assistant (a paid request) or an inbox. The data is the baseline
exported from the server (`export_baseline.py`) and what spec §3.3 and §11.1 say it must show
(`baseline.expected.json`); both stay on this computer, and the tests that need them are skipped without them.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterator

BACKEND = Path(__file__).resolve().parent.parent
FIXTURES = BACKEND / "tests" / "fixtures"
DATABASE = Path(tempfile.mkdtemp(prefix="seenova-tests-")) / "baseline.db"

# Set before the settings are read: `app.config` keeps what the environment already has
ISOLATED: Dict[str, str] = {
    "DATABASE_URL": f"sqlite:///{DATABASE}",
    # No assistant and no reading model (settings.engines is empty, can_read false), no email, no Supabase
    "OPENAI_API_KEY": "",
    "GEMINI_API_KEY": "",
    "GOOGLE_CLOUD_PROJECT": "",
    "GOOGLE_APPLICATION_CREDENTIALS": "",
    "SMTP_HOST": "",
    "SMTP_USER": "",
    "SMTP_PASSWORD": "",
    "SUPABASE_URL": "",
    "SUPABASE_ANON_KEY": "",
    "TEAM_EMAILS": "",
    "FIRST_RUN_REPLAY": "false",
    "WEEKLY_RUNS": "false",
}
os.environ.update(ISOLATED)
sys.path.insert(0, str(BACKEND))

import pytest  # noqa: E402


def _fixture(name: str) -> Any:
    path = FIXTURES / name
    if not path.exists():
        pytest.skip(f"tests/fixtures/{name} isn't on this computer: see tests/README.md")
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def baseline() -> Dict[str, Any]:
    """The exported project, its rows by table."""
    return _fixture("baseline.json")


@pytest.fixture(scope="session")
def expected() -> Dict[str, Any]:
    """What the baseline must show: spec §3.3 and §11.1 with the user's decisions of 21 Nov 2026, and under
    `audited` what today's report shows instead (spec §3.2)."""
    return _fixture("baseline.expected.json")


@pytest.fixture(scope="session")
def db(baseline: Dict[str, Any]) -> Iterator[Any]:
    """A session on the tests' database, with the baseline loaded into it once."""
    from app import config, db as database
    from fixture_db import load

    # The isolation holds, or nothing runs
    assert config.settings.database_url == ISOLATED["DATABASE_URL"] and not config.settings.engines and not config.settings.can_read
    load(baseline)
    with database.SessionLocal() as session:
        yield session


@pytest.fixture(scope="session")
def run_id(baseline: Dict[str, Any]) -> str:
    """The baseline's one check."""
    runs = baseline["tables"]["runs"]
    assert len(runs) == 1
    return runs[0]["id"]


@pytest.fixture(scope="session")
def brand_ids(baseline: Dict[str, Any]) -> Dict[str, str]:
    """Each tracked brand's id by its name."""
    return {brand["name"]: brand["id"] for brand in baseline["tables"]["brands"]}


@pytest.fixture(scope="session")
def project(db: Any, baseline: Dict[str, Any]) -> Any:
    from app.db import Project

    return db.get(Project, baseline["project_id"])


@pytest.fixture(scope="session")
def report(db: Any, project: Any) -> Dict[str, Any]:
    """Today's report of the baseline, as `GET /projects/{id}/report` serves it."""
    from app import projects

    return projects.report(db, project)


@pytest.fixture(scope="session")
def site(db: Any, tmp_path_factory: Any) -> Iterator[Any]:
    """A backend on the tests' database and a frontend dev server reading from it (page tests only)."""
    from pagetools import Site, SiteBusy

    servers = Site(ISOLATED, tmp_path_factory.mktemp("servers"))
    try:
        servers.start()
    except SiteBusy as busy:
        servers.stop()
        pytest.skip(str(busy))
    except BaseException:
        servers.stop()
        raise
    yield servers
    servers.stop()


@pytest.fixture(scope="session")
def report_page(site: Any, baseline: Dict[str, Any]) -> Any:
    """The baseline's report as a reader gets it by its link, in English (the texts the tests know)."""
    return site.page(f"/en/projects/{baseline['project_id']}/report")
