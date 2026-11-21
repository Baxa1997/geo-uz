"""The slot log (report spec §6.1): every call a check plans to an assistant, written before it is asked and
closed with what came of it. The report's scope card counts from this log, never from what came back.

    SlotLog(first_run_id=…) or SlotLog(run_id=…, db=…)   one check's log
      .plan([...])                       every planned call, and every one left out, with why
      .close(slot_id, status, …)          one call's outcome: its answer, or why it failed
      .attach({slot_id: answer_id})       the answer's row, once it is saved
      .flush()                            what is still to be written

A check's results arrive on one thread (its loop over the finished calls), so the log needs no lock. It writes
a few closings at a time: the database is far from the server (about 0.12 s a statement). Given a session (the
weekly check's), it writes inside that session's transaction and leaves the commits to its owner; else it
commits each write on a session of its own (a first run, in a thread of the web process).
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import update

from . import places
from .config import settings
from .db import SessionLocal, Slot, new_id, now

# A slot's `reason`, as a code the pages put into words (messages: Report.scope.reasons)
REASONS = (
    "free_check_subset",  # left out: the free first check asks ChatGPT part of the questions when Gemini is asked too
    "error",  # failed: the assistant answered with an error, after its retries
    "empty_answer",  # failed: the assistant answered with no text
    "not_logged",  # failed before the slot log existed (21 Nov 2026): why, nobody wrote down
    "not_planned",  # left out of an older check, for a reason it didn't write down
)
# Where an answer comes from (report spec §10: `surface`)
SURFACES = {"chatgpt": "api_web_search", "gemini": "api_grounded"}
BATCH = 5
# Every row of one insert carries the same columns: what a slot doesn't say is empty
OPTIONAL = ("prompt_id", "question_index", "reason", "detail", "model", "location", "searched", "answer_id", "cost_usd", "finished_at")


def location(engine: str, country: str, city: str, timezone: str, vertex: Optional[bool] = None, live: bool = False) -> Dict[str, Any]:
    """What a call is told of where the customer is, as `engines.ask` tells it (report spec §9.1).

    ChatGPT's search tool takes it as its `user_location`: set. Gemini on Vertex is told it in one sentence of
    its instructions and, since Phase 0 item 0.7 (`live`: a call made now), the city's latitude and longitude as
    its grounding's location when the city has them (`places.coordinates`): set, `lat_lng`. A check rebuilt from
    before then had the sentence only (`instruction`, not set). Gemini by a key is told nothing. `vertex` says
    which Gemini it was, for a check rebuilt later."""
    country, city, timezone = country or None, city or None, timezone or None
    if engine == "chatgpt":
        return {"country": country, "city": city, "timezone": timezone, "set": bool(country or city or timezone), "how": "user_location"}
    told = bool(settings.google_cloud_project if vertex is None else vertex) and bool(country or city)
    if told and live and places.coordinates(city):
        return {"country": country, "city": city, "timezone": None, "set": True, "how": "lat_lng"}
    return {"country": country if told else None, "city": city if told else None, "timezone": None, "set": False, "how": "instruction" if told else None}


def searched(answer: Dict[str, Any]) -> bool:
    """Whether an answer came with a web search behind it: a search the tool reported, or a page it cited."""
    return bool(answer.get("searches") or answer.get("citations"))


class SlotLog:
    def __init__(self, run_id: Optional[str] = None, first_run_id: Optional[str] = None, db: Optional[Any] = None) -> None:
        self.run_id, self.first_run_id, self.db = run_id, first_run_id, db
        self._pending: Dict[str, Dict[str, Any]] = {}

    def _write(self, work: Callable[[Any], None]) -> None:
        if self.db is not None:
            work(self.db)
            return
        with SessionLocal() as db:
            work(db)
            db.commit()

    def plan(self, slots: List[Dict[str, Any]]) -> List[str]:
        """Writes a check's slots before anything is asked, each with its question, language, group, engine,
        run, location and status ("planned", or "excluded" with its reason). Returns their ids, in order."""
        made = now()
        empty = dict.fromkeys(OPTIONAL)
        rows = [{**empty, "id": new_id(), "run_id": self.run_id, "first_run_id": self.first_run_id, "status": "planned", "attempts": 0, "run_index": 1, "surface": SURFACES.get(slot["engine"]), "created_at": made, **slot} for slot in slots]
        if rows:
            self._write(lambda db: db.execute(Slot.__table__.insert(), rows))
        return [row["id"] for row in rows]

    def close(self, slot_id: Optional[str], status: str, *, attempts: int = 1, answer: Optional[Dict[str, Any]] = None, reason: Optional[str] = None, detail: Optional[str] = None) -> None:
        """One call's outcome: "completed" with its answer, or "failed" with a reason and the error's words."""
        if slot_id is None:
            return
        values: Dict[str, Any] = {"status": status, "attempts": attempts, "reason": reason, "detail": (detail or "")[:500] or None, "finished_at": now()}
        if answer is not None:
            values.update(model=answer.get("model"), cost_usd=answer.get("usd"), searched=searched(answer))
        self._pending.setdefault(slot_id, {}).update(values)
        if len(self._pending) >= BATCH:
            self.flush()

    def attach(self, answers: Dict[str, str]) -> None:
        """The saved answer of each completed slot."""
        for slot_id, answer_id in answers.items():
            self._pending.setdefault(slot_id, {})["answer_id"] = answer_id
        self.flush()

    def flush(self) -> None:
        if not self._pending:
            return
        pending, self._pending = self._pending, {}

        def work(db: Any) -> None:
            for slot_id, values in pending.items():
                db.execute(update(Slot).where(Slot.id == slot_id).values(**values))

        self._write(work)
