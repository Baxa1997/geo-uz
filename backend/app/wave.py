"""One check's data object (report spec §10): what the report shows is computed from it, and only from it.

    build(db, project, run_id)     the object of a finished check, validated; `run_id` "latest" is the newest
    payload(db, project, run_id)   {"wave": the object, "metrics": metrics.compute(object)}: what the API serves

Phase 0 carries the parts the report needs: the project, the wave, its questions, the slot log, the answers
with what each names and cites, the cited sites with their kinds (0.3), and the brand-question check. A check
made before the slot log (21 Nov 2026) has its slots rebuilt from what it saved, each marked `reconstructed`: a first check from its first run's plan
and answers (nothing failed when every planned answer came back), a weekly check from its answers.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as Db

from . import firstrun, metrics, projects
from . import slots as slot_log
from .db import Answer, Citation, FirstRun, Mention, Project, Prompt, Run, Slot
from .engines import ENGINE_NAMES

SCHEMA = 1
# The order the assistants are listed in
ENGINES = list(ENGINE_NAMES)

Group = Literal["discovery", "branded"]
Status = Literal["planned", "completed", "failed", "excluded"]


class Location(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    timezone: Optional[str] = None
    set: bool = False
    how: Optional[str] = None


class BrandRecord(BaseModel):
    id: str
    name: str
    aliases: List[str]
    domains: List[str]


class ProjectRecord(BaseModel):
    id: str
    brand: BrandRecord
    competitors: List[BrandRecord]
    category: str
    market: str
    city: str


class WaveRecord(BaseModel):
    id: str
    # Its place among the project's finished checks, from 1
    number: int
    is_baseline: bool
    kind: str
    collected_at: str
    runs_per_prompt: int
    settings_hash: str
    # Its slots were rebuilt from what it saved, not written as it went
    reconstructed: bool


class PromptRecord(BaseModel):
    id: str
    text: str
    lang: str
    group: Group
    topic: str
    version: int = 1


class SlotRecord(BaseModel):
    id: str
    prompt_id: str
    group: Group
    lang: str
    engine: str
    model: Optional[str]
    surface: Optional[str]
    location: Location
    run_index: int
    status: Status
    reason: Optional[str]
    attempts: int
    answer_id: Optional[str]
    searched: Optional[bool]
    cost_usd: Optional[float]
    reconstructed: bool


class MentionRecord(BaseModel):
    brand_id: Optional[str]
    name: str
    tracked: bool
    position: int
    tone: str
    recommended: bool


class CitationRecord(BaseModel):
    url: str
    title: Optional[str]
    domain: str


class AnswerRecord(BaseModel):
    id: str
    prompt_id: str
    slot_id: Optional[str]
    lang: str
    engine: str
    model: Optional[str]
    run_index: int
    collected_at: str
    text: str
    searches: List[str]
    searched: bool
    mentions: List[MentionRecord]
    citations: List[CitationRecord]


class DomainRecord(BaseModel):
    """A site the buyers' answers cite, with its kind and whether it lists the client, as the report has typed
    them so far (`projects._Check.sources`); item 0.4 brings the spec's domain types (§4.6) in their place."""

    domain: str
    type: str
    listed: bool


class BrandedView(BaseModel):
    engine: str
    lang: str
    question: str
    known: str
    statements: List[Dict[str, Any]]


class Wave(BaseModel):
    schema_version: int = SCHEMA
    project: ProjectRecord
    wave: WaveRecord
    prompts: List[PromptRecord]
    slots: List[SlotRecord]
    answers: List[AnswerRecord]
    domains: List[DomainRecord]
    branded: List[BrandedView]


# --- the slots ------------------------------------------------------------------------------------------


def _engine_order(engine: str) -> int:
    return ENGINES.index(engine) if engine in ENGINES else len(ENGINES)


def _logged(slots: List[Slot], branded_ids: Dict[str, str]) -> List[SlotRecord]:
    return [
        SlotRecord(
            id=slot.id,
            prompt_id=slot.prompt_id if slot.prompt_group == "discovery" else branded_ids[slot.question.casefold()],
            group=slot.prompt_group,
            lang=slot.language,
            engine=slot.engine,
            model=slot.model,
            surface=slot.surface,
            location=Location(**(slot.location or {})),
            run_index=slot.run_index,
            status=slot.status,
            reason=slot.reason,
            attempts=slot.attempts,
            answer_id=slot.answer_id,
            searched=slot.searched,
            cost_usd=slot.cost_usd,
            reconstructed=False,
        )
        for slot in slots
        if slot.prompt_group == "branded" or slot.prompt_id
    ]


