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

from . import domains, engines, metrics, projects
from .db import Action, Answer, Brand, Mention, Project, Prompt, Run, SessionLocal, WrongFact, now
from .engines import web
from .firstrun import STR, arr, obj

MAX_LISTINGS = 8
PAGES_TO_READ = 15
STEP_COUNT = 3  # `ACTION_STEP_COUNT` in the frontend
STATUSES = ("new", "in_progress", "done", "declined")
IMPACTS = ["high", "medium", "low"]
PAGE_TYPES = ("home", "service", "prices", "article", "about", "other")
PRICE_WORDS = ("price", "narx", "цен", "стоим", "tarif", "тариф", "qancha", "сколько")
# How much a fix to the website weighs: what stops AI reading the site, or answering about prices, first; the SEO
# audit's housekeeping last (23 Nov 2026)
CHECK_IMPACT = {
    "ai_bots_blocked": "high",
    "prices_as_images": "high",
    "no_prices": "high",
    "one_language": "high",
    "no_business_markup": "medium",
    "contacts_missing": "medium",
    "no_faq": "medium",
    "weak_meta": "medium",
    "no_sitemap": "low",
    "no_llms_txt": "low",
}


# --- the cited pages -----------------------------------------------------------------------------------


def read_pages(project_id: str, run_id: str) -> None:
    """Reads the run's most cited pages on sites a business can be listed on (`domains.PLACEABLE`), and keeps
    who each names: whether the client is there, and which competitors are."""
    with SessionLocal() as db:
        project, run = db.get(Project, project_id), db.get(Run, run_id)
        if project is None or run is None:
            return
        brands = projects.brands_of(db, project_id)
        client = next(brand for brand in brands if brand.own)
        report = projects.report(db, project, run_id=run_id)
        pages = [(source["domain"], page["url"]) for source in report["topSources"] if source["domainType"] in domains.PLACEABLE for page in source["pages"][:2]]
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
            # A site's type is read from `domains` whenever the report is made: only what was found is kept here
            site = sources.setdefault(domain, {"brandListed": False})
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


def _others_named(answer: Dict[str, Any], client: str) -> bool:
    """Whether an answer names some business other than the client: a tracked competitor or one not tracked."""
    return any(mention["brandId"] != client for mention in answer["mentions"]) or bool(answer.get("others"))


def content_allowed(results: List[Dict[str, Any]], client: str, rivals: List[str]) -> bool:
    """Whether a topic's questions call for a page: the client named in none of their answers, and another business
    in at least one. The user's choice of 23 Nov 2026 ("Build the full plan"): no minimum of answers (it was
    `metrics.TOPIC_RANK_ANSWERS`, 3, and a tracked competitor, from 21 Nov), since a free check has one or two a
    topic; each action says how many answers it stands on. The report's topic ranking keeps the minimum."""
    return all(_named(result, client) == 0 for result in results) and any(_others_named(answer, client) for result in results for answer in result["answers"])


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

    # Spec §7, third-party placement: a directory, listing, media, UGC or Telegram site with a known route onto it,
    # citing competitors and not the client (Phase 0 item 0.4). Platform docs, competitor sites, search engines and
    # unclassified sites get no action: the report shows them, to watch
    unlisted = [source for source in report["topSources"] if domains.placeable(source["domainType"], source["route"], source["brandListed"], source["rivals"])]
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
                "details": {"domain": domain, "sourceType": source["type"], "domainType": source["domainType"], "route": source["route"], "answers": source["count"], "competitorIds": [brand_id for brand_id, _ in beside.most_common()]},
                # A site cited by a tenth of the answers or more is worth the most
                "impact": "high" if share >= 0.1 else "medium" if share >= 0.05 else "low",
                "promptIds": [result["prompt"]["id"] for result in citing],
            }
        )

    # A page about every topic where the answers name other businesses and never the client (`content_allowed`, the
    # user's choice of 23 Nov 2026; until then only with 3 answers and a tracked competitor)
    for topic in dict.fromkeys(result["prompt"]["topic"] for result in results if result["prompt"]["topic"]):
        theirs = [result for result in results if result["prompt"]["topic"] == topic]
        if not content_allowed(theirs, client, rivals):
            continue
        ids = [result["prompt"]["id"] for result in theirs if any(_others_named(answer, client) for answer in result["answers"])]
        found.append({"key": f"content:{topic.casefold()}", "kind": "content", "details": {"topic": topic, "url": None, "pageType": None, "brief": None}, "impact": "high" if len(ids) > 1 else "medium", "promptIds": ids})

    for check in project.site_checks or []:
        if not check.get("passed"):
            name = check["check"]
            # Prices as pictures cost the questions about prices; the other fixes help every question
            about = [result["prompt"]["id"] for result in results if name not in ("prices_as_images", "no_prices") or any(word in f"{result['prompt']['topic']} {result['prompt']['text']}".casefold() for word in PRICE_WORDS)]
            found.append({"key": f"technical:{name}", "kind": "technical", "details": {"check": name}, "impact": CHECK_IMPACT.get(name, "medium"), "promptIds": about[:5]})
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


