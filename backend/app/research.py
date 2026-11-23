"""Why AI names others and not the client: the win–loss research of report spec §4.5 (Phase 1 there; built on 23 Nov 2026
at the user's "Build research + decision page", after a free check's report read "not enough answers" everywhere).

For each buyer question of a check whose answers name some business and never the client, the page an answer cited for
that business is read beside the client's own website, and the reading model says which facts that page gives and the
client's doesn't, quoting both, with a short section the client could put on its page. Every finding is labelled
`automated` (spec rule 10). What the model returns is checked in code before it is kept (spec rule 2, "the LLM never
types a number"): a quote that isn't word for word on its page is dropped, a fact with a figure is dropped, a number in
the suggested section that isn't on the client's website becomes a blank to fill, and an address of the client's that
wasn't read is dropped. The sentence the assistant said about the business is cut from its answer by code, verbatim.

Kept on the run (`runs.research`) and served with the report (`projects.report`); the page actions take their missing
facts from it (`fixes.suggested`), the briefs their evidence. It asks Gemini on Vertex, without Google Search (the
reading model, `READ_MODEL`); nothing goes to the assistants that answer buyers.
"""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

from . import engines, projects
from .db import FirstRun, Project, Run, SessionLocal, now
from .engines import web
from .firstrun import STR, arr, obj

# At most this many questions are researched a check, and this many pages read for them: a free check has ten questions
QUESTIONS = 10
PAGE_CHARS = 7_000
SITE_CHARS = 14_000
QUOTE_CHARS = 300

RULES = """You compare, for one buyer question, the page of a competitor that an AI assistant cited when it named that competitor, with the client's own website. Your words go into a report for the client's owner.

Give:
- their_passage: the passage of the competitor page's main text that best answers the buyer's question, copied word for word from the page (at most 300 characters; never its menu, header or footer), or "" if no passage does.
- missing: up to 4 facts the competitor's page states that help answer the question and that the client's website does not state. For each: fact (what kind of fact it is, at most 12 words, never a number or a price, written three times: uz in Uzbek in Latin script, ru in Russian, en in English) and quote (the competitor page's words that state it, copied word for word, at most 200 characters).
- client_url: the address of the client's page that comes closest to answering the question: one of the addresses in square brackets in the client's text, or "".
- client_passage: the client's words that come closest to answering the question, copied word for word from the client's text (at most 300 characters), or "".
- fix: a short section of 3 to 6 sentences for the client's page, in the language of the buyer's question, that answers the question with the client's own facts. Where a fact the section needs (a price, a number, a period, a name) is not on the client's website, write a blank in square brackets, such as [price] or [delivery time], instead of inventing it.

Copy quotes exactly as they are written. Never invent a fact. Never write a number that is not on the client's website. If the competitor's page has nothing that answers the question, give an empty list of facts."""

SCHEMA = obj(their_passage=STR, missing=arr(obj(fact=obj(uz=STR, ru=STR, en=STR), quote=STR)), client_url=STR, client_passage=STR, fix=STR)
LANGUAGES = ("uz", "ru", "en")

NUMBER = re.compile(r"\d(?:[\d\s.,]*\d)?")
SENTENCE = re.compile(r"(?<=[.!?…])\s+|\n+")


def _flat(text: str) -> str:
    """For comparing a quote with its page: whitespace and quotes made alike, case ignored."""
    text = text.replace("«", '"').replace("»", '"').replace("“", '"').replace("”", '"').replace("’", "'").replace("ʻ", "'").replace("ʼ", "'")
    return " ".join(text.split()).casefold().strip(" .…\"'")


def found_in(quote: str, page: str) -> bool:
    """Whether a quote is the page's own words."""
    flat = _flat(quote)
    return len(flat) >= 8 and flat in _flat(page)


def _compact(text: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]", "", text.casefold())


def site_of(name: str, domain: str) -> bool:
    """Whether a cited site is the named business's own: its name and the site's first word, one inside the other."""
    label = _compact(domain.split(".")[0] if not domain.startswith("www.") else domain.split(".")[1])
    word = _compact(name)
    return len(label) >= 4 and len(word) >= 4 and (label in word or word in label)