def _rebuilt_first(project: Project, run: Run, rows: List[Answer], prompts: Dict[str, Prompt], first: FirstRun, branded_ids: Dict[str, str]) -> List[SlotRecord]:
    """A first check's slots, from its first run: the questions it asked, what came back, and the rule that
    gives ChatGPT part of the questions when Gemini is asked too (`firstrun.questions_for`)."""
    raw, result = first.raw or {}, first.result or {}
    profile = raw.get("profile") or {}
    questions = profile.get("questions") or [item["prompt"] for item in result.get("prompts", [])]
    came = {(answer["question"], answer["engine"]): answer for answer in raw.get("answers") or []}
    asked = [engine for engine in ENGINES if any(engine == key[1] for key in came)]
    # Nothing failed when every planned answer came back: then what came back is what was planned
    planned = set(came) if first.total == len(came) else {(q, engine) for engine in asked for q in firstrun.questions_for(engine, asked, len(questions))}
    country = result.get("country") or project.country or projects.DEFAULT_COUNTRY
    place = (country, profile.get("cityEn") or profile.get("city") or "", firstrun.TIMEZONES.get(country, ""))
    prompt_of = {q: prompt for q, question in enumerate(questions) for prompt in prompts.values() if projects._same(prompt.text, question["text"])}
    saved = {(row.prompt_id, row.engine): row for row in rows}
    found: List[SlotRecord] = []
    for engine in asked:
        for q, question in enumerate(questions):
            prompt = prompt_of.get(q)
            if prompt is None:
                continue  # a question the client didn't keep isn't part of the project's check
            row, source = saved.get((prompt.id, engine)), came.get((q, engine)) or {}
            status = "completed" if row else "failed" if (q, engine) in planned else "excluded"
            reason = None if row else "not_logged" if status == "failed" else "free_check_subset" if engine == "chatgpt" and "gemini" in asked else "not_planned"
            found.append(
                SlotRecord(
                    id=f"{run.id}:{engine}:{q}",
                    prompt_id=prompt.id,
                    group="discovery",
                    lang=question.get("language") or prompt.language,
                    engine=engine,
                    model=source.get("model") if row else None,
                    surface=slot_log.SURFACES.get(engine),
                    location=Location(**slot_log.location(engine, *place, vertex=True)),
                    run_index=1,
                    status=status,
                    reason=reason,
                    attempts=0 if status == "excluded" else 1,
                    answer_id=row.id if row else None,
                    searched=slot_log.searched(source) if row else None,
                    cost_usd=None,
                    reconstructed=True,
                )
            )
    # The brand questions it asked: the first in each language, ChatGPT only the first language when Gemini was asked too
    asked_named = [question for question in result.get("brandQuestions") or [] if question.get("asked")]
    first_language = asked_named[0]["language"] if asked_named else None
    kept = [question["text"] for question in project.brand_questions or []]
    for engine in asked:
        for question in asked_named:
            # Only the brand questions the client kept, under the wording the project keeps them in
            text = next((text for text in kept if projects._same(question["text"], text)), None)
            if text is None:
                continue
            got = next((answer for answer in raw.get("brandAnswers") or [] if answer.get("engine") == engine and answer.get("language") == question["language"]), None)
            status = "completed" if got else "excluded" if engine == "chatgpt" and "gemini" in asked and question["language"] != first_language else "failed"
            found.append(
                SlotRecord(
                    id=f"{run.id}:{engine}:brand:{question['language']}",
                    prompt_id=branded_ids[text.casefold()],
                    group="branded",
                    lang=question["language"],
                    engine=engine,
                    model=(got or {}).get("model"),
                    surface=slot_log.SURFACES.get(engine),
                    location=Location(**slot_log.location(engine, *place, vertex=True)),
                    run_index=1,
                    status=status,
                    reason=None if got else "free_check_subset" if status == "excluded" else "not_logged",
                    attempts=0 if status == "excluded" else 1,
                    answer_id=None,
                    searched=slot_log.searched(got) if got else None,
                    cost_usd=None,
                    reconstructed=True,
                )
            )
    return found


