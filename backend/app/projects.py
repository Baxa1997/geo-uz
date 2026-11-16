"""Projects: a first run saved as a project, and the report the dashboard's pages read.

    create     the setup's last button: the brand, the competitors and the questions the client kept, with the
               first run's answers for the questions that were asked
    report     the `Report` of `frontend/src/shared/types/api.ts`, counted from the answers, mentions and
               citations: over all tracked questions, some of them (a language, a topic), one question, or
               as it stood at a past run

Every number is counted here in plain code, the same way as in a first run (`firstrun.py`).
"""

from __future__ import annotations

import datetime
import math
import re
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session as Db

from . import firstrun
from .config import settings
from .db import Answer, Brand, Citation, FirstRun, Mention, Project, Prompt, Run, User, WrongFact, now
from .engines import web

# What each plan allows (`frontend/src/shared/constants`, PLAN_LIMITS)
# The plans as the user set them on 15 Nov 2026: "start" is Standard ($39.99 a month, checked weekly),
# "business" is Pro ($89.99, checked twice a week), "agency" is Enterprise (several projects, by agreement).
PLAN_LIMITS = {
    "start": {"prompts": 25, "competitors": 5, "facts": 0},
    "business": {"prompts": 50, "competitors": 5, "facts": 20},
    "agency": {"prompts": 300, "competitors": 5, "facts": 50},
}
# The weekdays a paid project is checked on (Monday is 0), at 01:00 UTC, 06:00 in Tashkent
CHECK_DAYS = {"start": [0], "business": [0, 3], "agency": [0, 3]}
# A new project has Standard's limits and is not paid: its free first check is all it gets until it is
DEFAULT_PLAN = "start"
DEFAULT_COUNTRY = "UZ"
TONE = {"positive": 100, "neutral": 50, "negative": 0}
WRONG_FACT_PENALTY = 10


class ProjectError(RuntimeError):
    """A request that can't be done, with the HTTP status and a code the frontend can put into words."""

    def __init__(self, status: int, code: str) -> None:
        super().__init__(code)
        self.status, self.code = status, code


def iso(moment: datetime.datetime) -> str:
    return moment.replace(tzinfo=datetime.timezone.utc).isoformat(timespec="seconds")


def half_up(value: float) -> int:
    """JavaScript's Math.round, which the frontend's own formulas use."""
    return int(math.floor(value + 0.5))


# --- shapes --------------------------------------------------------------------------------------------


def brand_json(brand: Brand) -> Dict[str, Any]:
    return {"id": brand.id, "name": brand.name, "aliases": brand.aliases or [], "domain": brand.domain, "logo": None}


def brands_of(db: Db, project_id: str) -> List[Brand]:
    return list(db.scalars(select(Brand).where(Brand.project_id == project_id).order_by(Brand.position)))


def prompts_of(db: Db, project_id: str) -> List[Prompt]:
    return list(db.scalars(select(Prompt).where(Prompt.project_id == project_id).order_by(Prompt.position)))


def _country(value: Any) -> str:
    """A two-letter country code, or "" when it is none."""
    code = value.strip().upper() if isinstance(value, str) else ""
    return code if len(code) == 2 and code.isalpha() else ""


def project_json(db: Db, project: Project) -> Dict[str, Any]:
    brands = brands_of(db, project.id)
    languages = sorted({prompt.language for prompt in prompts_of(db, project.id) if prompt.archived_at is None}, reverse=True)
    return {
        "id": project.id,
        "brand": brand_json(next(brand for brand in brands if brand.own)),
        "competitors": [brand_json(brand) for brand in brands if not brand.own],
        "category": project.category,
        "city": project.city,
        "country": project.country or DEFAULT_COUNTRY,
        "languages": languages or ["uz", "ru"],
        "description": project.description,
        "services": project.services or [],
        "customers": project.customers or [],
        "identity": project.identity or [],
        "brandQuestions": project.brand_questions or [],
        "plan": project.plan,
        "limits": PLAN_LIMITS[project.plan],
        # Billing doesn't exist yet: nothing renews
        # "trial": the free first check only; "active": paid, checked on its plan's days
        "billing": {"cycle": "month", "renewsAt": None, "status": "active" if project.paid else "trial"},
    }


def prompt_json(prompt: Prompt) -> Dict[str, Any]:
    return {
        "id": prompt.id,
        "text": prompt.text,
        "language": prompt.language,
        "topic": prompt.topic,
        "createdAt": iso(prompt.created_at),
        "archivedAt": iso(prompt.archived_at) if prompt.archived_at else None,
        "location": prompt.location,
        "factCheck": prompt.fact_check,
        "tags": prompt.tags or [],
    }


def own(db: Db, user: User, project_id: str) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.user_id != user.id:
        raise ProjectError(404, "not_found")
    return project


