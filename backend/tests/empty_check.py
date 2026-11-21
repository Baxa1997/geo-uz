"""A made-up project whose one check has nothing to show (Phase 0 item 0.9): three buyer questions answered with
plain text, no business named, no page cited, no brand question asked. The report's empty states are read on it.
Its rows go into the tests' database beside the baseline and are taken out after."""

from __future__ import annotations

from typing import Any

from sqlalchemy import delete, select

from app.db import Action, Answer, Brand, Citation, Mention, Project, Prompt, Run, Slot, now

QUESTIONS = [
    ("Where can I buy a stand-in widget?", "ru", "buying"),
    ("Which stand-in widget is the cheapest?", "ru", "prices"),
    ("How do I choose a stand-in widget?", "uz", "choice"),
]


def make(db: Any, user_id: str) -> str:
    """The empty project, its competitor, questions and one finished check; its id."""
    project = Project(user_id=user_id, category="stand-ins", country="UZ", city="", plan="start", paid=False, brand_questions=[])
    db.add(project)
    db.flush()
    db.add_all([Brand(project_id=project.id, name="Empty Co", domain="empty.example", aliases=[], own=True), Brand(project_id=project.id, name="Other Co", domain="other.example", aliases=[], own=False)])
    prompts = [Prompt(project_id=project.id, text=text, language=language, topic=topic, position=index) for index, (text, language, topic) in enumerate(QUESTIONS)]
    db.add_all(prompts)
    run = Run(project_id=project.id, kind="weekly", status="done", collected_at=now(), method={"engine": "ChatGPT", "model": "", "webSearch": True, "samples": 1}, sources={}, brand_view=[], answered=3, total=3)
    db.add(run)
    db.flush()
    db.add_all([Answer(run_id=run.id, prompt_id=prompt.id, engine="chatgpt", sample=1, model="stand-in", text=f"There are many shops. {prompt.text} Compare a few.", searches=[]) for prompt in prompts])
    db.commit()
    return project.id


def remove(db: Any, project_id: str) -> None:
    runs = list(db.scalars(select(Run.id).where(Run.project_id == project_id)))
    answers = list(db.scalars(select(Answer.id).where(Answer.run_id.in_(runs)))) if runs else []
    if answers:
        db.execute(delete(Mention).where(Mention.answer_id.in_(answers)))
        db.execute(delete(Citation).where(Citation.answer_id.in_(answers)))
        db.execute(delete(Answer).where(Answer.id.in_(answers)))
    if runs:
        db.execute(delete(Slot).where(Slot.run_id.in_(runs)))
    db.execute(delete(Action).where(Action.project_id == project_id))
    db.execute(delete(Run).where(Run.project_id == project_id))
    db.execute(delete(Prompt).where(Prompt.project_id == project_id))
    db.execute(delete(Brand).where(Brand.project_id == project_id))
    db.execute(delete(Project).where(Project.id == project_id))
    db.commit()
