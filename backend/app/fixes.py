"""The "what to do" half: the cited pages read, the actions made by rule, wrong facts, proof after a fix.

    read_pages      opens the most cited pages (plain HTTP, no model) and notes which tracked brands each names:
                    "are you on them" for a site, and who is named on each page
    sync            the actions a project's latest check calls for, by rule:
                      listing    a site the answers cite, that a business can be listed on, without the client
                      content    a topic whose questions name competitors and never the client
                      technical  a check its website failed
                      fact       a wrong fact found
                    A rule's action keeps its row from check to check (its `key`), so the client's status stays.
    check_facts     a model reads the answers that name the client against the client's own facts
    write_briefs    a model writes what a page must say, for the content actions without a brief

The two that use a model run only inside a live weekly check.
"""

from __future__ import annotations

import datetime
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session as Db

from . import engines, projects
from .db import Action, Answer, Brand, Mention, Project, Prompt, Run, SessionLocal, WrongFact, now
from .engines import web
from .firstrun import STR, arr, obj

LISTABLE = ("news", "directory", "social", "other")
MAX_LISTINGS = 8
PAGES_TO_READ = 15
STEP_COUNT = 3  # `ACTION_STEP_COUNT` in the frontend
STATUSES = ("new", "in_progress", "done", "declined")
IMPACTS = ["high", "medium", "low"]
PAGE_TYPES = ("home", "service", "prices", "article", "about", "other")
PRICE_WORDS = ("price", "narx", "цен", "стоим", "tarif", "тариф", "qancha", "сколько")


# --- the cited pages -----------------------------------------------------------------------------------


def read_pages(project_id: str, run_id: str) -> None:
    """Reads the run's most cited pages on sites a business can be listed on, and keeps who each names."""
    with SessionLocal() as db:
        project, run = db.get(Project, project_id), db.get(Run, run_id)
        if project is None or run is None:
            return
        brands = projects.brands_of(db, project_id)
        client = next(brand for brand in brands if brand.own)
        report = projects.report(db, project, run_id=run_id)
        pages = [(source["domain"], page["url"]) for source in report["topSources"] if source["type"] in LISTABLE for page in source["pages"][:2]]
        known = dict(run.sources or {})
        pages = [(domain, url) for domain, url in pages if url not in ((known.get(domain) or {}).get("pages") or {})][:PAGES_TO_READ]
    if not pages:
        return
    with ThreadPoolExecutor(max_workers=5) as pool:
        fetched = list(pool.map(lambda page: web.fetch(page[1]), pages))
    with SessionLocal() as db:
        run = db.get(Run, run_id)
        sources = {domain: dict(found) for domain, found in (run.sources or {}).items()}
        for (domain, url), page in zip(pages, fetched):
            site = sources.setdefault(domain, {"type": next((source["type"] for source in report["topSources"] if source["domain"] == domain), "other"), "brandListed": False})
            named = [brand.id for brand in brands if web.names(page[0], [brand.name, *(brand.aliases or [])])] if page else None
            site["pages"] = {**(site.get("pages") or {}), url: named}
            if named and client.id in named:
                site["brandListed"] = True
        run.sources = sources
        db.commit()


# --- the actions ---------------------------------------------------------------------------------------


def _named(result: Dict[str, Any], brand_id: str) -> int:
    return sum(1 for answer in result["answers"] if any(mention["brandId"] == brand_id for mention in answer["mentions"]))


def _cites(result: Dict[str, Any], domain: str) -> int:
    return sum(1 for answer in result["answers"] if any(citation["domain"] == domain for citation in answer["citations"]))