def shared(db: Db, project_id: str) -> Project:
    """A project by its id alone, for the report's link: whoever has the link may read the report, logged in or not."""
    project = db.get(Project, project_id)
    if project is None:
        raise ProjectError(404, "not_found")
    return project


# --- creating ------------------------------------------------------------------------------------------


def _clean(text: Any) -> str:
    return " ".join(str(text or "").split())


def _same(a: str, b: str) -> bool:
    return _clean(a).casefold() == _clean(b).casefold()


def _brand_questions(given: Any, name: str, city: str, result: Optional[Dict[str, Any]] = None) -> List[Dict[str, str]]:
    """The questions that name the business, as the client left them in the setup. Not sent at all (None):
    the ones the first run asked, or the two general ones. An empty list is the client's choice: none."""
    if given is None:
        asked = [question for question in (result or {}).get("brandQuestions") or [] if question.get("asked")]
        given = asked or [{"text": firstrun.brand_question(language, name, city), "language": language} for language in firstrun.BRAND_QUESTIONS]
    kept: List[Dict[str, str]] = []
    for question in given if isinstance(given, list) else []:
        text = _clean(question.get("text") if isinstance(question, dict) else "")[:300]
        if len(text) >= 5 and all(not _same(text, other["text"]) for other in kept):
            kept.append({"text": text, "language": "ru" if question.get("language") == "ru" else "uz"})
    return kept[: firstrun.BRAND_QUESTION_LIMIT]


def create(db: Db, user: User, body: Dict[str, Any]) -> Tuple[Project, Optional[str]]:
    """A new project. With `firstRunId`, the first run's answers come with it as the project's first check."""
    name = _clean(body.get("name"))
    if not name:
        raise ProjectError(422, "name_required")
    try:
        domain = firstrun.normalize(body.get("domain") or "")
    except firstrun.FirstRunError as error:
        raise ProjectError(422, error.code) from error

    result: Optional[Dict[str, Any]] = None
    raw: Dict[str, Any] = {}
    if body.get("firstRunId"):
        first = db.get(FirstRun, body["firstRunId"])
        if first is None or first.user_id != user.id or first.status != "done" or not first.result:
            raise ProjectError(404, "first_run_not_found")
        result, raw = first.result, first.raw or {}

    limits = PLAN_LIMITS[DEFAULT_PLAN]
    city = _clean(body.get("city"))
    project = Project(
        user_id=user.id,
        category=_clean(body.get("category")),
        city=city,
        country=_country(body.get("country")) or _country((result or {}).get("country")) or DEFAULT_COUNTRY,
        description=_clean(body.get("description")),
        services=[_clean(service) for service in body.get("services") or [] if _clean(service)],
        customers=[],
        identity=[],
        plan=DEFAULT_PLAN,
        site_checks=result.get("siteChecks") if result else None,
        brand_questions=_brand_questions(body.get("brandQuestions"), name, city, result),
        first_run_id=body.get("firstRunId"),
    )
    db.add(project)
    db.flush()

    client = Brand(project_id=project.id, own=True, name=name, aliases=[_clean(alias) for alias in body.get("aliases") or [] if _clean(alias)], domain=domain, position=0)
    db.add(client)
    competitors: List[Brand] = []
    for given in body.get("competitors") or []:
        rival = _clean(given.get("name"))
        if not rival or _same(rival, name) or any(_same(rival, brand.name) for brand in competitors):
            continue
        if len(competitors) >= limits["competitors"]:
            raise ProjectError(409, "competitor_limit")
        competitors.append(
            Brand(project_id=project.id, name=rival, aliases=[_clean(alias) for alias in given.get("aliases") or [] if _clean(alias)], domain=web.domain_of(given.get("domain") or "") if given.get("domain") else "", position=len(competitors) + 1)
        )
    db.add_all(competitors)

    prompts: List[Prompt] = []
    for given in body.get("prompts") or []:
        text = _clean(given.get("text"))
        if not text or any(_same(text, prompt.text) for prompt in prompts):
            continue
        if len(prompts) >= limits["prompts"]:
            raise ProjectError(409, "prompt_limit")
        prompts.append(Prompt(project_id=project.id, text=text, language="ru" if given.get("language") == "ru" else "uz", topic=_clean(given.get("topic")), location=_clean(given.get("location")) or city, tags=[], position=len(prompts)))
    db.add_all(prompts)
    db.flush()

    run_id = _save_first_run(db, project, client, competitors, prompts, result, raw) if result else None
    db.commit()
    return project, run_id


