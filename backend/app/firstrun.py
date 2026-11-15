"""A new account's first run: a website in, every assistant asked, the first statistics out.

    read the site      its pages as text, its robots.txt and markup          -> the four site checks
    profile            who the business is, and the questions its customers ask (Uzbek and Russian)
    ask                each question once to each assistant, several at a time
    read the answers   which businesses each names, in order, in what tone, and which it recommends
    one name each      the spellings of one business brought together
    count              the Snapshot the frontend draws (`frontend/src/shared/types/api.ts`)

Counting is plain code. A model writes the profile and reads the answers; it never produces a number.
"""

from __future__ import annotations

import datetime
import json
import re
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable, Dict, List, Optional, Tuple

from . import engines
from .config import settings
from .engines import web

Progress = Callable[[str, int, int], None]

# Kinds of cited sites, in the frontend's words. A short list for a start: the rest is "other".
NEWS = ["afisha.uz", "kursiv.media", "weproject.media", "gazeta.uz", "kun.uz", "daryo.uz", "spot.uz", "podrobno.uz", "repost.uz", "uznews.uz", "tengrinews.kz", "forbes.kz"]
DIRECTORIES = ["goldenpages.uz", "yellowpages.uz", "2gis.uz", "2gis.kz", "oblako.uz", "sprav.uz", "orginfo.uz", "google.com", "yandex.uz", "yandex.kz", "tripadvisor.com"]
SOCIAL = ["t.me", "instagram.com", "facebook.com", "youtube.com", "tiktok.com"]
AI_BOTS = ["gptbot", "oai-searchbot", "chatgpt-user", "google-extended", "perplexitybot", "claudebot"]

STR = {"type": "string"}


def obj(**properties: Any) -> Dict[str, Any]:
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


def arr(item: Dict[str, Any]) -> Dict[str, Any]:
    return {"type": "array", "items": item}


class FirstRunError(RuntimeError):
    """A run that can't go on, with a code the frontend can put into words."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(detail or code)
        self.code = code


def normalize(domain: str) -> str:
    """ "https://www.Example.uz/page" -> "example.uz". Raises on what isn't a website's address."""
    host = web.domain_of(domain.strip())
    if not re.fullmatch(r"[a-z0-9а-яё]([a-z0-9а-яё-]*[a-z0-9а-яё])?(\.[a-z0-9а-яё-]+)+", host):
        raise FirstRunError("bad_domain", domain)
    return host


# --- the website ---------------------------------------------------------------------------------------


def _raw(url: str) -> Optional[str]:
    try:
        request = urllib.request.Request(url, headers={"User-Agent": web.USER_AGENT})
        with urllib.request.urlopen(request, timeout=15) as reply:
            return reply.read(600_000).decode(reply.headers.get_content_charset() or "utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None


def bots_blocked(robots: Optional[str]) -> bool:
    """Whether robots.txt shuts out the assistants' crawlers, by name or everyone at once."""
    if not robots:
        return False
    agents: List[str] = []
    fresh = True  # a new group starts with the first User-agent after any rule
    for line in robots.splitlines():
        key, _, value = line.split("#")[0].partition(":")
        key, value = key.strip().lower(), value.strip().lower()
        if key == "user-agent":
            agents = [value] if fresh else agents + [value]
            fresh = False
        elif key in ("disallow", "allow"):
            fresh = True
            if key == "disallow" and value == "/" and any(agent == "*" or agent in AI_BOTS for agent in agents):
                return True
    return False


def site_checks(pages: List[Dict[str, str]], html: Optional[str], robots: Optional[str]) -> List[Dict[str, Any]]:
    """The four yes-or-no checks of `backend/PLAN.md`. `passed` false is a problem to fix."""
    text = " ".join(page["text"] for page in pages)
    has_price = bool(re.search(r"\d[\d\s.,]*\s*(млн|тыс|ming|mln)?\.?\s*(сум|so[ʻ'‘`]?m|uzs|usd|\$|тенге|₸)", text, re.IGNORECASE))
    price_page = any(re.search(r"price|narx|цен|стоим|tarif|тариф", page["url"], re.IGNORECASE) for page in pages)
    markup = bool(html and re.search(r'application/ld\+json[^>]*>[^<]*"@type"\s*:\s*"(LocalBusiness|Organization|School|EducationalOrganization|MedicalClinic|Dentist|Restaurant|Store|Hotel)', html, re.IGNORECASE))
    contacts = bool(re.search(r"\+?\s*(998|7)[\s(-]*\d{2,3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}", text))
    return [
        {"check": "ai_bots_blocked", "passed": not bots_blocked(robots)},
        # A page about prices with no price in its text: the prices are pictures, or not there at all
        {"check": "prices_as_images", "passed": has_price or not price_page},
        {"check": "no_business_markup", "passed": markup},
        {"check": "contacts_missing", "passed": contacts},
    ]


