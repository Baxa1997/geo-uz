"""The weekly check: every tracked question of a project asked again, and the answers read.

    python -m app.weekly                    the paid projects due today (the server's timer, every day at 01:00
                                            UTC): Standard on Mondays, Pro and Enterprise on Mondays and Thursdays
    python -m app.weekly --all              every paid project, whatever the day
    python -m app.weekly --project <id>     one project, by hand, paid or not

    ask                each tracked question to every assistant with a key, `RUN_SAMPLES` times, a few at a
                       time; a question that fails is asked again twice, then left out
    read the answers   which businesses each names, in order, in what tone, and which it recommends
    one name each      the spellings of one business brought together, the tracked brands' among them
    the cited sites    their kind, and whether the most cited new ones name the client

The report then counts everything from the rows saved here (`projects.report`): a second check gives the
charts a line and every number its change.

With `FIRST_RUN_REPLAY=true` nobody is asked: the project's latest check is saved again as a new one, to try
the pages without a paid request.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select

from . import delivery, engines, firstrun, fixes
from .config import settings
from .db import Answer, Brand, Citation, Mention, Project, Prompt, Run, SessionLocal, create_tables, now
from .engines import web
from .firstrun import NAMES_RULES, READ_RULES, READ_SCHEMA, STR, arr, obj
from .projects import CHECK_DAYS, brands_of, prompts_of

ASK_TRIES = 3
KAZAKH_CITIES = ("алматы", "almaty", "астана", "astana", "шымкент", "shymkent")


def _place(city: str) -> Tuple[str, str, str]:
    """Where the search tool is told the customer is: the country, the city, the time zone."""
    return ("KZ", city, "Asia/Almaty") if city.casefold() in KAZAKH_CITIES else ("UZ", city or "Tashkent", "Asia/Tashkent")


def _ask(engine: str, prompt: Prompt) -> Optional[Dict[str, Any]]:
    for attempt in range(ASK_TRIES):
        try:
            answer = engines.ask(engine, prompt.text, *_place(prompt.location))
            if answer["text"].strip():
                return answer
        except engines.EngineError as error:
            print(f"weekly: {engine} failed on prompt {prompt.id} (try {attempt + 1}): {error}")
        time.sleep(3 * (attempt + 1))
    return None


def _replay(db: Any, project: Project, run: Run) -> int:
    """Development: the latest check's answers again under this run. Returns how many."""
    last = db.scalar(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at.desc()))
    if last is None:
        return 0
    tracked = {prompt.id for prompt in prompts_of(db, project.id) if prompt.archived_at is None}
    saved = 0
    for old in list(db.scalars(select(Answer).where(Answer.run_id == last.id))):
        if old.prompt_id not in tracked:
            continue
        answer = Answer(run_id=run.id, prompt_id=old.prompt_id, sample=old.sample, engine=old.engine, model=old.model, text=old.text, searches=old.searches)
        db.add(answer)
        db.flush()
        saved += 1
        db.add_all(Mention(answer_id=answer.id, brand_id=mention.brand_id, name=mention.name, position=mention.position, tone=mention.tone, recommended=mention.recommended) for mention in db.scalars(select(Mention).where(Mention.answer_id == old.id)))
        db.add_all(Citation(answer_id=answer.id, url=citation.url, domain=citation.domain, title=citation.title) for citation in db.scalars(select(Citation).where(Citation.answer_id == old.id)))
    run.method, run.sources = last.method, last.sources
    return saved


def check(project_id: str) -> Optional[str]:
    """One project's check. Returns the run's id, or None when the project has nothing to ask."""
    with SessionLocal() as db:
        project = db.get(Project, project_id)
        prompts = [prompt for prompt in prompts_of(db, project_id) if prompt.archived_at is None] if project else []
        asked = settings.engines
        if not project or not prompts or not (asked or settings.first_run_replay):
            return None
        brands = brands_of(db, project_id)
        jobs = [(prompt, engine, sample) for prompt in prompts for engine in asked for sample in range(1, settings.run_samples + 1)]
        run = Run(project_id=project_id, kind="weekly", status="running", total=len(jobs), method={"engine": " + ".join(engines.ENGINE_NAMES[engine] for engine in asked), "model": "", "webSearch": True, "samples": settings.run_samples}, sources={})
        db.add(run)
        db.commit()
        run_id = run.id

        try:
            if settings.first_run_replay:
                run.answered = run.total = _replay(db, project, run)
                cost = 0.0
            else:
                cost = _collect(db, project, brands, run, jobs)
            run.status, run.cost_usd, run.collected_at = ("done" if run.answered else "failed"), round(cost, 4), now()
            run.error = None if run.answered else "no_answers"
        except Exception as error:  # a run must never stay "running" for ever
            db.rollback()
            print(f"weekly: project {project_id} failed: {error!r}")
            run = db.get(Run, run_id)
            run.status, run.error = "failed", "internal"
        db.commit()
        if run.status == "done":
            # The cited pages read, the actions brought in line, and in a live check the briefs written
            try:
                fixes.read_pages(project_id, run_id)
                db.expire_all()
                project = db.get(Project, project_id)
                fixes.sync(db, project)
                if not settings.first_run_replay:
                    fixes.write_briefs(db, project)
                db.commit()
            except Exception as error:  # the check itself is saved; its fixes can be made again
                db.rollback()
                print(f"weekly: project {project_id}: fixes failed: {error!r}")
            run = db.get(Run, run_id)
        delivered = delivery.deliver(project_id, run_id) if run.status == "done" else "no_report"
        print(f"weekly: project {project_id}: report {delivered}")
        return run_id