def _save_first_run(db: Db, project: Project, client: Brand, competitors: List[Brand], prompts: List[Prompt], result: Dict[str, Any], raw: Dict[str, Any]) -> Optional[str]:
    """The first run's answers as the project's first check, for the questions the client kept."""
    # The first run's own brand ids ("b0", "b1", ...) to the project's brands, by name; one the client dropped stays a name
    was: Dict[str, Tuple[Optional[Brand], str]] = {result["brand"]["id"]: (client, client.name)}
    for rival in result.get("competitors", []):
        kept = next((brand for brand in competitors if _same(brand.name, rival["name"])), None)
        was[rival["id"]] = (kept, rival["name"])
    tracked_then = [result["brand"]["name"], *result["brand"].get("aliases", [])] + [rival["name"] for rival in result.get("competitors", [])]
    # Competitors the client added in the setup: the first run didn't follow them, the answers may still name them
    added = [brand for brand in competitors if all(kept is not brand for kept, _ in was.values())]

    method = result.get("method") or {}
    try:
        collected = datetime.datetime.fromisoformat(method.get("collectedAt", "")).astimezone(datetime.timezone.utc).replace(tzinfo=None)
    except ValueError:
        collected = now()
    run = Run(
        project_id=project.id,
        kind="first",
        status="done",
        method={key: method.get(key) for key in ("engine", "model", "webSearch", "samples")},
        sources={source["domain"]: {"type": source["type"], "brandListed": bool(source["brandListed"])} for source in result.get("topSources", [])},
        collected_at=collected,
        # Of the first run's brand answers, those to questions the client kept
        brand_view=[view for view in result.get("brandView") or [] if any(_same(view.get("question", ""), question["text"]) for question in project.brand_questions or [])],
    )
    db.add(run)
    db.flush()

    raw_by_question: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for answer in raw.get("answers", []):
        raw_by_question[answer["question"]].append(answer)

    saved = 0
    for q, asked in enumerate(result.get("prompts", [])):
        prompt = next((prompt for prompt in prompts if _same(prompt.text, asked["prompt"]["text"])), None)
        if prompt is None:
            continue
        for index, given in enumerate(asked["answers"]):
            answer = Answer(run_id=run.id, prompt_id=prompt.id, sample=given.get("sample", index + 1), engine=given.get("engine") or "chatgpt", text=given["text"], searches=given.get("searches") or [])
            db.add(answer)
            db.flush()
            saved += 1
            mentions: List[Mention] = []
            for mention in given.get("mentions", []):
                brand, written = was.get(mention["brandId"], (None, ""))
                if written:
                    mentions.append(Mention(answer_id=answer.id, brand_id=brand.id if brand else None, name=written, position=mention["position"], tone=mention["tone"], recommended=bool(mention.get("recommended"))))
            # The businesses the first run didn't follow, from its raw reading of the same answer
            source = raw_by_question[q][index] if index < len(raw_by_question[q]) else {}
            others = source.get("order") or source.get("businesses") or []
            for place, other in enumerate(others, start=1):
                written = _clean(other.get("name"))
                if not written or web.names(written, tracked_then) or any(_same(written, known) for known in tracked_then) or any(_same(written, mention.name) for mention in mentions):
                    continue
                brand = next((brand for brand in added if _same(written, brand.name) or web.names(written, [brand.name, *brand.aliases])), None)
                if brand and any(mention.brand_id == brand.id for mention in mentions):
                    continue
                mentions.append(Mention(answer_id=answer.id, brand_id=brand.id if brand else None, name=written, position=place, tone=other.get("tone") or "neutral", recommended=bool(other.get("recommended"))))
            for brand in added:
                if all(mention.brand_id != brand.id for mention in mentions) and web.names(given["text"], [brand.name, *brand.aliases]):
                    mentions.append(Mention(answer_id=answer.id, brand_id=brand.id, name=brand.name, position=max([mention.position for mention in mentions], default=0) + 1, tone="neutral", recommended=False))
            db.add_all(mentions)
            db.add_all(Citation(answer_id=answer.id, url=citation["url"], domain=citation.get("domain") or web.domain_of(citation["url"]), title=citation.get("title")) for citation in given.get("citations", []))
    run.answered = run.total = saved
    return run.id


# --- the report ----------------------------------------------------------------------------------------