def suggested(db: Db, project: Project, report: Dict[str, Any]) -> List[Dict[str, Any]]:
    """What the latest check calls for: key, kind, details, impact and the questions each should move."""
    client = report["project"]["brand"]["id"]
    rivals = [brand["id"] for brand in report["project"]["competitors"]]
    results = report["prompts"]
    total = sum(len(result["answers"]) for result in results)
    found: List[Dict[str, Any]] = []

    for fact in db.scalars(select(WrongFact).where(WrongFact.project_id == project.id)):
        if any(wrong["claim"] == fact.claim for wrong in report["wrongFacts"]):
            # A wrong price or opening hour costs customers directly
            found.append({"key": f"fact:{fact.id}", "kind": "fact", "details": {"claim": fact.claim, "correct": fact.correct}, "impact": "high", "promptIds": [fact.prompt_id] if fact.prompt_id else []})

    def lists_businesses(source: Dict[str, Any]) -> bool:
        """News, directories and social pages take listings. Any other site only when a page of it, once read,
        names two or more tracked competitors: a comparison or a catalog, not one business's own website."""
        if source["type"] != "other":
            return True
        return any(len(set(page["mentions"] or []) & set(rivals)) >= 2 for page in source["pages"])

    unlisted = [source for source in report["topSources"] if not source["brandListed"] and source["type"] in LISTABLE and lists_businesses(source)]
    for source in unlisted[:MAX_LISTINGS]:
        domain = source["domain"]
        citing = [result for result in results if _cites(result, domain) > 0]
        # Questions where the client is missing come first: those are the ones a listing can win
        citing.sort(key=lambda result: (_named(result, client) > 0, -_cites(result, domain)))
        beside = Counter(mention["brandId"] for result in citing for answer in result["answers"] if any(citation["domain"] == domain for citation in answer["citations"]) for mention in answer["mentions"] if mention["brandId"] in rivals)
        share = source["count"] / total if total else 0
        found.append(
            {
                "key": f"listing:{domain}",
                "kind": "listing",
                "details": {"domain": domain, "sourceType": source["type"], "answers": source["count"], "competitorIds": [brand_id for brand_id, _ in beside.most_common()]},
                # A site cited by a tenth of the answers or more is worth the most
                "impact": "high" if share >= 0.1 else "medium" if share >= 0.05 else "low",
                "promptIds": [result["prompt"]["id"] for result in citing],
            }
        )

    missing = [result for result in results if _named(result, client) == 0 and any(_named(result, rival) > 0 for rival in rivals)]
    for topic in dict.fromkeys(result["prompt"]["topic"] for result in missing if result["prompt"]["topic"]):
        ids = [result["prompt"]["id"] for result in missing if result["prompt"]["topic"] == topic]
        found.append({"key": f"content:{topic.casefold()}", "kind": "content", "details": {"topic": topic, "url": None, "pageType": None, "brief": None}, "impact": "high" if len(ids) > 1 else "medium", "promptIds": ids})

    for check in project.site_checks or []:
        if not check.get("passed"):
            name = check["check"]
            # Prices as pictures cost the questions about prices; the other fixes help every question
            about = [result["prompt"]["id"] for result in results if name != "prices_as_images" or any(word in f"{result['prompt']['topic']} {result['prompt']['text']}".casefold() for word in PRICE_WORDS)]
            found.append({"key": f"technical:{name}", "kind": "technical", "details": {"check": name}, "impact": "high" if name in ("prices_as_images", "ai_bots_blocked") else "medium", "promptIds": about[:5]})
    return found


def brand_facts(db: Db, project: Project) -> None:
    """The statements of the latest check's brand answers that the website contradicts, kept as wrong facts.
    No model: the brand answers were read when the check was made. The caller commits."""
    run = db.scalar(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at.desc()))
    if run is None or not run.brand_view:
        return
    language = (project.report_settings or {}).get("language", "uz")
    language = language if language in ("uz", "ru", "en") else "uz"
    saved = {fact.claim.casefold(): fact for fact in db.scalars(select(WrongFact).where(WrongFact.project_id == project.id))}
    for view in run.brand_view:
        for statement in view.get("statements") or []:
            if statement.get("check") != "contradicted" or not statement.get("correct"):
                continue
            claim = statement["text"][language]
            fact = saved.get(claim.casefold())
            if fact:
                fact.last_run_id = run.id
            else:
                saved[claim.casefold()] = fact = WrongFact(
                    project_id=project.id,
                    claim=claim,
                    correct=statement["correct"][language],
                    prompt_id="",
                    first_run_id=run.id,
                    last_run_id=run.id,
                    details={"claim": statement["text"], "correct": statement["correct"], "question": view.get("question"), "engine": view.get("name")},
                )
                db.add(fact)
    # The answers about the business were compared with its website: "none found" is now a finding
    run.facts_checked = True
    db.flush()