def sentence_about(text: str, name: str) -> str:
    """The answer's first sentence that names the business, verbatim (cut by code, never written by the model)."""
    for sentence in SENTENCE.split(text):
        if name.casefold() in sentence.casefold():
            # The answer's Markdown (bold, code) isn't its words
            sentence = " ".join(re.sub(r"\*\*|__|`", "", sentence).split()).strip("*#-•: ")
            return sentence[:QUOTE_CHARS]
    return ""


def blanks(fix: str, site: str) -> str:
    """The suggested section with every number that isn't on the client's website made a blank to fill."""
    have = {_compact(number) for number in NUMBER.findall(site)}
    return NUMBER.sub(lambda match: match.group(0) if _compact(match.group(0)) in have else "[…]", fix)


def lost_questions(report: Dict[str, Any], rivals: Dict[str, Tuple[str, str]]) -> List[Dict[str, Any]]:
    """The questions whose answers name some business and never the client, each with the business to compare: the
    first one named that an answer cites a page of its own for, else the first named, with that answer's pages."""
    client = report["project"]["brand"]["id"]
    lost: List[Dict[str, Any]] = []
    for result in report["prompts"]:
        answers = result["answers"]
        if not answers or any(mention["brandId"] == client for answer in answers for mention in answer["mentions"]):
            continue
        chosen: Optional[Dict[str, Any]] = None
        fallback: Optional[Dict[str, Any]] = None
        for answer in answers:
            named = [(rivals[mention["brandId"]][0], rivals[mention["brandId"]][1], True) for mention in answer["mentions"] if mention["brandId"] in rivals] + [(name, "", False) for name in answer.get("others") or []]
            for name, domain, tracked in named:
                pages = [citation for citation in answer["citations"] if (domain and citation["domain"].removeprefix("www.") == domain.removeprefix("www.")) or site_of(name, citation["domain"])]
                found = {"name": name, "tracked": tracked, "answer": answer, "pages": pages}
                if pages and chosen is None:
                    chosen = found
                if fallback is None:
                    fallback = found
        pick = chosen or fallback
        if pick is None:
            continue
        lost.append({"prompt": result["prompt"], **pick})
    return lost[:QUESTIONS]


def client_text(db: Any, project: Project, domain: str) -> str:
    """The client's website as the first check read it, pages headed by their addresses; read again when it wasn't kept."""
    first = db.get(FirstRun, project.first_run_id) if project.first_run_id else None
    kept = ((first.draft or {}).get("siteText") if first else "") or ""
    if kept:
        return kept
    pages = web.read_site(domain, "ru") or []
    return "\n\n".join(f"[{page['url']}]\n{page['text']}" for page in pages)[:40_000]