class _Check:
    """One run's answers over the questions asked for, with what each names and cites."""

    def __init__(self, run: Run, answers: List[Answer], mentions: Dict[str, List[Mention]], citations: Dict[str, List[Citation]]) -> None:
        self.run, self.answers, self.mentions, self.citations = run, answers, mentions, citations

    def scores(self, brands: List[Brand]) -> List[Dict[str, Any]]:
        ids = {brand.id for brand in brands}
        all_mentions = sum(1 for answer in self.answers for mention in self.mentions[answer.id] if mention.brand_id in ids) or 1
        scores = []
        for brand in brands:
            theirs = [mention for answer in self.answers for mention in self.mentions[answer.id] if mention.brand_id == brand.id]
            scores.append(
                {
                    "brandId": brand.id,
                    "visibility": round(len({mention.answer_id for mention in theirs}) / len(self.answers), 4) if self.answers else 0.0,
                    "shareOfVoice": round(len(theirs) / all_mentions, 4),
                    "avgPosition": round(sum(mention.position for mention in theirs) / len(theirs), 1) if theirs else None,
                    "sentiment": half_up(sum(TONE.get(mention.tone, 50) for mention in theirs) / len(theirs)) if theirs else None,
                }
            )
        return scores

    def sources(self, brands: List[Brand]) -> List[Dict[str, Any]]:
        """The cited sites, the most cited first. A site's count is the answers citing it."""
        client = next(brand for brand in brands if brand.own)
        rivals = [brand for brand in brands if not brand.own]
        sites: Dict[str, Dict[str, Any]] = {}
        for answer in self.answers:
            for citation in self.citations[answer.id]:
                site = sites.setdefault(citation.domain, {"answers": set(), "pages": defaultdict(set), "titles": {}})
                site["answers"].add(answer.id)
                site["pages"][citation.url].add(answer.id)
                if citation.title:
                    site["titles"].setdefault(citation.url, citation.title)
        found = []
        for domain in sorted(sites, key=lambda domain: (-len(sites[domain]["answers"]), domain)):
            known = (self.run.sources or {}).get(domain) or {}
            if domain == client.domain:
                kind = "own"
            elif any(rival.domain and rival.domain == domain for rival in rivals):
                kind = "competitor"
            else:
                kind = known.get("type") or firstrun._kind(domain, client.domain, [rival.name for rival in rivals])
                kind = "other" if kind == "own" else kind
            pages = sorted(sites[domain]["pages"].items(), key=lambda page: (-len(page[1]), page[0]))
            found.append(
                {
                    "domain": domain,
                    "type": kind,
                    "count": len(sites[domain]["answers"]),
                    "brandListed": kind == "own" or bool(known.get("brandListed")),
                    # Who a page names is known once it was read (`fixes.read_pages`)
                    "pages": [{"url": url, "title": sites[domain]["titles"].get(url), "count": len(cited), "mentions": (known.get("pages") or {}).get(url)} for url, cited in pages[:10]],
                }
            )
        return found

    def results(self, prompts: List[Prompt], brands: List[Brand]) -> List[Dict[str, Any]]:
        """The questions this run asked, each with its answers; mentions of the tracked brands only."""
        ids = {brand.id for brand in brands}
        by_prompt: Dict[str, List[Answer]] = defaultdict(list)
        for answer in self.answers:
            by_prompt[answer.prompt_id].append(answer)
        return [
            {
                "prompt": prompt_json(prompt),
                "answers": [
                    {
                        "sample": sample,
                        "engine": answer.engine,
                        "text": answer.text,
                        "mentions": [
                            {"brandId": mention.brand_id, "position": mention.position, "tone": mention.tone, "recommended": mention.recommended}
                            for mention in sorted(self.mentions[answer.id], key=lambda mention: mention.position)
                            if mention.brand_id in ids
                        ],
                        "citations": [{"url": citation.url, "domain": citation.domain, "title": citation.title} for citation in self.citations[answer.id]],
                        "searches": answer.searches or [],
                    }
                    for sample, answer in enumerate(sorted(by_prompt[prompt.id], key=lambda answer: (answer.engine, answer.sample)), start=1)
                ],
            }
            for prompt in prompts
            if by_prompt[prompt.id]
        ]

    def untracked(self, brands: List[Brand], dismissed: List[str]) -> List[Dict[str, Any]]:
        ids = {brand.id for brand in brands}
        hidden = {name.casefold() for name in dismissed}
        named: Dict[str, set] = defaultdict(set)
        spelled: Dict[str, str] = {}
        for answer in self.answers:
            for mention in self.mentions[answer.id]:
                if mention.brand_id not in ids:
                    key = mention.name.casefold()
                    named[key].add(answer.id)
                    spelled.setdefault(key, mention.name)
        return [{"name": spelled[key], "answers": len(answers), "dismissed": key in hidden} for key, answers in sorted(named.items(), key=lambda item: (-len(item[1]), item[0]))]

    def condition(self, brands: List[Brand], wrong_facts: int = 0) -> Dict[str, Any]:
        """The condition score, by the formula of `frontend/src/shared/helpers/condition.ts`."""
        client = next(brand for brand in brands if brand.own)
        scores = self.scores(brands)
        mine = next(score for score in scores if score["brandId"] == client.id)
        leader = max([score["visibility"] for score in scores], default=0.0)
        questions = {answer.prompt_id for answer in self.answers}
        named = {answer.prompt_id for answer in self.answers if any(mention.brand_id == client.id for mention in self.mentions[answer.id])}
        listable = [source for source in self.sources(brands) if source["type"] not in ("own", "competitor")]
        cited = sum(source["count"] for source in listable)
        listed = sum(source["count"] for source in listable if source["brandListed"])
        out_of_100 = lambda value: min(100, max(0, half_up(value)))  # noqa: E731
        areas = {
            "visibility": out_of_100(mine["visibility"] * 100),
            "competition": out_of_100(mine["visibility"] / leader * 100) if leader > 0 else 0,
            "coverage": out_of_100(len(named) / len(questions) * 100) if questions else 0,
            "sources": out_of_100(listed / cited * 100) if cited > 0 else 100,
            "accuracy": out_of_100((mine["sentiment"] if mine["sentiment"] is not None else 50) - WRONG_FACT_PENALTY * wrong_facts),
        }
        return {"score": half_up(sum(areas.values()) / len(areas)), "areas": areas}