# --- the profile and the questions ---------------------------------------------------------------------

PROFILE_RULES = """You read a business's website and prepare a first check of how AI assistants answer its customers.

From the text, give:
- name: the business's name as customers write it. aliases: its other spellings on the site and in common use (Latin and Cyrillic, short forms); never a generic word, and never an abbreviation of three letters or fewer.
- category: what kind of business it is, two to four words in Russian (\"частная школа\", \"стоматологическая клиника\").
- city: the city it mainly serves, in Russian, and cityEn, the same in English. country: the two-letter country code.
- description: one sentence in Russian on what it offers.
- services: up to six of its main services, in Russian.
- questions: exactly {count} questions a customer in that city would ask an AI assistant when choosing such a business, before knowing any business's name. Half in Russian (language \"ru\"), half in Uzbek in Latin script (language \"uz\"). Cover: the best in the city, how to choose, prices, the business's main services or specialities, and its district if the site names one. Each with a `topic` of one or two words in Russian. Natural, short, the way people type. Never name this business or any other in a question."""


def profile(domain: str, pages: List[Dict[str, str]], category: Optional[str], city: Optional[str], count: int) -> Tuple[Dict[str, Any], float]:
    text = "\n\n".join(f"[{page['url']}]\n{page['text']}" for page in pages)[:40_000]
    given = "".join(f"\nThe owner says the {name} is: {value}. Use it." for name, value in (("category", category), ("city", city)) if value)
    schema = obj(
        name=STR,
        aliases=arr(STR),
        category=STR,
        city=STR,
        cityEn=STR,
        country=STR,
        description=STR,
        services=arr(STR),
        questions=arr(obj(text=STR, language={"type": "string", "enum": ["ru", "uz"]}, topic=STR)),
    )
    found, usd = engines.read(PROFILE_RULES.replace("{count}", str(count)) + given, f"Website: {domain}\n\n{text}", "site_profile", schema)
    spellings = [found["name"]] + found["aliases"]
    # A question that names the business would measure nothing
    found["questions"] = [question for question in found["questions"] if not web.names(question["text"], spellings)][:count]
    if not found["questions"]:
        raise FirstRunError("no_questions")
    return found, usd


# --- reading an answer ---------------------------------------------------------------------------------

READ_RULES = """You read one answer an AI assistant gave to a customer's question and list the businesses it names (companies, schools, clinics, shops: named organizations a customer could choose), in the order they first appear. Add nothing the answer does not say.

For each:
- name: as written in the answer.
- tone: how the answer speaks of this business: positive (praised, suggested), negative (warned against, criticised) or neutral (plain facts).
- recommended: true when the assistant itself suggests the customer consider it and gives a reason to choose it (its closing advice, \"I would start with\", a shortlist where each entry says whom it suits), even when hedged. False when it only appears as a row of facts: a price table, a list of addresses, a mention in passing."""

READ_SCHEMA = obj(businesses=arr(obj(name=STR, tone={"type": "string", "enum": ["positive", "neutral", "negative"]}, recommended={"type": "boolean"})))

NAMES_RULES = (
    "These names of businesses come from several answers about one category in one city. Group the spellings that mean the same business "
    "(abbreviations, Latin and Cyrillic, with or without words like School or Clinic). Never merge two different businesses: when unsure, keep "
    "them apart. Give each group as `name` the short name people use, without the city or a slogan. List every given spelling exactly once."
)


# --- the run -------------------------------------------------------------------------------------------


def _kind(domain: str, own: str, competitors: List[str]) -> str:
    def among(known: List[str]) -> bool:
        return any(domain == site or domain.endswith(f".{site}") for site in known)

    if domain == own:
        return "own"
    slug = re.sub(r"[^a-z0-9]", "", domain.split(".")[0])
    if any(len(word) >= 5 and word in slug for name in competitors for word in re.findall(r"[a-z0-9]+", name.lower())):
        return "competitor"
    return "news" if among(NEWS) else "directory" if among(DIRECTORIES) else "social" if among(SOCIAL) else "other"