def _rebuilt_weekly(project: Project, run: Run, rows: List[Answer], prompts: Dict[str, Prompt], branded_ids: Dict[str, str]) -> List[SlotRecord]:
    """A weekly check's slots, from its answers: every question it answered, to every assistant that answered,
    as many runs as it took; one that didn't come back failed, for a reason nobody wrote down."""
    samples = max(1, int((run.method or {}).get("samples") or 1))
    asked = [engine for engine in ENGINES if any(row.engine == engine for row in rows)]
    country = project.country or projects.DEFAULT_COUNTRY
    timezone = firstrun.TIMEZONES.get(country, "")
    by: Dict[Tuple[str, str], List[Answer]] = defaultdict(list)
    for row in sorted(rows, key=lambda row: row.sample):
        by[(row.prompt_id, row.engine)].append(row)
    found: List[SlotRecord] = []
    for prompt in sorted({prompts[row.prompt_id] for row in rows if row.prompt_id in prompts}, key=lambda prompt: prompt.position):
        for engine in asked:
            for index in range(1, samples + 1):
                row = by[(prompt.id, engine)][index - 1] if len(by[(prompt.id, engine)]) >= index else None
                found.append(
                    SlotRecord(
                        id=f"{run.id}:{engine}:{prompt.id}:{index}",
                        prompt_id=prompt.id,
                        group="discovery",
                        lang=prompt.language,
                        engine=engine,
                        model=row.model if row else None,
                        surface=slot_log.SURFACES.get(engine),
                        location=Location(**slot_log.location(engine, country, prompt.location, timezone, vertex=True)),
                        run_index=index,
                        status="completed" if row else "failed",
                        reason=None if row else "not_logged",
                        attempts=1,
                        answer_id=row.id if row else None,
                        searched=bool(row.searches) if row else None,
                        cost_usd=None,
                        reconstructed=True,
                    )
                )
    for view in run.brand_view or []:
        found.append(
            SlotRecord(
                id=f"{run.id}:{view.get('engine')}:brand:{len(found)}",
                prompt_id=branded_ids[str(view.get("question") or "").casefold()],
                group="branded",
                lang=view.get("language") or "",
                engine=view.get("engine") or "",
                model=None,
                surface=slot_log.SURFACES.get(view.get("engine") or ""),
                location=Location(**slot_log.location(view.get("engine") or "", country, project.city, timezone, vertex=True)),
                run_index=1,
                status="completed",
                reason=None,
                attempts=1,
                answer_id=None,
                searched=bool(view.get("citations")),
                cost_usd=None,
                reconstructed=True,
            )
        )
    return found


# --- the object -----------------------------------------------------------------------------------------


def _brand(brand: Any) -> BrandRecord:
    return BrandRecord(id=brand.id, name=brand.name, aliases=list(brand.aliases or []), domains=[brand.domain] if brand.domain else [])


def _settings_hash(found: List[SlotRecord]) -> str:
    """What a comparison between two checks has to hold the same (spec §6.2): each assistant's model, surface and
    location, and the runs per question."""
    settings = sorted({json.dumps([slot.engine, slot.model, slot.surface, slot.location.model_dump(), slot.run_index], sort_keys=True) for slot in found if slot.status != "excluded"})
    return hashlib.sha1("\n".join(settings).encode("utf-8")).hexdigest()[:12]