def _checks(db: Db, project: Project, prompt_ids: List[str], until: Optional[str]) -> List[_Check]:
    """The project's finished runs, oldest first, each over the questions asked for; a run that asked none of them is left out."""
    runs = list(db.scalars(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at)))
    if until is not None:
        index = next((index for index, run in enumerate(runs) if run.id == until), None)
        if index is None:
            raise ProjectError(404, "run_not_found")
        runs = runs[: index + 1]
    if not runs or not prompt_ids:
        return []
    answers = list(db.scalars(select(Answer).where(Answer.run_id.in_([run.id for run in runs]), Answer.prompt_id.in_(prompt_ids))))
    answer_ids = [answer.id for answer in answers]
    mentions: Dict[str, List[Mention]] = defaultdict(list)
    citations: Dict[str, List[Citation]] = defaultdict(list)
    if answer_ids:
        for mention in db.scalars(select(Mention).where(Mention.answer_id.in_(answer_ids))):
            mentions[mention.answer_id].append(mention)
        for citation in db.scalars(select(Citation).where(Citation.answer_id.in_(answer_ids)).order_by(Citation.id)):
            citations[citation.answer_id].append(citation)
    by_run: Dict[str, List[Answer]] = defaultdict(list)
    for answer in answers:
        by_run[answer.run_id].append(answer)
    return [_Check(run, by_run[run.id], mentions, citations) for run in runs if by_run[run.id]]


def _wrong_facts(db: Db, project: Project, checks: List[_Check], prompt_ids: set) -> List[Dict[str, Any]]:
    """The wrong facts the latest of these checks still found, each with when it was first found."""
    if not checks:
        return []
    when = {run.id: run.collected_at for run in db.scalars(select(Run).where(Run.project_id == project.id))}
    latest = checks[-1].run
    return [
        {"claim": fact.claim, "correct": fact.correct, "promptId": fact.prompt_id, "foundAt": iso(when.get(fact.first_run_id, latest.collected_at))}
        for fact in db.scalars(select(WrongFact).where(WrongFact.project_id == project.id))
        if fact.last_run_id == latest.id and fact.prompt_id in prompt_ids
    ]


def report(db: Db, project: Project, language: Optional[str] = None, topic: Optional[str] = None, prompt_id: Optional[str] = None, run_id: Optional[str] = None) -> Dict[str, Any]:
    brands = brands_of(db, project.id)
    prompts = prompts_of(db, project.id)
    if prompt_id is not None:
        # One question's report, archived or not
        prompts = [prompt for prompt in prompts if prompt.id == prompt_id]
        if not prompts:
            raise ProjectError(404, "prompt_not_found")
    else:
        prompts = [prompt for prompt in prompts if prompt.archived_at is None and (not language or prompt.language == language) and (not topic or prompt.topic == topic)]
    checks = _checks(db, project, [prompt.id for prompt in prompts], run_id)
    latest = checks[-1] if checks else None
    before = checks[-2] if len(checks) > 1 else None

    scores = latest.scores(brands) if latest else [{"brandId": brand.id, "visibility": 0.0, "shareOfVoice": 0.0, "avgPosition": None, "sentiment": None} for brand in brands]
    earlier = {score["brandId"]: score["visibility"] for score in before.scores(brands)} if before else {}
    wrong = _wrong_facts(db, project, checks, {prompt.id for prompt in prompts})
    method = dict(latest.run.method or {}) if latest else {"engine": "ChatGPT", "model": "", "webSearch": True, "samples": 1}
    return {
        "project": project_json(db, project),
        "period": "week",
        "method": {**method, "collectedAt": iso(latest.run.collected_at if latest else now())},
        "scores": [{**score, "trend": round(score["visibility"] - earlier.get(score["brandId"], score["visibility"]), 4)} for score in scores],
        "prompts": latest.results(prompts, brands) if latest else [],
        "topSources": latest.sources(brands) if latest else [],
        "wrongFacts": wrong,
        # False: nobody checked this run's answers against the client's facts, so an empty list is not "none found"
        "factsChecked": bool(latest and latest.run.facts_checked),
        # What each assistant said of the business by name at this check; [] when no brand question was asked
        "brandView": (latest.run.brand_view if latest else None) or [],
        "history": [{"runId": check.run.id, "collectedAt": iso(check.run.collected_at), "scores": check.scores(brands)} for check in checks],
        "sourceHistory": [
            {
                "collectedAt": iso(check.run.collected_at),
                "answers": len(check.answers),
                "sources": [{"domain": source["domain"], "type": source["type"], "count": source["count"], "pages": [{"url": page["url"], "count": page["count"]} for page in source["pages"]]} for source in check.sources(brands)],
            }
            for check in checks
        ],
        # A condition is the whole project's
        "conditionHistory": [] if prompt_id is not None else [check.condition(brands, len(wrong) if check is latest else 0) for check in checks],
        "untrackedBrands": latest.untracked(brands, project.dismissed or []) if latest else [],
        "nextRunAt": next_check(project.plan) if settings.weekly_runs and project.paid and prompts and run_id is None else None,
    }