def questions_for(engine: str, asked: List[str], count: int) -> List[int]:
    """Which questions an assistant gets in a first run. With Gemini beside it, ChatGPT gets
    `FIRST_RUN_CHATGPT_QUESTIONS` of them, spread evenly so both languages are among them; otherwise all."""
    limit = settings.first_run_chatgpt_questions
    if engine != "chatgpt" or "gemini" not in asked or limit >= count:
        return list(range(count))
    return sorted({round(index * count / limit) for index in range(limit)}) if limit > 0 else []


def run(domain: str, category: Optional[str], city: Optional[str], progress: Progress, engine_names: Optional[List[str]] = None) -> Tuple[Dict[str, Any], Dict[str, Any], float]:
    """The whole first run. Returns the Snapshot, the raw answers and the cost in US dollars."""
    asked = engine_names or settings.engines
    if not asked:
        raise FirstRunError("no_engines", "No assistant has a key")
    cost = 0.0

    progress("reading_site", 0, 0)
    pages = web.read_site(domain, "ru")
    if not pages:
        raise FirstRunError("site_unreadable", domain)
    root = f"https://{web.domain_of(pages[0]['url'])}"
    checks = site_checks(pages, _raw(pages[0]["url"]), _raw(f"{root}/robots.txt"))
    who, usd = profile(domain, pages, category, city, settings.first_run_questions)
    cost += usd
    spellings = [who["name"]] + who["aliases"]
    place = (who["country"].upper()[:2] or "UZ", who["cityEn"] or who["city"], "Asia/Almaty" if who["country"].upper().startswith("KZ") else "Asia/Tashkent")

    # Every question to every assistant, a few at a time; one that fails is left out and the run goes on
    jobs = [(q, engine) for engine in asked for q in questions_for(engine, asked, len(who["questions"]))]
    answers: List[Dict[str, Any]] = []
    progress("asking", 0, len(jobs))
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(engines.ask, engine, who["questions"][q]["text"], *place): (q, engine) for q, engine in jobs}
        for done, future in enumerate(as_completed(futures), start=1):
            q, engine = futures[future]
            try:
                answer = future.result()
            except engines.EngineError as error:
                answer = None
                print(f"first run {domain}: {engine} failed on question {q + 1}: {error}")
            if answer and answer["text"].strip():
                answers.append({"question": q, **answer})
                cost += answer["usd"] or 0.0
            progress("asking", done, len(jobs))
    if not answers:
        raise FirstRunError("no_answers")

    progress("reading_answers", len(answers), len(jobs))
    with ThreadPoolExecutor(max_workers=6) as pool:
        for answer, (read, usd) in zip(answers, pool.map(lambda answer: engines.read(READ_RULES, f"Question: {who['questions'][answer['question']]['text']}\n\nAnswer:\n{answer['text']}", "answer_reading", READ_SCHEMA), answers)):
            answer["businesses"] = read["businesses"]
            cost += usd

    seen = sorted({business["name"].strip() for answer in answers for business in answer["businesses"] if business["name"].strip()})
    mapping: Dict[str, str] = {}
    if seen:
        groups, usd = engines.read(NAMES_RULES, json.dumps({"category": who["category"], "city": who["city"], "names": seen}, ensure_ascii=False), "name_groups", obj(groups=arr(obj(name=STR, spellings=arr(STR)))))
        cost += usd
        mapping = {spelling: group["name"] for group in groups["groups"] for spelling in group["spellings"]}

    client = who["name"]

    def canonical(name: str) -> str:
        name = mapping.get(name.strip(), name.strip())
        return client if web.names(name, spellings) else name

    # Per answer: the businesses in order, each once, the client added when only the text holds its name
    for answer in answers:
        order: List[Dict[str, Any]] = []
        for business in answer["businesses"]:
            name = canonical(business["name"])
            if all(name != listed["name"] for listed in order):
                order.append({"name": name, "tone": business["tone"], "recommended": business["recommended"]})
        if web.names(answer["text"], spellings) and all(listed["name"] != client for listed in order):
            order.append({"name": client, "tone": "neutral", "recommended": False})
        answer["order"] = order

    named = Counter(listed["name"] for answer in answers for listed in answer["order"])
    rivals = [name for name, _ in named.most_common() if name != client][:5]
    tracked = [client] + rivals
    ids = {name: f"b{index}" for index, name in enumerate(tracked)}
    mentions = sum(named[name] for name in tracked) or 1

    def score(name: str, over: List[Dict[str, Any]]) -> Dict[str, Any]:
        places = [position for answer in over for position, listed in enumerate(answer["order"], start=1) if listed["name"] == name]
        tones = [{"positive": 100, "neutral": 50, "negative": 0}[listed["tone"]] for answer in over for listed in answer["order"] if listed["name"] == name]
        return {
            "brandId": ids[name],
            "visibility": len(places) / len(over) if over else 0.0,
            "shareOfVoice": named[name] / mentions,
            "avgPosition": round(sum(places) / len(places), 1) if places else None,
            "sentiment": round(sum(tones) / len(tones)) if tones else None,
            "trend": 0.0,
        }

    # The cited sites, the most cited first; the first five are read to see whether they name the client
    sites: Dict[str, Dict[str, Any]] = {}
    for index, answer in enumerate(answers):
        for citation in answer["citations"]:
            site = sites.setdefault(web.domain_of(citation["url"]), {"answers": set(), "pages": Counter(), "titles": {}})
            site["answers"].add(index)
            site["pages"][citation["url"]] += 1
            site["titles"].setdefault(citation["url"], citation.get("title"))
    own = web.domain_of(pages[0]["url"])
    ranked = sorted(sites, key=lambda site: (-len(sites[site]["answers"]), site))[:12]
    kinds = {site: _kind(site, own, rivals) for site in ranked}
    to_read = [site for site in ranked if kinds[site] not in ("own", "competitor")][:5]
    with ThreadPoolExecutor(max_workers=5) as pool:
        fetched = dict(zip(to_read, pool.map(lambda site: web.fetch(sites[site]["pages"].most_common(1)[0][0]), to_read)))
    sources = [
        {
            "domain": site,
            "type": kinds[site],
            "count": len(sites[site]["answers"]),
            "brandListed": kinds[site] == "own" or bool(fetched.get(site) and web.names(fetched[site][0], spellings)),
            "pages": [{"url": url, "title": sites[site]["titles"].get(url), "count": count, "mentions": None} for url, count in sites[site]["pages"].most_common(5)],
        }
        for site in ranked
    ]

    collected = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    by_question: List[Dict[str, Any]] = []
    for q, question in enumerate(who["questions"]):
        mine = [answer for answer in answers if answer["question"] == q]
        by_question.append(
            {
                "prompt": {"id": f"q{q + 1}", "text": question["text"], "language": question["language"], "topic": question["topic"], "createdAt": collected, "archivedAt": None, "location": who["city"], "factCheck": True, "tags": []},
                "answers": [
                    {
                        "sample": sample,
                        "engine": answer["engine"],
                        "text": answer["text"],
                        "mentions": [{"brandId": ids[listed["name"]], "position": position, "tone": listed["tone"], "recommended": listed["recommended"]} for position, listed in enumerate(answer["order"], start=1) if listed["name"] in ids],
                        "citations": [{"url": citation["url"], "domain": web.domain_of(citation["url"]), "title": citation.get("title")} for citation in answer["citations"]],
                        "searches": answer["searches"],
                    }
                    for sample, answer in enumerate(mine, start=1)
                ],
            }
        )

    snapshot = {
        "domain": own,
        "category": who["category"],
        "city": who["city"],
        "description": who["description"],
        "services": who["services"],
        "method": {"engine": " + ".join(engines.ENGINE_NAMES[engine] for engine in asked), "model": ", ".join(sorted({answer["model"] for answer in answers})), "webSearch": True, "samples": 1, "collectedAt": collected},
        "brand": {"id": ids[client], "name": client, "aliases": who["aliases"], "domain": own, "logo": None},
        "competitors": [{"id": ids[name], "name": name, "aliases": [], "domain": "", "logo": None} for name in rivals],
        "scores": [score(name, answers) for name in tracked],
        # The same numbers per assistant, and how often each business is recommended: new beside the old contract
        "engines": [
            {"engine": engine, "name": engines.ENGINE_NAMES[engine], "answers": len(theirs), "scores": [score(name, theirs) for name in tracked]}
            for engine in asked
            for theirs in [[answer for answer in answers if answer["engine"] == engine]]
        ],
        "recommended": {ids[name]: sum(1 for answer in answers for listed in answer["order"] if listed["name"] == name and listed["recommended"]) for name in tracked},
        "answers": len(answers),
        "prompts": by_question,
        "topSources": sources,
        "siteChecks": checks,
    }
    # `order`: every business an answer names, one name each, in order; a project keeps those it doesn't track too
    raw = {"profile": who, "answers": [{key: answer[key] for key in ("question", "engine", "model", "text", "citations", "searches", "businesses", "order")} for answer in answers]}
    return snapshot, raw, round(cost, 4)