def _collect(db: Any, project: Project, brands: List[Brand], run: Run, jobs: List[Tuple[Prompt, str, int]]) -> float:
    cost = 0.0
    client = next(brand for brand in brands if brand.own)
    answers: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(_ask, engine, prompt): (prompt, engine, sample) for prompt, engine, sample in jobs}
        for done, future in enumerate(as_completed(futures), start=1):
            prompt, engine, sample = futures[future]
            answer = future.result()
            if answer:
                answers.append({"prompt": prompt, "sample": sample, **answer})
                cost += answer["usd"] or 0.0
            run.answered = len(answers)
            if done % 5 == 0:
                db.commit()
    if not answers:
        return cost

    run.status = "analyzing"
    db.commit()
    with ThreadPoolExecutor(max_workers=6) as pool:
        for answer, (read, usd) in zip(answers, pool.map(lambda answer: engines.read(READ_RULES, f"Question: {answer['prompt'].text}\n\nAnswer:\n{answer['text']}", "answer_reading", READ_SCHEMA), answers)):
            answer["businesses"] = read["businesses"]
            cost += usd

    # One name for each business; the tracked brands' names go in, so their spellings gather under them
    seen = sorted({business["name"].strip() for answer in answers for business in answer["businesses"] if business["name"].strip()} | {brand.name for brand in brands})
    groups, usd = engines.read(NAMES_RULES, json.dumps({"category": project.category, "city": project.city, "names": seen}, ensure_ascii=False), "name_groups", obj(groups=arr(obj(name=STR, spellings=arr(STR)))))
    cost += usd
    mapping: Dict[str, str] = {}
    for group in groups["groups"]:
        tracked = next((brand.name for brand in brands if brand.name in group["spellings"]), group["name"])
        mapping.update({spelling: tracked for spelling in group["spellings"]})

    def brand_of(name: str) -> Optional[Brand]:
        return next((brand for brand in brands if name.casefold() == brand.name.casefold() or web.names(name, [brand.name, *(brand.aliases or [])])), None)

    cited: Dict[str, Counter] = {}
    for answer in answers:
        row = Answer(run_id=run.id, prompt_id=answer["prompt"].id, sample=answer["sample"], engine=answer["engine"], model=answer["model"], text=answer["text"], searches=answer["searches"])
        db.add(row)
        db.flush()
        mentions: List[Mention] = []
        for business in answer["businesses"]:
            written = mapping.get(business["name"].strip(), business["name"].strip())
            brand = brand_of(written)
            name = brand.name if brand else written
            if name and all(name.casefold() != mention.name.casefold() for mention in mentions):
                mentions.append(Mention(answer_id=row.id, brand_id=brand.id if brand else None, name=name, position=len(mentions) + 1, tone=business["tone"], recommended=business["recommended"]))
        # The client added when only the text holds its name
        if all(mention.brand_id != client.id for mention in mentions) and web.names(answer["text"], [client.name, *(client.aliases or [])]):
            mentions.append(Mention(answer_id=row.id, brand_id=client.id, name=client.name, position=len(mentions) + 1, tone="neutral", recommended=False))
        db.add_all(mentions)
        answer["names_client"] = any(mention.brand_id == client.id for mention in mentions)
        for citation in answer["citations"]:
            domain = web.domain_of(citation["url"])
            db.add(Citation(answer_id=row.id, url=citation["url"], domain=domain, title=citation.get("title")))
            cited.setdefault(domain, Counter())[citation["url"]] += 1

    # What is known about each cited site: from the checks before, and for the most cited new ones a look at the page
    known: Dict[str, Any] = {}
    for earlier in db.scalars(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at)):
        known.update(earlier.sources or {})
    rivals = [brand.name for brand in brands if not brand.own]
    sources = {domain: known.get(domain) or {"type": firstrun._kind(domain, client.domain, rivals), "brandListed": False} for domain in cited}
    run.sources = sources
    cost += fixes.check_facts(db, project, run, answers)
    run.method = {**run.method, "model": ", ".join(sorted({answer["model"] for answer in answers}))}
    return cost


def main() -> None:
    parser = argparse.ArgumentParser(description="The weekly check")
    parser.add_argument("--project", help="one project's id, paid or not")
    parser.add_argument("--all", action="store_true", help="every paid project, whatever the day")
    chosen = parser.parse_args()
    create_tables()
    today = now().weekday()
    with SessionLocal() as db:
        paid = list(db.scalars(select(Project).where(Project.paid.is_(True)).order_by(Project.created_at)))
        ids = [chosen.project] if chosen.project else [project.id for project in paid if chosen.all or today in CHECK_DAYS.get(project.plan, [0])]
    for project_id in ids:
        started = time.time()
        run_id = check(project_id)
        with SessionLocal() as db:
            run = db.get(Run, run_id) if run_id else None
            print(f"project {project_id}: " + (f"{run.status}, {run.answered}/{run.total} answers, ${run.cost_usd or 0:.2f}, {time.time() - started:.0f}s" if run else "nothing to ask"))


if __name__ == "__main__":
    main()
