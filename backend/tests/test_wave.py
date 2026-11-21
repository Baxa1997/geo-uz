"""The slot log and the data object (Phase 0 item 0.1).

The baseline's scope comes from its rebuilt slot log; a first check and a weekly check write their slots as they
go, here with stand-in assistants (nothing is asked, nothing is paid); a first run's slots become its
project's when it is saved. Tests that add rows remove them after, so the baseline stays as it was loaded.
"""

from __future__ import annotations

from typing import Any, Dict, List

import pytest
from sqlalchemy import delete, select

from app import engines, firstrun, projects, slots, wave, weekly
from app.db import Answer, Brand, Citation, FirstRun, Mention, Project, Prompt, Run, Slot, User

# --- the baseline ---------------------------------------------------------------------------------------


def test_the_baseline_scope_comes_from_its_rebuilt_slot_log(db: Any, project: Any, run_id: str, expected: Dict[str, Any]) -> None:
    scope, want = wave.payload(db, project, run_id)["metrics"]["scope"], expected["scope"]
    assert scope["wave"]["reconstructed"] and scope["wave"]["is_baseline"] and scope["wave"]["number"] == 1
    assert scope["prompts"]["discovery"] == want["discovery_prompts"]
    assert scope["prompts"]["by_language"] == want["prompt_languages"]
    assert {key: scope["slots"][key] for key in ("slots", "completed", "excluded", "failed")} == {key: want[key] for key in ("slots", "completed", "excluded", "failed")}
    # The user's decision of 21 Nov 2026: left out by the free check's design, not failed
    assert scope["slots"]["excluded_reasons"] == {"free_check_subset": want["excluded"]}
    assert {engine["engine"]: engine["completed"] for engine in scope["engines"]} == want["completed_by_engine"]
    gemini = next(engine for engine in scope["engines"] if engine["engine"] == "gemini")
    assert [gemini["searched"], gemini["completed"]] == want["gemini_searched"]
    assert scope["answers_by_language"] == want["answers_by_language"]
    assert scope["branded"]["completed"] == want["branded_answers"]
    assert all(engine["models"] for engine in scope["engines"])


def test_the_baseline_chatgpt_was_located_by_country_only(db: Any, project: Any, run_id: str, expected: Dict[str, Any]) -> None:
    """A project without a city: ChatGPT's search tool was told the country and time zone, no city (0.7 adds one)."""
    chatgpt = next(engine for engine in wave.payload(db, project, run_id)["metrics"]["scope"]["engines"] if engine["engine"] == "chatgpt")
    assert chatgpt["location"]["set"] and chatgpt["location"]["country"] == expected["location_country"]
    assert chatgpt["location"]["city"] is None and not chatgpt["location_varies"]


def test_the_object_holds_together(db: Any, project: Any, run_id: str) -> None:
    built = wave.build(db, project, run_id)
    answers = {answer["id"]: answer for answer in built["answers"]}
    prompts = {prompt["id"] for prompt in built["prompts"]}
    assert all(slot["prompt_id"] in prompts for slot in built["slots"])
    completed = [slot for slot in built["slots"] if slot["group"] == "discovery" and slot["status"] == "completed"]
    assert completed and all(slot["answer_id"] in answers for slot in completed)
    assert all(answers[slot["answer_id"]]["slot_id"] == slot["id"] for slot in completed)
    # Each assistant asked each question once: one run, numbered per assistant
    assert {answer["run_index"] for answer in built["answers"]} == {1}
    assert wave.build(db, project, "latest")["wave"]["id"] == run_id


# --- a first check, with stand-in assistants -----------------------------------------------------------

QUESTIONS = [{"text": f"Stand-in question {number}?", "language": "ru" if number <= 5 else "uz", "topic": "stand-in"} for number in range(1, 11)]
BRAND_QUESTIONS = [{"text": "What do you know about Stand-in Co?", "language": "ru"}, {"text": "Stand-in Co haqida nima bilasiz?", "language": "uz"}]
# The calls that go wrong: Gemini fails on the second question, ChatGPT answers the third with nothing
FAILS = {("gemini", QUESTIONS[1]["text"])}
EMPTY = {("chatgpt", QUESTIONS[2]["text"])}