def next_check(plan: str) -> str:
    """The plan's first check day after now, at 06:00 in Tashkent (01:00 UTC)."""
    moment = now().replace(hour=1, minute=0, second=0, microsecond=0)
    while moment <= now() or moment.weekday() not in CHECK_DAYS.get(plan, [0]):
        moment += datetime.timedelta(days=1)
    return iso(moment)


# --- what the pages change -----------------------------------------------------------------------------
# Every function here changes the session and leaves the commit to its caller (`main.in_project`).

FACT_MAX_LENGTH = 300
NAME_MAX_LENGTH = 120


def _names(values: Any, limit: int = 30) -> List[str]:
    """A list of short names as typed: trimmed, no empties, no repeats (case aside)."""
    kept: Dict[str, str] = {}
    for value in values if isinstance(values, list) else []:
        name = _clean(value)[:NAME_MAX_LENGTH]
        if name:
            kept.setdefault(name.casefold(), name)
    return list(kept.values())[:limit]


def _tracked(db: Db, project: Project) -> List[Prompt]:
    return [prompt for prompt in prompts_of(db, project.id) if prompt.archived_at is None]


def _room(db: Db, project: Project, more: int) -> None:
    if len(_tracked(db, project)) + more > PLAN_LIMITS[project.plan]["prompts"]:
        raise ProjectError(409, "prompt_limit")


def _prompt(db: Db, project: Project, prompt_id: str) -> Prompt:
    prompt = db.get(Prompt, prompt_id)
    if prompt is None or prompt.project_id != project.id:
        raise ProjectError(404, "prompt_not_found")
    return prompt


def _language(value: Any) -> str:
    return "ru" if value == "ru" else "uz"


def topics(db: Db, project: Project) -> List[str]:
    """The project's topics in their order: those of its tracked questions, then the ones without a question yet."""
    return list(dict.fromkeys([prompt.topic for prompt in _tracked(db, project) if prompt.topic] + list(project.topics or [])))


def tags(db: Db, project: Project) -> List[Dict[str, Any]]:
    counted = Counter(tag for prompt in _tracked(db, project) for tag in prompt.tags or [])
    names = {name.casefold(): name for name in list(project.tags or []) + list(counted)}
    return [{"name": name, "prompts": counted.get(name, 0)} for name in sorted(names.values(), key=str.casefold)]


def add_prompts(db: Db, project: Project, body: Dict[str, Any]) -> List[Dict[str, Any]]:
    """One question or several, all or none. Asked from the next check."""
    existing = prompts_of(db, project.id)
    added: List[Prompt] = []
    for given in body.get("prompts") or []:
        text = _clean(given.get("text"))
        if not text:
            raise ProjectError(422, "text_required")
        if any(_same(text, prompt.text) for prompt in existing + added):
            raise ProjectError(422, "repeated_prompt")
        added.append(Prompt(project_id=project.id, text=text[:500], language=_language(given.get("language")), topic=_clean(given.get("topic"))[:NAME_MAX_LENGTH], location=_clean(given.get("location")) or project.city, tags=[], position=len(existing) + len(added)))
    if not added:
        raise ProjectError(422, "no_prompts")
    _room(db, project, len(added))
    db.add_all(added)
    db.flush()
    return [prompt_json(prompt) for prompt in added]