def sync(db: Db, project: Project) -> None:
    """Brings the project's actions in line with its latest check. The caller commits."""
    brand_facts(db, project)
    report = projects.report(db, project)
    if not report["history"]:
        return
    wanted = {action["key"]: action for action in suggested(db, project, report)}
    for action in list(db.scalars(select(Action).where(Action.project_id == project.id))):
        fresh = wanted.pop(action.key, None)
        if fresh is None:
            # No longer called for: an untouched suggestion goes, anything the client took on or added stays
            if action.status == "new" and not action.key.startswith("page:"):
                db.delete(action)
        elif action.status in ("new", "in_progress"):
            # The brief a model wrote stays; the numbers follow the latest check
            brief = (action.details or {}).get("brief")
            action.details = {**fresh["details"], **({"brief": brief} if brief and fresh["kind"] == "content" else {})}
            action.impact, action.prompt_ids = fresh["impact"], fresh["promptIds"]
    for fresh in wanted.values():
        db.add(Action(project_id=project.id, key=fresh["key"], kind=fresh["kind"], details=fresh["details"], impact=fresh["impact"], prompt_ids=fresh["promptIds"]))
    db.flush()


def _proof(db: Db, project: Project, action: Action, runs: List[Run], client: Brand) -> Optional[Dict[str, Any]]:
    """Fix → proof: the client's visibility on the action's questions in the last check before it was done, and in the latest one."""
    if action.status != "done" or action.done_at is None or not action.prompt_ids:
        return None
    before = [run for run in runs if run.collected_at <= action.done_at]
    after = [run for run in runs if run.collected_at > action.done_at]
    if not before or not after:
        return None

    def counted(run: Run) -> Tuple[int, int]:
        """The answers to the action's questions in a check, and those naming the client."""
        answers = list(db.scalars(select(Answer.id).where(Answer.run_id == run.id, Answer.prompt_id.in_(action.prompt_ids))))
        if not answers:
            return 0, 0
        named = set(db.scalars(select(Mention.answer_id).where(Mention.answer_id.in_(answers), Mention.brand_id == client.id)))
        return len(named), len(answers)

    (was, of_was), (now, of_now) = counted(before[-1]), counted(after[-1])
    share = lambda named, answers: round(named / answers, 4) if answers else 0.0  # noqa: E731
    # The counts too since 21 Nov 2026 (report spec Phase 0 item 0.3): the report shows each share beside its count
    return {"before": share(was, of_was), "after": share(now, of_now), "runs": len(after), "counts": {"before": [was, of_was], "after": [now, of_now]}}


def listed(db: Db, project: Project) -> List[Dict[str, Any]]:
    runs = list(db.scalars(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at)))
    client = next(brand for brand in projects.brands_of(db, project.id) if brand.own)
    actions = list(db.scalars(select(Action).where(Action.project_id == project.id)))
    actions.sort(key=lambda action: (IMPACTS.index(action.impact) if action.impact in IMPACTS else 1, action.created_at))
    return [action_json(db, project, action, runs, client) for action in actions]


def action_json(db: Db, project: Project, action: Action, runs: Optional[List[Run]] = None, client: Optional[Brand] = None) -> Dict[str, Any]:
    if runs is None:
        runs = list(db.scalars(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at)))
    client = client or next(brand for brand in projects.brands_of(db, project.id) if brand.own)
    return {
        "id": action.id,
        "status": action.status,
        "impact": action.impact,
        "promptIds": action.prompt_ids or [],
        "createdAt": projects.iso(action.created_at),
        "doneAt": projects.iso(action.done_at) if action.done_at else None,
        "stepsDone": action.steps_done or [],
        "proof": _proof(db, project, action, runs, client),
        "kind": action.kind,
        **(action.details or {}),
    }