def stand_in_ask(engine: str, question: str, country: str, city: str, timezone: str) -> Dict[str, Any]:
    if (engine, question) in FAILS:
        raise engines.EngineError("stand-in failure")
    text = "" if (engine, question) in EMPTY else f"An answer to {question}"
    return {"engine": engine, "model": f"{engine}-stand-in", "text": text, "citations": [], "searches": ["a search"] if engine == "chatgpt" else [], "usd": 0.0}


def stand_in_model(instructions: str, content: str, name: str, schema: Any) -> Any:
    answers = {
        "answer_reading": {"businesses": []},
        "name_groups": {"groups": []},
        "brand_view": {"known": "unknown", "statements": []},
        "first_conclusion": {"uz": "-", "ru": "-", "en": "-"},
    }
    return answers[name], 0.0


@pytest.fixture()
def stand_ins(monkeypatch: Any) -> None:
    monkeypatch.setattr(engines, "ask", stand_in_ask)
    monkeypatch.setattr(engines, "read", stand_in_model)
    monkeypatch.setattr(engines, "write", stand_in_model)
    monkeypatch.setattr(weekly.time, "sleep", lambda seconds: None)


def stand_in_draft() -> Dict[str, Any]:
    who = {"name": "Stand-in Co", "aliases": [], "category": "stand-ins", "city": "", "cityEn": "", "country": "UZ", "description": "", "services": [], "questions": QUESTIONS, "competitors": [], "brandQuestions": []}
    return {"who": who, "country": "UZ", "own": "stand-in.example", "checks": [], "siteText": "", "brandQuestions": BRAND_QUESTIONS}


def first_check(first_run_id: str) -> Any:
    draft = stand_in_draft()
    return firstrun.check(draft, firstrun.confirmed_of(draft), lambda *step: None, ["chatgpt", "gemini"], log=slots.SlotLog(first_run_id=first_run_id))


def logged(db: Any, **where: Any) -> List[Slot]:
    db.expire_all()
    return list(db.scalars(select(Slot).filter_by(**where)))


def test_a_first_check_logs_every_slot_as_it_goes(db: Any, stand_ins: None) -> None:
    first_run_id = "stand-in-first-run-1"
    try:
        first_check(first_run_id)
        found = logged(db, first_run_id=first_run_id)
        discovery = [slot for slot in found if slot.prompt_group == "discovery"]
        status = {(slot.engine, slot.question_index): (slot.status, slot.reason) for slot in discovery}
        assert len(discovery) == 20
        # Gemini gets every question; ChatGPT half of them, the rest left out by the free check's design
        assert sum(1 for engine, _ in status if engine == "gemini") == 10
        assert status[("gemini", 1)] == ("failed", "error")
        assert status[("chatgpt", 2)] == ("failed", "empty_answer")
        assert sum(1 for value in status.values() if value == ("excluded", "free_check_subset")) == 5
        assert sum(1 for value in status.values() if value == ("completed", None)) == 13
        done = [slot for slot in discovery if slot.status == "completed"]
        assert all(slot.model == f"{slot.engine}-stand-in" and slot.attempts == 1 and slot.finished_at for slot in done)
        assert {slot.searched for slot in done if slot.engine == "chatgpt"} == {True}
        chatgpt = [slot for slot in discovery if slot.engine == "chatgpt"]
        assert all(slot.location["set"] and slot.location["country"] == "UZ" and slot.location["how"] == "user_location" for slot in chatgpt)
        # The brand questions: ChatGPT only the first language when Gemini is asked too
        branded = {(slot.engine, slot.language): slot.status for slot in found if slot.prompt_group == "branded"}
        assert branded == {("chatgpt", "ru"): "completed", ("chatgpt", "uz"): "excluded", ("gemini", "ru"): "completed", ("gemini", "uz"): "completed"}
    finally:
        db.execute(delete(Slot).where(Slot.first_run_id == first_run_id))
        db.commit()