def _allowed_now(db: Db, project: Project, actions: List[Action], brands: List[Brand]) -> List[Action]:
    """The actions without an untouched one that its rule no longer allows: a "get listed" one whose site's type or
    route doesn't (spec §7, Phase 0 item 0.4), a page about a topic that no longer has enough answers to judge (0.9).
    Such an action stops showing at once, and `sync` removes it at the next check. One the client started or
    finished stays."""
    refused = set()
    pages = [action for action in actions if action.kind == "content" and action.status == "new" and not action.key.startswith("page:")]
    if pages:
        # A page about a topic only while the topic still qualifies (0.9): judged on the latest check
        report = projects.report(db, project)
        rivals_ids = [brand.id for brand in brands if not brand.own]
        own_id = next(brand.id for brand in brands if brand.own)
        for action in pages:
            topic = str((action.details or {}).get("topic") or "")
            if not content_allowed([result for result in report["prompts"] if result["prompt"]["topic"] == topic], own_id, rivals_ids):
                refused.add(action.id)
    untouched = [action for action in actions if action.kind == "listing" and action.status == "new"]
    if not untouched:
        return [action for action in actions if action.id not in refused]
    client = next(brand for brand in brands if brand.own)
    rivals = [(brand.name, brand.domain) for brand in brands if not brand.own]
    sites = {action.id: str((action.details or {}).get("domain") or "") for action in untouched}
    stored = domains.stored_for(db, sites.values(), project.id)
    for action_id, domain in sites.items():
        typed = domains.resolve(domain, client.domain, rivals, stored, project.id)
        if typed["type"] not in domains.PLACEABLE:
            refused.add(action_id)
    return [action for action in actions if action.id not in refused]


def listed(db: Db, project: Project) -> List[Dict[str, Any]]:
    runs = list(db.scalars(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at)))
    brands = projects.brands_of(db, project.id)
    client = next(brand for brand in brands if brand.own)
    actions = _allowed_now(db, project, list(db.scalars(select(Action).where(Action.project_id == project.id))), brands)
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


def _brief(project: Project, client: Brand, topic: str, questions: List[str], page: str = "", evidence: str = "") -> Optional[Dict[str, Any]]:
    """A model writes the brief. None when no model may be asked, or it failed. `evidence`: who the answers named and
    the pages they cited, for the brief to answer better than those pages."""
    from .config import settings

    if settings.first_run_replay or not settings.can_read:
        return None
    language = (project.report_settings or {}).get("language", "uz")
    content = f"Language: {language}\nBusiness: {client.name} ({project.category}, {project.city})\nWhat it offers: {', '.join(project.services or [])}\nTopic: {topic}\nQuestions customers ask, where assistants name competitors and not this business:\n" + "\n".join(f"- {question}" for question in questions)
    if evidence:
        content += f"\n\nWhat the assistants answered instead (the businesses they named, and the pages they cited):\n{evidence[:4000]}"
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
    results = {result["prompt"]["id"]: result for result in projects.report(db, project)["prompts"]} if waiting else {}
    for action in waiting[:limit]:
        brief = _brief(project, client, action.details["topic"], [texts[prompt_id] for prompt_id in action.prompt_ids or [] if prompt_id in texts], evidence=_evidence([results[prompt_id] for prompt_id in action.prompt_ids or [] if prompt_id in results]))
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


def _evidence(results: List[Dict[str, Any]]) -> str:
    """Who a topic's answers named and the pages they cited, as lines for a brief."""
    named: Counter = Counter(name for result in results for answer in result["answers"] for name in answer.get("others") or [])
    pages = list(dict.fromkeys(f"{citation.get('title') or ''} {citation['url']}".strip() for result in results for answer in result["answers"] for citation in answer["citations"]))
    lines = ([f"Named: {', '.join(name for name, _ in named.most_common(8))}"] if named else []) + [f"- {page}" for page in pages[:12]]
    return "\n".join(lines)


def after_creation(project_id: str, run_id: str) -> None:
    """A new project, outside the request that made it: the sites nothing else types typed by the AI (Phase 0 item
    0.4), the cited pages read, then the actions brought in line, and the pages to write given their briefs (23 Nov
    2026: a new project waited for a weekly check for them, which a trial never has)."""
    try:
        with SessionLocal() as db:
            project, run = db.get(Project, project_id), db.get(Run, run_id)
            if project and run:
                run.cost_usd = round((run.cost_usd or 0.0) + domains.classify(db, project, run), 4)
                db.commit()
        read_pages(project_id, run_id)
        with SessionLocal() as db:
            project = db.get(Project, project_id)
            if project:
                sync(db, project)
                db.commit()
                write_briefs(db, project)
                db.commit()
    except Exception as error:  # a background step: it must not die silently
        print(f"fixes: project {project_id} after creation: {error!r}")