def build(db: Db, project: Project, run_id: str) -> Dict[str, Any]:
    done = list(db.scalars(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at)))
    run = done[-1] if run_id == "latest" and done else next((run for run in done if run.id == run_id), None)
    if run is None:
        raise projects.ProjectError(404, "run_not_found")
    brands = projects.brands_of(db, project.id)
    client = next(brand for brand in brands if brand.own)
    tracked = {brand.id for brand in brands}
    prompts = {prompt.id: prompt for prompt in projects.prompts_of(db, project.id)}
    rows = list(db.scalars(select(Answer).where(Answer.run_id == run.id)))
    ids = [row.id for row in rows]
    mentions: Dict[str, List[Mention]] = defaultdict(list)
    citations: Dict[str, List[Citation]] = defaultdict(list)
    if ids:
        for mention in db.scalars(select(Mention).where(Mention.answer_id.in_(ids)).order_by(Mention.position, Mention.id)):
            mentions[mention.answer_id].append(mention)
        for citation in db.scalars(select(Citation).where(Citation.answer_id.in_(ids)).order_by(Citation.id)):
            citations[citation.answer_id].append(citation)

    logged = list(db.scalars(select(Slot).where(Slot.run_id == run.id)))
    # The brand questions have no row of their own: each gets an id in the object by its wording
    named = list(dict.fromkeys([slot.question for slot in logged if slot.prompt_group == "branded"] + [str(view.get("question") or "") for view in run.brand_view or []] + [question["text"] for question in project.brand_questions or []]))
    branded_ids = {text.casefold(): f"brand:{index}" for index, text in enumerate(named, start=1)}
    if logged:
        found = _logged(logged, branded_ids)
    else:
        first = db.get(FirstRun, project.first_run_id) if run.kind == "first" and project.first_run_id else None
        found = _rebuilt_first(project, run, rows, prompts, first, branded_ids) if first is not None and first.raw else _rebuilt_weekly(project, run, rows, prompts, branded_ids)
    found.sort(key=lambda slot: (slot.group != "discovery", _engine_order(slot.engine), prompts[slot.prompt_id].position if slot.prompt_id in prompts else 0, slot.run_index))

    slot_of = {slot.answer_id: slot for slot in found if slot.answer_id}
    runs: Dict[Tuple[str, str], int] = defaultdict(int)
    answers: List[AnswerRecord] = []
    for row in sorted(rows, key=lambda row: (row.prompt_id, row.engine, row.sample)):
        prompt = prompts.get(row.prompt_id)
        if prompt is None:
            continue
        runs[(row.prompt_id, row.engine)] += 1
        slot = slot_of.get(row.id)
        answers.append(
            AnswerRecord(
                id=row.id,
                prompt_id=row.prompt_id,
                slot_id=slot.id if slot else None,
                lang=prompt.language,
                engine=row.engine,
                model=row.model or (slot.model if slot else None),
                run_index=runs[(row.prompt_id, row.engine)],
                collected_at=projects.iso(run.collected_at),
                text=row.text,
                searches=list(row.searches or []),
                searched=bool(row.searches or citations[row.id]),
                mentions=[MentionRecord(brand_id=mention.brand_id, name=mention.name, tracked=mention.brand_id in tracked, position=mention.position, tone=mention.tone, recommended=bool(mention.recommended)) for mention in mentions[row.id]],
                citations=[CitationRecord(url=citation.url, title=citation.title, domain=citation.domain) for citation in citations[row.id]],
            )
        )

    asked_prompts = {slot.prompt_id for slot in found if slot.group == "discovery"}
    records = [PromptRecord(id=prompt.id, text=prompt.text, lang=prompt.language, group="discovery", topic=prompt.topic) for prompt in sorted(prompts.values(), key=lambda prompt: prompt.position) if prompt.id in asked_prompts]
    asked_named = {slot.prompt_id for slot in found if slot.group == "branded"}
    languages = {slot.prompt_id: slot.lang for slot in found if slot.group == "branded"}
    records += [PromptRecord(id=key, text=text, lang=languages[key], group="branded", topic="") for text in named for key in [branded_ids[text.casefold()]] if key in asked_named]

    number = next(index for index, check in enumerate(done, start=1) if check.id == run.id)
    wave = Wave(
        project=ProjectRecord(
            id=project.id,
            brand=_brand(client),
            competitors=[_brand(brand) for brand in brands if not brand.own],
            category=project.category,
            market=project.country or projects.DEFAULT_COUNTRY,
            city=project.city,
        ),
        wave=WaveRecord(
            id=run.id,
            number=number,
            is_baseline=number == 1,
            kind=run.kind,
            collected_at=projects.iso(run.collected_at),
            runs_per_prompt=max([slot.run_index for slot in found if slot.group == "discovery"], default=1),
            settings_hash=_settings_hash(found),
            reconstructed=not logged,
        ),
        prompts=records,
        slots=found,
        answers=answers,
        # Each cited site's kind, as the report types it today (0.3; 0.4 replaces the typing)
        domains=[
            DomainRecord(domain=site["domain"], type=site["type"], listed=bool(site["brandListed"]))
            for site in projects._Check(run, [row for row in rows if row.prompt_id in prompts], mentions, citations).sources(brands)
        ],
        branded=[BrandedView(engine=str(view.get("engine") or ""), lang=str(view.get("language") or ""), question=str(view.get("question") or ""), known=str(view.get("known") or "unknown"), statements=list(view.get("statements") or [])) for view in run.brand_view or []],
    )
    return wave.model_dump()


def payload(db: Db, project: Project, run_id: str) -> Dict[str, Any]:
    """What `GET /projects/{id}/waves/{run_id}` serves: the object, and every number computed from it."""
    built = build(db, project, run_id)
    return {"wave": built, "metrics": metrics.compute(built)}