def test_saving_a_first_run_hands_its_slots_to_the_project(db: Any, project: Any, stand_ins: None) -> None:
    first_run_id = "stand-in-first-run-2"
    owner = db.get(User, project.user_id)
    made = None
    try:
        snapshot, raw, _ = first_check(first_run_id)
        db.add(FirstRun(id=first_run_id, user_id=owner.id, domain="stand-in.example", status="done", answered=13, total=15, result={"id": first_run_id, **snapshot}, raw=raw))
        db.commit()
        body = {"name": "Stand-in Co", "domain": "stand-in.example", "country": "UZ", "category": "stand-ins", "competitors": [], "prompts": QUESTIONS, "brandQuestions": BRAND_QUESTIONS, "firstRunId": first_run_id}
        made, run_id = projects.create(db, owner, body)
        found = logged(db, first_run_id=first_run_id)
        assert {slot.run_id for slot in found} == {run_id}
        rows = {row.id: row for row in db.scalars(select(Answer).where(Answer.run_id == run_id))}
        done = [slot for slot in found if slot.prompt_group == "discovery" and slot.status == "completed"]
        assert len(done) == len(rows) == 13
        assert all(rows[slot.answer_id].prompt_id == slot.prompt_id for slot in done)
        # The answers keep their model now
        assert all(row.model == f"{row.engine}-stand-in" for row in rows.values())
        scope = wave.payload(db, made, run_id)["metrics"]["scope"]
        assert not scope["wave"]["reconstructed"]
        assert (scope["slots"]["completed"], scope["slots"]["failed"], scope["slots"]["excluded"]) == (13, 2, 5)
        assert scope["slots"]["failed_reasons"] == {"error": 1, "empty_answer": 1}
        # Deleting the project frees its first run's slots, to be saved again
        projects.delete(db, made)
        db.commit()
        made = None
        assert {slot.run_id for slot in logged(db, first_run_id=first_run_id)} == {None}
    finally:
        if made is not None:
            projects.delete(db, made)
        db.execute(delete(Slot).where(Slot.first_run_id == first_run_id))
        db.execute(delete(FirstRun).where(FirstRun.id == first_run_id))
        db.commit()


# --- a weekly check, with stand-in assistants ----------------------------------------------------------


def test_a_weekly_check_logs_every_slot_with_its_tries(db: Any, project: Any, stand_ins: None) -> None:
    prompts = [prompt for prompt in projects.prompts_of(db, project.id) if prompt.archived_at is None][:2]
    brands = projects.brands_of(db, project.id)
    run = Run(project_id=project.id, kind="weekly", status="running", method={"engine": "ChatGPT + Gemini", "model": "", "webSearch": True, "samples": 1}, sources={})
    db.add(run)
    db.commit()
    FAILS.add(("gemini", prompts[0].text))
    try:
        jobs = [(prompt, engine, 1) for prompt in prompts for engine in ("chatgpt", "gemini")]
        weekly._collect(db, project, brands, run, jobs, slots.SlotLog(run_id=run.id, db=db))
        db.commit()
        found = {(slot.prompt_id, slot.engine): slot for slot in logged(db, run_id=run.id) if slot.prompt_group == "discovery"}
        assert len(found) == 4
        failed = found[(prompts[0].id, "gemini")]
        assert (failed.status, failed.reason, failed.attempts) == ("failed", "error", weekly.ASK_TRIES)
        done = [slot for slot in found.values() if slot.status == "completed"]
        assert len(done) == 3 and all(slot.answer_id and slot.attempts == 1 for slot in done)
        assert {row.id for row in db.scalars(select(Answer).where(Answer.run_id == run.id))} == {slot.answer_id for slot in done}
    finally:
        FAILS.discard(("gemini", prompts[0].text))
        answer_ids = list(db.scalars(select(Answer.id).where(Answer.run_id == run.id)))
        if answer_ids:
            db.execute(delete(Mention).where(Mention.answer_id.in_(answer_ids)))
            db.execute(delete(Citation).where(Citation.answer_id.in_(answer_ids)))
            db.execute(delete(Answer).where(Answer.id.in_(answer_ids)))
        db.execute(delete(Slot).where(Slot.run_id == run.id))
        db.execute(delete(Run).where(Run.id == run.id))
        db.commit()
