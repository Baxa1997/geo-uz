"""Free Snapshots for a list of prospects' websites (`app/prospects.py`): each the free first check made without its
screens by stand-in assistants, saved as a project on the team's account, with its snapshot's link and digest; a
website that has a project is skipped. Nothing is asked: the website's reading and the assistants are stand-ins."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import delete, select

from app import firstrun, projects, prospects
from app.db import FirstRun, Project, Slot, User
from test_wave import stand_in_draft, stand_ins  # noqa: F401 (the fixture)


def stand_in_prepare(domain: str, category: Optional[str], city: Optional[str], country: Optional[str] = None, name: Optional[str] = None) -> Tuple[Dict[str, Any], float]:
    draft = stand_in_draft()
    draft["own"] = domain
    draft["who"] = {**draft["who"], "name": domain.split(".")[0].title(), "competitors": [{"name": "Rival Co", "domain": "rival.example"}]}
    return draft, 0.0


def test_a_list_becomes_snapshots_and_a_second_run_skips_them(db: Any, stand_ins: None, monkeypatch: Any, tmp_path: Any) -> None:  # noqa: F811
    monkeypatch.setattr(firstrun, "prepare", stand_in_prepare)
    listed = tmp_path / "prospects.txt"
    listed.write_text("# the demand test\nalpha-prospect.example\n\nbeta-prospect.example, KZ\n", encoding="utf-8")
    assert prospects.read_list(listed) == [("alpha-prospect.example", None), ("beta-prospect.example", "KZ")]
    team = User(email="team-prospects@example.test")
    db.add(team)
    db.commit()
    made: List[str] = []
    try:
        rows = [prospects.make(team.id, site, country, "en", ["chatgpt"]) for site, country in prospects.read_list(listed)]
        assert [row["status"] for row in rows] == ["done", "done"]
        for row in rows:
            made.append(row["project"])
            project = db.get(Project, row["project"])
            assert project is not None and project.user_id == team.id and project.first_run_id
            assert row["snapshot"] == f"{prospects.settings.frontend_origin.rstrip('/')}/en/snapshot/{project.first_run_id}"
            # The digest is the check's own, six lines; its lines on the client and who is named instead stand apart
            assert len(row["digest"].splitlines()) == 6 and row["named"] == row["digest"].splitlines()[1]
            assert row["competitors"] == "Rival Co" and row["questions"].count(";") == 9
            # Every call of the check in the slot log, handed to the project's check
            db.expire_all()
            assert db.scalars(select(Slot).where(Slot.first_run_id == project.first_run_id)).first() is not None
        again = [prospects.make(team.id, site, country, "en", ["chatgpt"]) for site, country in prospects.read_list(listed)]
        assert [row["status"] for row in again] == ["skipped: has a project"] * 2
        assert [row["project"] for row in again] == made
    finally:
        db.expire_all()
        for project_id in made:
            project = db.get(Project, project_id)
            if project is not None:
                projects.delete(db, project)
        db.execute(delete(Slot).where(Slot.first_run_id.in_(select(FirstRun.id).where(FirstRun.user_id == team.id))))
        db.execute(delete(FirstRun).where(FirstRun.user_id == team.id))
        db.execute(delete(User).where(User.id == team.id))
        db.commit()