def update_prompt(db: Db, project: Project, prompt_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    prompt = _prompt(db, project, prompt_id)
    text = _clean(body.get("text"))
    if not text:
        raise ProjectError(422, "text_required")
    if any(other.id != prompt.id and _same(text, other.text) for other in prompts_of(db, project.id)):
        raise ProjectError(422, "repeated_prompt")
    prompt.text, prompt.language, prompt.topic = text[:500], _language(body.get("language")), _clean(body.get("topic"))[:NAME_MAX_LENGTH]
    prompt.location = _clean(body.get("location")) or prompt.location or project.city
    return prompt_json(prompt)


def update_prompts(db: Db, project: Project, body: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Several questions at once: archive them, track them again, move them to a topic, set tags or fact-checking."""
    chosen = [_prompt(db, project, prompt_id) for prompt_id in dict.fromkeys(body.get("ids") or [])]
    if body.get("archived") is False:
        _room(db, project, sum(1 for prompt in chosen if prompt.archived_at is not None))
    for prompt in chosen:
        if body.get("archived") is True and prompt.archived_at is None:
            prompt.archived_at = now()
        elif body.get("archived") is False:
            prompt.archived_at = None
        if isinstance(body.get("topic"), str):
            prompt.topic = _clean(body["topic"])[:NAME_MAX_LENGTH]
        if isinstance(body.get("tags"), list):
            prompt.tags = _names(body["tags"])
        if isinstance(body.get("factCheck"), bool):
            prompt.fact_check = body["factCheck"]
    return [prompt_json(prompt) for prompt in chosen]


def add_topic(db: Db, project: Project, body: Dict[str, Any]) -> List[str]:
    name = _clean(body.get("name"))[:NAME_MAX_LENGTH]
    if not name:
        raise ProjectError(422, "name_required")
    if any(_same(name, topic) for topic in topics(db, project)):
        raise ProjectError(409, "topic_exists")
    project.topics = list(project.topics or []) + [name]
    return topics(db, project)


def rename_topic(db: Db, project: Project, topic: str, body: Dict[str, Any]) -> List[str]:
    name = _clean(body.get("name"))[:NAME_MAX_LENGTH]
    if not name:
        raise ProjectError(422, "name_required")
    if any(_same(name, other) and not _same(other, topic) for other in topics(db, project)):
        raise ProjectError(409, "topic_exists")
    for prompt in prompts_of(db, project.id):
        if _same(prompt.topic, topic):
            prompt.topic = name
    project.topics = [name if _same(kept, topic) else kept for kept in project.topics or []]
    return topics(db, project)


def delete_topic(db: Db, project: Project, topic: str) -> None:
    """Its tracked questions are archived: they keep their answers."""
    for prompt in _tracked(db, project):
        if _same(prompt.topic, topic):
            prompt.archived_at = now()
    project.topics = [kept for kept in project.topics or [] if not _same(kept, topic)]


def add_tags(db: Db, project: Project, body: Dict[str, Any]) -> List[Dict[str, Any]]:
    have = {tag["name"].casefold() for tag in tags(db, project)}
    project.tags = list(project.tags or []) + [name for name in _names(body.get("names")) if name.casefold() not in have]
    return tags(db, project)


def rename_tag(db: Db, project: Project, tag: str, body: Dict[str, Any]) -> List[Dict[str, Any]]:
    name = _clean(body.get("name"))[:NAME_MAX_LENGTH]
    if not name:
        raise ProjectError(422, "name_required")
    if any(_same(name, other["name"]) and not _same(other["name"], tag) for other in tags(db, project)):
        raise ProjectError(409, "tag_exists")
    for prompt in prompts_of(db, project.id):
        prompt.tags = _names([name if _same(kept, tag) else kept for kept in prompt.tags or []])
    project.tags = _names([name if _same(kept, tag) else kept for kept in project.tags or []] + [name])
    return tags(db, project)


def delete_tag(db: Db, project: Project, tag: str) -> None:
    for prompt in prompts_of(db, project.id):
        prompt.tags = [kept for kept in prompt.tags or [] if not _same(kept, tag)]
    project.tags = [kept for kept in project.tags or [] if not _same(kept, tag)]


def _spellings(brand: Brand) -> List[str]:
    return [brand.name, *(brand.aliases or [])]


def _claim_mentions(db: Db, project: Project, brand: Brand) -> None:
    """A brand tracked from now on gets the mentions the answers already hold under its name, so its numbers appear at once."""
    run_ids = list(db.scalars(select(Run.id).where(Run.project_id == project.id)))
    if not run_ids:
        return
    answer_ids = list(db.scalars(select(Answer.id).where(Answer.run_id.in_(run_ids))))
    claimed = set()
    for mention in db.scalars(select(Mention).where(Mention.answer_id.in_(answer_ids), Mention.brand_id.is_(None))):
        if mention.answer_id not in claimed and (_same(mention.name, brand.name) or web.names(mention.name, _spellings(brand))):
            mention.brand_id = brand.id
            claimed.add(mention.answer_id)


def add_competitor(db: Db, project: Project, body: Dict[str, Any]) -> None:
    name = _clean(body.get("name"))[:NAME_MAX_LENGTH]
    if not name:
        raise ProjectError(422, "name_required")
    brands = brands_of(db, project.id)
    if any(_same(name, brand.name) for brand in brands):
        raise ProjectError(409, "brand_tracked")
    if len(brands) - 1 >= PLAN_LIMITS[project.plan]["competitors"]:
        raise ProjectError(409, "competitor_limit")
    # A competitor added later goes last: the order is a brand's chart color
    brand = Brand(project_id=project.id, name=name, aliases=_names(body.get("aliases")), domain=web.domain_of(body["domain"]) if body.get("domain") else "", position=max(brand.position for brand in brands) + 1)
    db.add(brand)
    db.flush()
    _claim_mentions(db, project, brand)
    project.dismissed = [hidden for hidden in project.dismissed or [] if not _same(hidden, name)]


def _competitor(db: Db, project: Project, brand_id: str) -> Brand:
    brand = db.get(Brand, brand_id)
    if brand is None or brand.project_id != project.id or brand.own:
        raise ProjectError(404, "brand_not_found")
    return brand


def remove_competitor(db: Db, project: Project, brand_id: str) -> None:
    """The answers keep its mentions as an untracked name, so it can be tracked again."""
    brand = _competitor(db, project, brand_id)
    for mention in db.scalars(select(Mention).where(Mention.brand_id == brand.id)):
        mention.brand_id = None
    db.delete(brand)


def _rename(db: Db, project: Project, brand: Brand, body: Dict[str, Any]) -> None:
    if "name" in body:
        name = _clean(body["name"])[:NAME_MAX_LENGTH]
        if not name:
            raise ProjectError(422, "name_required")
        if any(other.id != brand.id and _same(name, other.name) for other in brands_of(db, project.id)):
            raise ProjectError(409, "brand_tracked")
        brand.name = name
    if "aliases" in body:
        brand.aliases = _names(body["aliases"])
    if "domain" in body:
        if brand.own or body["domain"]:
            try:
                brand.domain = firstrun.normalize(body["domain"] or "")
            except firstrun.FirstRunError as error:
                raise ProjectError(422, error.code) from error
        else:
            brand.domain = ""


def update_competitor(db: Db, project: Project, brand_id: str, body: Dict[str, Any]) -> None:
    _rename(db, project, _competitor(db, project, brand_id), body)


def update_project(db: Db, project: Project, body: Dict[str, Any]) -> None:
    """The brand profile: any of the fields, the rest stay."""
    _rename(db, project, next(brand for brand in brands_of(db, project.id) if brand.own), body)
    for field in ("description", "category", "city"):
        if isinstance(body.get(field), str):
            setattr(project, field, _clean(body[field])[:1000 if field == "description" else 200])
    if _country(body.get("country")):
        project.country = _country(body.get("country"))
    for field in ("services", "customers", "identity"):
        if isinstance(body.get(field), list):
            setattr(project, field, _names(body[field]))


def dismiss_brand(db: Db, project: Project, body: Dict[str, Any]) -> None:
    name = _clean(body.get("name"))
    hidden = [kept for kept in project.dismissed or [] if not _same(kept, name)]
    project.dismissed = hidden + [name] if body.get("dismissed") and name else hidden


def set_facts(db: Db, project: Project, body: Dict[str, Any]) -> List[str]:
    facts = list(dict.fromkeys(_clean(fact) for fact in body.get("facts") or [] if _clean(fact)))
    if any(len(fact) > FACT_MAX_LENGTH for fact in facts):
        raise ProjectError(422, "fact_too_long")
    if len(facts) > PLAN_LIMITS[project.plan]["facts"]:
        raise ProjectError(409, "fact_limit")
    project.facts = facts
    return facts


def report_settings(project: Project) -> Dict[str, Any]:
    return {"telegramChat": None, "email": "", "language": "uz", "agencyName": "", **(project.report_settings or {})}


def set_report_settings(db: Db, project: Project, body: Dict[str, Any]) -> Dict[str, Any]:
    kept = report_settings(project)
    if isinstance(body.get("email"), str):
        email = body["email"].strip()
        if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]{2,}", email):
            raise ProjectError(422, "bad_email")
        kept["email"] = email
    if body.get("language") in ("uz", "ru", "en"):
        kept["language"] = body["language"]
    if isinstance(body.get("agencyName"), str):
        if body["agencyName"].strip() and project.plan != "agency":
            raise ProjectError(403, "agency_plan_only")
        kept["agencyName"] = body["agencyName"].strip()[:NAME_MAX_LENGTH]
    if body.get("telegram") == "connect":
        # The bot doesn't exist yet, and no chat may be shown as tied when none is
        raise ProjectError(501, "telegram_not_built")
    if body.get("telegram") == "disconnect":
        kept["telegramChat"] = None
    project.report_settings = kept
    return kept