def _own(db: Db, project: Project, action_id: str) -> Action:
    action = db.get(Action, action_id)
    if action is None or action.project_id != project.id:
        raise projects.ProjectError(404, "action_not_found")
    return action


def _set_status(action: Action, status: Any) -> None:
    if status not in STATUSES:
        raise projects.ProjectError(422, "bad_status")
    if status == "done" and action.status != "done":
        action.done_at = now()
    elif status != "done":
        action.done_at = None
    action.status = status


def update(db: Db, project: Project, action_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    action = _own(db, project, action_id)
    if "status" in body:
        _set_status(action, body["status"])
    if isinstance(body.get("stepsDone"), list):
        action.steps_done = sorted({step for step in body["stepsDone"] if isinstance(step, int) and 0 <= step < STEP_COUNT})
    db.flush()
    return action_json(db, project, action)


def update_many(db: Db, project: Project, body: Dict[str, Any]) -> List[Dict[str, Any]]:
    chosen = [_own(db, project, action_id) for action_id in dict.fromkeys(body.get("ids") or [])]
    for action in chosen:
        _set_status(action, body.get("status"))
    db.flush()
    return [action_json(db, project, action) for action in chosen]


BRIEF_RULES = """You prepare a brief for a page on a local business's website, so that AI assistants name the business when customers ask about a topic. Write in the language given. Be concrete and short; promise nothing the facts don't support.

Give: summary (what the page is and whom it is for, two sentences), headlines (two or three titles to choose from), metaTitle (at most 60 characters), metaDescription (at most 155 characters), argue (the one thing the page must make clear), proofPoints (four to six facts the page should show: prices, years, names, numbers; say which kind of fact, don't invent the values)."""

BRIEF_SCHEMA = obj(summary=STR, headlines=arr(STR), metaTitle=STR, metaDescription=STR, argue=STR, proofPoints=arr(STR))


def _brief(project: Project, client: Brand, topic: str, questions: List[str], page: str = "") -> Optional[Dict[str, Any]]:
    """A model writes the brief. None when no model may be asked, or it failed."""
    from .config import settings

    if settings.first_run_replay or not settings.can_read:
        return None
    language = (project.report_settings or {}).get("language", "uz")
    content = f"Language: {language}\nBusiness: {client.name} ({project.category}, {project.city})\nWhat it offers: {', '.join(project.services or [])}\nTopic: {topic}\nQuestions customers ask, where assistants name competitors and not this business:\n" + "\n".join(f"- {question}" for question in questions)
    if page:
        content += f"\n\nThe page as it is now, to rework:\n{page[:8000]}"
    try:
        return engines.write(BRIEF_RULES, content, "content_brief", BRIEF_SCHEMA)[0]
    except engines.EngineError as error:
        print(f"fixes: no brief for {topic}: {error}")
        return None


def add_content(db: Db, project: Project, body: Dict[str, Any]) -> Dict[str, Any]:
    """"Add a page": an action to rework a page of the client's, from its address or its text."""
    topic = " ".join(str(body.get("topic") or "").split())[:120]
    url = str(body.get("url") or "").strip()
    document = str(body.get("document") or "")
    if not topic or not (url or document.strip()):
        raise projects.ProjectError(422, "topic_and_page_required")
    if url and not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    page_type = body.get("pageType") if body.get("pageType") in PAGE_TYPES else "other"
    client = next(brand for brand in projects.brands_of(db, project.id) if brand.own)
    prompts = [prompt for prompt in projects.prompts_of(db, project.id) if prompt.archived_at is None and prompt.topic.casefold() == topic.casefold()]
    text = document
    if url and not text:
        fetched = web.fetch(url)
        text = fetched[0] if fetched else ""
    action = Action(
        project_id=project.id,
        key=f"page:{datetime.datetime.now().timestamp()}",
        kind="content",
        details={"topic": topic, "url": url or None, "pageType": page_type, "brief": _brief(project, client, topic, [prompt.text for prompt in prompts], text or " ")},
        impact="medium",
        prompt_ids=[prompt.id for prompt in prompts],
    )
    db.add(action)
    db.flush()
    return action_json(db, project, action)


def write_briefs(db: Db, project: Project, limit: int = 5) -> None:
    """Inside a live check: briefs for the content actions that have none."""
    client = next(brand for brand in projects.brands_of(db, project.id) if brand.own)
    texts = {prompt.id: prompt.text for prompt in projects.prompts_of(db, project.id)}
    waiting = [action for action in db.scalars(select(Action).where(Action.project_id == project.id, Action.kind == "content")) if not (action.details or {}).get("brief") and action.status in ("new", "in_progress")]
    for action in waiting[:limit]:
        brief = _brief(project, client, action.details["topic"], [texts[prompt_id] for prompt_id in action.prompt_ids or [] if prompt_id in texts])
        if brief:
            action.details = {**action.details, "brief": brief}
    db.flush()


# --- wrong facts ---------------------------------------------------------------------------------------

FACT_RULES = """You check what an AI assistant said about one business against facts the business itself confirmed.

List only statements in the answer that are about this business and contradict one of the facts (a different price, address, phone, opening hour, year, name, service that the facts rule out). A statement the facts say nothing about is not wrong. Something the answer leaves out is not wrong. When unsure, list nothing.

For each: claim (what the answer states, one short sentence, in the answer's language) and correct (what is true according to the facts, one short sentence, in the same language)."""

FACT_SCHEMA = obj(wrong=arr(obj(claim=STR, correct=STR)))


def check_facts(db: Db, project: Project, run: Run, answers: List[Dict[str, Any]]) -> float:
    """Inside a live check: the answers that name the client, read against its facts. Returns the cost in US dollars.

    `answers` are the run's answers as collected: each with its `prompt` (a Prompt), `text` and `names_client`.
    """
    facts = [fact for fact in project.facts or [] if fact]
    if not facts or projects.PLAN_LIMITS[project.plan]["facts"] == 0:
        return 0.0
    client = next(brand for brand in projects.brands_of(db, project.id) if brand.own)
    about = [answer for answer in answers if answer.get("names_client") and answer["prompt"].fact_check]
    known = "\n".join(f"- {fact}" for fact in facts)

    def read(answer: Dict[str, Any]) -> Any:
        try:
            return engines.read(FACT_RULES, f"Business: {client.name}\n\nFacts it confirmed:\n{known}\n\nQuestion: {answer['prompt'].text}\n\nAnswer:\n{answer['text']}", "wrong_facts", FACT_SCHEMA)
        except engines.EngineError as error:
            print(f"fixes: facts not checked on an answer: {error}")
            return {"wrong": []}, 0.0

    cost = 0.0
    saved = {fact.claim.casefold(): fact for fact in db.scalars(select(WrongFact).where(WrongFact.project_id == project.id))}
    with ThreadPoolExecutor(max_workers=6) as pool:
        for answer, (found, usd) in zip(about, pool.map(read, about)):
            cost += usd
            for wrong in found["wrong"]:
                claim = " ".join(wrong["claim"].split())
                if not claim:
                    continue
                fact = saved.get(claim.casefold())
                if fact:
                    fact.last_run_id = run.id
                else:
                    saved[claim.casefold()] = fact = WrongFact(project_id=project.id, claim=claim, correct=" ".join(wrong["correct"].split()), prompt_id=answer["prompt"].id, first_run_id=run.id, last_run_id=run.id)
                    db.add(fact)
    run.facts_checked = True
    db.flush()
    return cost


def after_creation(project_id: str, run_id: str) -> None:
    """A new project, outside the request that made it: the cited pages read, then the actions brought in line."""
    try:
        read_pages(project_id, run_id)
        with SessionLocal() as db:
            project = db.get(Project, project_id)
            if project:
                sync(db, project)
                db.commit()
    except Exception as error:  # a background step: it must not die silently
        print(f"fixes: project {project_id} after creation: {error!r}")