def compare(question: Dict[str, Any], page: Optional[Tuple[str, str, str]], site: str, language: str) -> Tuple[Dict[str, Any], float]:
    """One question's finding: the model's comparison, checked against both pages."""
    answer = question["answer"]
    finding: Dict[str, Any] = {
        "promptId": question["prompt"]["id"],
        "question": question["prompt"]["text"],
        "language": question["prompt"]["language"],
        "engine": answer["engine"],
        "rival": {"name": question["name"], "tracked": question["tracked"]},
        "sentence": sentence_about(answer["text"], question["name"]),
        "review": "automated",
    }
    if page is None:
        # The answer cited no page of the business's own: nothing to compare, the question is watched
        return {**finding, "status": "no_page"}, 0.0
    url, title, text = page
    finding["page"] = {"url": url, "title": title or None}
    if not text:
        return {**finding, "status": "unreadable"}, 0.0
    content = (
        f"Report language: {language}\nBuyer question ({question['prompt']['language']}): {question['prompt']['text']}\n"
        f"The assistant named {question['name']}: {finding['sentence'] or '(no sentence)'}\n\n"
        f"The competitor's page the assistant cited ({url}):\n<<<\n{text[:PAGE_CHARS]}\n>>>\n\n"
        f"The client's website (pages headed by their addresses in square brackets):\n<<<\n{site[:SITE_CHARS]}\n>>>"
    )
    try:
        read, usd = engines.read(RULES, content, "win_loss", SCHEMA)
    except engines.EngineError as error:
        print(f"research: {question['prompt']['id']} not compared: {error}")
        return {**finding, "status": "failed"}, 0.0
    addresses = set(re.findall(r"^\[(https?://[^\]\s]+)\]", site, re.MULTILINE))
    passage = str(read.get("their_passage") or "")[:QUOTE_CHARS]
    client_passage = str(read.get("client_passage") or "")[:QUOTE_CHARS]
    client_url = str(read.get("client_url") or "")
    missing = []
    for item in read.get("missing") or []:
        fact = item.get("fact") if isinstance(item.get("fact"), dict) else {}
        words = {language: " ".join(str(fact.get(language) or "").split())[:120] for language in LANGUAGES}
        # A fact the page doesn't state in those words, one missing a language, or one carrying a figure, isn't kept
        if found_in(str(item.get("quote") or ""), text) and all(words.values()) and not any(NUMBER.search(word) for word in words.values()):
            missing.append({"fact": words, "quote": " ".join(str(item.get("quote") or "").split())[:200]})
    missing = missing[:4]
    return {
        **finding,
        "status": "compared",
        "theirPassage": passage if found_in(passage, text) else None,
        "missing": missing,
        "clientUrl": client_url if client_url in addresses else None,
        "clientPassage": client_passage if found_in(client_passage, site) else None,
        "fix": blanks(" ".join(str(read.get("fix") or "").split()), site) or None,
    }, usd


def research(project_id: str, run_id: str) -> Optional[Dict[str, Any]]:
    """Researches a check's lost questions and keeps the findings on the run. Returns them; None when the check or the
    project is gone. Never raises: a background step."""
    try:
        with SessionLocal() as db:
            project, run = db.get(Project, project_id), db.get(Run, run_id)
            if project is None or run is None:
                return None
            brands = projects.brands_of(db, project_id)
            own = next(brand for brand in brands if brand.own)
            rivals = {brand.id: (brand.name, brand.domain or "") for brand in brands if not brand.own}
            report = projects.report(db, project, run_id=run_id)
            language = (project.report_settings or {}).get("language") or "en"
            site = client_text(db, project, own.domain)
        lost = lost_questions(report, rivals)
        # Each question's page: the business's own page the answer cited, read once however many questions cite it
        wanted = {question["pages"][0]["url"]: question["pages"][0] for question in lost if question["pages"]}
        with ThreadPoolExecutor(max_workers=5) as pool:
            texts = dict(zip(wanted, pool.map(lambda url: (web.fetch(url) or ("",))[0], wanted)))
        pages = [(question["pages"][0]["url"], question["pages"][0].get("title") or "", texts.get(question["pages"][0]["url"], "")) if question["pages"] else None for question in lost]
        with ThreadPoolExecutor(max_workers=4) as pool:
            done = list(pool.map(lambda pair: compare(pair[0], pair[1], site, language), zip(lost, pages)))
        findings = [finding for finding, _ in done]
        cost = round(sum(usd for _, usd in done), 4)
        kept = {"at": now().isoformat(), "model": engines.settings.read_model, "cost": cost, "questions": len(report["prompts"]), "items": findings}
        with SessionLocal() as db:
            run = db.get(Run, run_id)
            if run is None:
                return None
            run.research = kept
            run.cost_usd = round((run.cost_usd or 0.0) + cost, 4)
            db.commit()
        print(f"research: project {project_id}, {len(findings)} questions, {sum(f['status'] == 'compared' for f in findings)} compared, ${cost:.4f}")
        return kept
    except Exception as error:  # a background step: it must not die silently, nor take the check with it
        print(f"research: project {project_id} failed: {error!r}")
        return None
