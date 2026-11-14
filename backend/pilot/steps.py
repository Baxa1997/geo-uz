"""The steps that turn a brief into a pilot report's file. Each step reads what the one before saved.

    ask      every question, `samples` times, to ChatGPT with web search  -> raw/*.json
    extract  who each answer names and recommends, and what it says       -> answers.json
    names    one name for a business the answers spell differently        -> names.json
    sources  the pages the answers cite: is the client on them?           -> sources.json
    site     the client's own website as text                             -> site.json
    analyze  the findings, reasons, decisions and plan, as a draft        -> analysis.json
    build    everything as the file the report's page reads               -> <slug>.json

Counting (`aggregate`) is plain code and never a model's: the numbers in the report are the ones counted here.
"""

from __future__ import annotations

import json
from collections import Counter, OrderedDict
from pathlib import Path
from typing import Any, Dict, List, Optional

import llm
import web

BRAND_QUESTION = {
    "ru": "Что известно о «{name}» ({category}, {city})? Цены, условия, адреса, отзывы.",
    "uz": "«{name}» ({category}, {city}) haqida nima maʼlum? Narxlar, shartlar, manzillar, fikrlar.",
    "en": "What is known about “{name}” ({category}, {city})? Prices, terms, addresses, reviews.",
}
LANGUAGES = {"ru": "Russian", "uz": "Uzbek (Latin script)", "en": "English"}

# Kinds of sites the answers cite. A short list for a start; whatever isn't here is "other" until someone adds it.
SITE_KINDS = {
    "media": ["afisha.uz", "kursiv.media", "weproject.media", "gazeta.uz", "kun.uz", "daryo.uz", "spot.uz", "podrobno.uz", "repost.uz", "uznews.uz", "tengrinews.kz", "forbes.kz"],
    "catalog": ["goldenpages.uz", "yellowpages.uz", "2gis.uz", "2gis.kz", "oblako.uz", "internationalschools.net", "google.com", "yandex.uz", "yandex.kz", "orginfo.uz", "tripadvisor.com"],
    "social": ["t.me", "instagram.com", "facebook.com", "youtube.com", "tiktok.com"],
}


# --- small helpers -----------------------------------------------------------------------------------


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def spellings(brief: Dict[str, Any]) -> List[str]:
    return [brief["brand"]["name"]] + list(brief["brand"].get("aliases") or [])


def is_client(name: str, brief: Dict[str, Any]) -> bool:
    """A name the answers use for the client: it holds one of the client's spellings. Short forms belong in the brief's aliases."""
    lowered = name.casefold().strip()
    return any(spelling.casefold().strip() in lowered for spelling in spellings(brief) if len(spelling.strip()) > 2)


def obj(**properties: Any) -> Dict[str, Any]:
    """A strict JSON schema object: every property required, nothing else allowed."""
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


def arr(item: Dict[str, Any]) -> Dict[str, Any]:
    return {"type": "array", "items": item}


STR: Dict[str, Any] = {"type": "string"}
OPT: Dict[str, Any] = {"type": ["string", "null"]}
POINT = obj(lead=STR, text=STR)
LEVEL: Dict[str, Any] = {"type": "string", "enum": ["high", "medium", "low"]}


class Costs:
    """What the run cost, call by call: the answer to step 0 of backend/PLAN.md."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.rows: List[Dict[str, Any]] = load(path) if path.exists() else []

    def add(self, step: str, response: Dict[str, Any]) -> None:
        self.rows.append({"step": step, **llm.cost_of(response)})
        save(self.path, self.rows)

    def summary(self) -> str:
        lines = []
        for step in OrderedDict.fromkeys(row["step"] for row in self.rows):
            rows = [row for row in self.rows if row["step"] == step]
            priced = [row["usd"] for row in rows if row["usd"] is not None]
            usd = f"${sum(priced):.3f} (${sum(priced) / len(priced):.4f} a call)" if len(priced) == len(rows) else "price unknown: add the model to llm.PRICES"
            lines.append(
                f"  {step:8} {len(rows):3} calls, {sum(r['input_tokens'] for r in rows):>9,} in, "
                f"{sum(r['output_tokens'] for r in rows):>7,} out, {sum(r['searches'] for r in rows):3} searches, {usd}"
            )
        return "\n".join(lines)


# --- ask ----------------------------------------------------------------------------------------------


def ask(brief: Dict[str, Any], out: Path, model: str, costs: Costs, force: bool = False, context: Optional[str] = None, direct: bool = True) -> None:
    """Asks every question `samples` times, each in a conversation of its own, and keeps the raw responses."""
    place = (brief.get("country", "UZ"), brief["city_en"] if brief.get("city_en") else brief["city"], brief.get("timezone", "Asia/Tashkent"))
    jobs = [(f"q{q + 1}_s{s + 1}", question["text"]) for q, question in enumerate(brief["questions"]) for s in range(brief.get("samples", 3))]
    # The one question that names the client: kept apart, never counted, read for wrong facts and mixed-up names
    template = BRAND_QUESTION.get(brief["language"], BRAND_QUESTION["ru"])
    if direct:
        jobs.append(("brand", template.format(name=brief["brand"]["name"], category=brief["category"], city=brief["city"])))
    for name, question in jobs:
        path = out / "raw" / f"{name}.json"
        if path.exists() and not force:
            continue
        print(f"  asking {name}: {question}")
        response = llm.ask(model, question, *place, context) if context else llm.ask(model, question, *place)
        save(path, {"question": question, "response": response})
        costs.add("ask", response)


# --- extract ------------------------------------------------------------------------------------------

EXTRACT_RULES = """You read one answer an AI assistant gave to a customer's question and list what it says. Do not add anything the answer does not say.

For every business (company, school, clinic, shop: a named organization a customer could choose) the answer names:
- name: as written in the answer.
- recommended: true when the assistant itself suggests the customer consider this business and gives a reason to choose it: its closing advice, "I would start with", "top picks", "if you want X, look at Y", or a shortlist it built where each entry says whom it suits or why it is good. Hedging ("not a final recommendation", "visit before deciding") does not undo this: a shortlist with reasons is a recommendation. False when the business only appears as a row of facts with no reason to choose it: a price table, a list of addresses, a catalog-style listing, or a mention in passing. Judge each business by how the answer presents that one; one answer may hold both kinds.
- attributes: for each key given, the value the answer states for this business, as a phrase of at most eight words written in {language} (translate it if the answer is in another language, currency words too; keep names and numbers as given; for a price give the main range and its period only, without fees and extras), or null when it states none.
- description: what the answer says this business is good for or how it differs, in at most twelve words in {language}, or null when it gives only facts.
- place: the district or address the answer gives, in {language}, or null.

advice: the assistant's own closing recommendation, copied word for word (one or two sentences), or null when there is none."""


def extract(brief: Dict[str, Any], out: Path, model: str, costs: Costs, force: bool = False) -> List[Dict[str, Any]]:
    path = out / "answers.json"
    if path.exists() and not force:
        return load(path)
    keys = [attribute["key"] for attribute in brief["attributes"]]
    schema = obj(
        businesses=arr(obj(name=STR, recommended={"type": "boolean"}, attributes=obj(**{key: OPT for key in keys}), description=OPT, place=OPT)),
        advice=OPT,
    )
    legend = "\n".join(f"- {attribute['key']}: {attribute['label']}" for attribute in brief["attributes"])
    answers = []
    for q, question in enumerate(brief["questions"]):
        for s in range(brief.get("samples", 3)):
            raw = load(out / "raw" / f"q{q + 1}_s{s + 1}.json")
            text = llm.text_of(raw["response"])
            print(f"  reading q{q + 1}_s{s + 1}")
            read, response = llm.structured(
                model,
                f"{EXTRACT_RULES.replace('{language}', LANGUAGES.get(brief['language'], 'Russian'))}\n\nAttribute keys:\n{legend}",
                f"Question: {question['text']}\n\nAnswer:\n{text}",
                "answer_reading",
                schema,
            )
            costs.add("extract", response)
            answers.append(
                {
                    "question": q,
                    "sample": s + 1,
                    "text": text,
                    "citations": llm.citations_of(raw["response"]),
                    "consulted": llm.consulted_of(raw["response"]),
                    "searches": llm.searches_of(raw["response"]),
                    **read,
                }
            )
    save(path, answers)
    return answers


# --- names --------------------------------------------------------------------------------------------


def names(brief: Dict[str, Any], out: Path, answers: List[Dict[str, Any]], model: str, costs: Costs, force: bool = False) -> Dict[str, str]:
    """Maps every spelling the answers use to one name per business ("TIS" and "Tashkent International School")."""
    path = out / "names.json"
    if path.exists() and not force:
        return load(path)
    seen = sorted({business["name"].strip() for answer in answers for business in answer["businesses"] if business["name"].strip()})
    groups, response = llm.structured(
        model,
        "These names of businesses come from several answers about one category in one city. Group the spellings that mean the same "
        "business (abbreviations, Latin and Cyrillic, with or without words like School or Clinic). Never merge two different businesses: "
        "when unsure, keep them apart. Give each group as `name` the short name people use for it (\"Westminster\", \"The British School\", \"Tashkent International School\"): no city, no \"in Tashkent\", no slogan or legal form, in Latin letters when the business writes itself so. List every given spelling exactly once.",
        json.dumps({"category": brief["category"], "city": brief["city"], "names": seen}, ensure_ascii=False),
        "name_groups",
        obj(groups=arr(obj(name=STR, spellings=arr(STR)))),
    )
    costs.add("names", response)
    mapping = {spelling: group["name"] for group in groups["groups"] for spelling in group["spellings"]}
    mapping = {name: mapping.get(name, name) for name in seen}
    save(path, mapping)
    return mapping


# --- counting -----------------------------------------------------------------------------------------


def aggregate(brief: Dict[str, Any], answers: List[Dict[str, Any]], mapping: Dict[str, str]) -> Dict[str, Any]:
    """Every number of the report, counted from the answers. No model is involved."""
    client = brief["brand"]["name"]
    keys = [attribute["key"] for attribute in brief["attributes"]]

    def canonical(name: str) -> str:
        name = mapping.get(name.strip(), name.strip())
        return client if is_client(name, brief) else name

    brands: Dict[str, Dict[str, Any]] = {}
    per_answer = []
    for answer in answers:
        named, recommended = set(), set()
        for business in answer["businesses"]:
            name = canonical(business["name"])
            named.add(name)
            if business["recommended"]:
                recommended.add(name)
            entry = brands.setdefault(name, {"attributes": {key: Counter() for key in keys}, "description": None, "place": None})
            for key in keys:
                if business["attributes"].get(key):
                    entry["attributes"][key][business["attributes"][key]] += 1
            entry["description"] = entry["description"] or business.get("description")
            entry["place"] = entry["place"] or business.get("place")
        # The reading may miss a name the answer's text holds: for the client, the text decides too
        if web.names(answer["text"], spellings(brief)):
            named.add(client)
        per_answer.append({"question": answer["question"], "named": named, "recommended": recommended})

    def count(name: str, field: str) -> int:
        return sum(1 for answer in per_answer if name in answer[field])

    rows = []
    for name in set(brands) | {client}:
        entry = brands.get(name, {"attributes": {key: Counter() for key in keys}, "description": None, "place": None})
        rows.append(
            {
                "name": name,
                "isClient": name == client,
                "named": count(name, "named"),
                "recommended": count(name, "recommended"),
                "attributes": {key: (entry["attributes"][key].most_common(1)[0][0] if entry["attributes"][key] else None) for key in keys},
                "description": entry["description"],
                "peer": name == client,
                "place": entry["place"],
            }
        )
    rows.sort(key=lambda row: (-row["recommended"], -row["named"], row["name"].casefold()))

    questions = []
    for q, question in enumerate(brief["questions"]):
        mine = [answer for answer in per_answer if answer["question"] == q]
        others_named = set().union(*[answer["named"] for answer in mine]) - {client} if mine else set()
        often = Counter(name for answer in mine for name in answer["recommended"] if name != client)
        questions.append(
            {
                "text": question["text"],
                "language": question["language"],
                "answers": len(mine),
                "named": sum(1 for answer in mine if client in answer["named"]),
                "recommended": sum(1 for answer in mine if client in answer["recommended"]),
                "brandsRecommended": len(often),
                "brandsNamed": len(others_named),
                "recommendedNames": [name for name, _ in sorted(often.items(), key=lambda item: (-item[1], item[0].casefold()))],
            }
        )

    others = [row for row in rows if not row["isClient"]]
    mine = next(row for row in rows if row["isClient"])
    return {
        "questions": questions,
        "brands": rows,
        "totals": {
            "named": mine["named"],
            "recommended": mine["recommended"],
            "othersNamed": len(others),
            "othersRecommended": sum(1 for row in others if row["recommended"] > 0),
        },
        "answers": len(answers),
    }


# --- comparing with the report before -----------------------------------------------------------------


def _listed(cited: List[Dict[str, Any]]) -> Optional[Dict[str, int]]:
    """Of the cited sites that could be read, how many include the client."""
    read = [source for source in cited if source["answers"] > 0 and source["brandListed"] is not None]
    return {"n": sum(1 for source in read if source["brandListed"]), "of": len(read)} if read else None


def _found(facts: List[Dict[str, Any]]) -> Optional[Dict[str, int]]:
    return {"n": sum(1 for fact in facts if fact["status"] == "found"), "of": len(facts)} if facts else None


def compare(before: Dict[str, Any], counts: Dict[str, Any], cited: List[Dict[str, Any]], facts: List[Dict[str, Any]], movers: int = 7) -> Dict[str, Any]:
    """What changed since the earlier report's file, counted. The sentences come from the analysis."""
    was, now = before["method"]["answers"], counts["answers"]

    def both(old: Optional[Dict[str, int]], new: Optional[Dict[str, int]]) -> Optional[Dict[str, Any]]:
        return {"before": old, "after": new} if old and new else None

    old_brands = {brand["name"].casefold(): brand for brand in before["brands"]}
    new_brands = {brand["name"].casefold(): brand for brand in counts["brands"]}

    def moved(key: str) -> float:
        old, new = old_brands.get(key), new_brands.get(key)
        share = lambda brand, field, size: (brand[field] / size if brand and size else 0.0)  # noqa: E731
        # A recommendation weighs more than a mention
        return 2 * (share(new, "recommended", now) - share(old, "recommended", was)) + share(new, "named", now) - share(old, "named", was)

    pair = lambda brand: None if brand is None else {"named": brand["named"], "recommended": brand["recommended"]}  # noqa: E731
    keys = [key for key in set(old_brands) | set(new_brands) if not (old_brands.get(key) or new_brands.get(key))["isClient"]]
    keys = [key for key in sorted(keys, key=lambda key: (-abs(moved(key)), key)) if abs(moved(key)) > 1e-9][:movers]
    client = next(key for key, brand in new_brands.items() if brand["isClient"])
    old_client = next((key for key, brand in old_brands.items() if brand["isClient"]), client)
    rows = [{"name": new_brands[client]["name"], "isClient": True, "before": pair(old_brands.get(old_client)), "after": pair(new_brands[client])}]
    rows += [
        {"name": (new_brands.get(key) or old_brands[key])["name"], "isClient": False, "before": pair(old_brands.get(key)), "after": pair(new_brands.get(key))}
        for key in sorted(keys, key=lambda key: -moved(key))
    ]

    old_facts = {fact["fact"].casefold(): fact["status"] for fact in before.get("facts") or []}
    fact_changes = [
        {"fact": fact["fact"], "before": old_facts.get(fact["fact"].casefold()), "after": fact["status"]}
        for fact in facts
        if old_facts.get(fact["fact"].casefold()) != fact["status"]
    ]
    old_sources = {source["name"].casefold(): source["brandListed"] for source in before.get("sources") or []}
    source_changes = [
        {"name": source["name"], "before": old_sources.get(source["name"].casefold()), "after": source["brandListed"]}
        for source in cited
        if source["name"].casefold() in old_sources and old_sources[source["name"].casefold()] != source["brandListed"]
    ]
    old_client_row = old_brands.get(old_client) or {"named": 0, "recommended": 0}
    return {
        "slug": before["slug"],
        "collectedAt": before["method"]["collectedAt"],
        "named": {"before": {"n": old_client_row["named"], "of": was}, "after": {"n": counts["totals"]["named"], "of": now}},
        "recommended": {"before": {"n": old_client_row["recommended"], "of": was}, "after": {"n": counts["totals"]["recommended"], "of": now}},
        "listed": both(_listed(before.get("sources") or []), _listed(cited)),
        "facts": both(_found(before.get("facts") or []), _found(facts)),
        "brands": rows,
        "factChanges": fact_changes,
        "sourceChanges": source_changes,
    }


def model_row(model: str, counts: Dict[str, Any]) -> Dict[str, Any]:
    """One model's answers to the same questions in a line: the client beside whoever that model recommends most."""
    leader = next((brand for brand in counts["brands"] if not brand["isClient"]), None)
    return {
        "model": model,
        "answers": counts["answers"],
        "named": counts["totals"]["named"],
        "recommended": counts["totals"]["recommended"],
        "leader": leader["name"] if leader else None,
        "leaderNamed": leader["named"] if leader else 0,
        "leaderRecommended": leader["recommended"] if leader else 0,
    }


# --- sources ------------------------------------------------------------------------------------------


def kind_of(domain: str, brief: Dict[str, Any]) -> str:
    own = [brief["brand"].get("domain")] + list(brief["brand"].get("sites") or [])
    if any(web.domain_of(site) == domain for site in own if site):
        return "own"
    return next((kind for kind, domains in SITE_KINDS.items() if any(domain == known or domain.endswith(f".{known}") for known in domains)), "other")


def site_kinds(brief: Dict[str, Any], sites: Dict[str, Optional[str]], businesses: List[str], model: str, costs: Costs) -> Dict[str, str]:
    """What each cited site is, judged from its address and a page's title: the short list above can't know every site."""
    kinds, response = llm.structured(
        model,
        "For each website, say what it is. media: a news site, magazine or blog that publishes reviews and articles. catalog: a directory, map, "
        "listing or review site where a business can have a card. competitor: the own website of one of the businesses listed, or of the group that "
        "owns it. social: a social network or messenger channel. other: anything else, including official registers and accrediting bodies.",
        json.dumps({"businesses": businesses, "websites": [{"domain": domain, "title": title} for domain, title in sites.items()]}, ensure_ascii=False),
        "site_kinds",
        obj(sites=arr(obj(domain=STR, kind={"type": "string", "enum": ["media", "catalog", "competitor", "social", "other"]}))),
    )
    costs.add("sources", response)
    return {row["domain"]: row["kind"] for row in kinds["sites"]}


def sources(brief: Dict[str, Any], out: Path, answers: List[Dict[str, Any]], force: bool = False, limit: int = 8, model: Optional[str] = None, costs: Optional[Costs] = None) -> List[Dict[str, Any]]:
    """The sites the answers cite, the most cited first, each read to see whether it names the client."""
    path = out / "sources.json"
    if path.exists() and not force:
        return load(path)
    sites: Dict[str, Dict[str, Any]] = {}
    for index, answer in enumerate(answers):
        for citation in answer["citations"]:
            site = sites.setdefault(web.domain_of(citation["url"]), {"answers": set(), "pages": Counter(), "titles": {}})
            site["answers"].add(index)
            site["pages"][citation["url"]] += 1
            site["titles"].setdefault(citation["url"], citation.get("title"))
    extra = {web.domain_of(url): url for url in brief.get("extraSources") or []}
    ranked = sorted(sites, key=lambda domain: (-len(sites[domain]["answers"]), domain))[:limit]
    rows = []
    for domain in ranked + [domain for domain in extra if domain not in ranked]:
        site = sites.get(domain)
        pages = [url for url, _ in site["pages"].most_common(3)] if site else []
        if domain in extra and extra[domain] not in pages:
            pages.append(extra[domain])
        listed: Optional[bool] = None
        for url in pages:
            print(f"  reading {url}")
            page = web.fetch(url)
            if page is None:
                continue
            listed = bool(listed) or web.names(page[0], spellings(brief))
        top = pages[0] if pages else None
        rows.append(
            {
                "name": domain,
                "url": top,
                "title": (site["titles"].get(top) if site and top else None),
                "kind": kind_of(domain, brief),
                "answers": len(site["answers"]) if site else 0,
                "brandListed": listed,
            }
        )
    if model and costs:
        businesses = sorted({business["name"] for answer in answers for business in answer["businesses"]})
        judged = site_kinds(brief, {row["name"]: row["title"] for row in rows if row["kind"] == "other"}, businesses, model, costs)
        for row in rows:
            row["kind"] = judged.get(row["name"], row["kind"]) if row["kind"] == "other" else row["kind"]
    for row in rows:
        # A competitor's own site will never list the client: "not there" would read as a gap to close
        if row["kind"] in ("competitor", "own"):
            row["brandListed"] = None
    save(path, rows)
    return rows


def site(brief: Dict[str, Any], out: Path, force: bool = False) -> List[Dict[str, Any]]:
    """The client's own website as text, for the facts check. Empty when there is no site or it can't be read."""
    path = out / "site.json"
    if path.exists() and not force:
        return load(path)
    # The address in the brief, and any other site of the client's (`brand.sites`: a school's own site beside its group's)
    domains = [domain for domain in [brief["brand"].get("domain")] + list(brief["brand"].get("sites") or []) if domain]
    pages = []
    for domain in domains:
        found = web.read_site(domain, brief["language"])
        print(f"  {domain}: {len(found)} pages read")
        pages += found
    if not domains:
        print("  no website in the brief")
    save(path, pages)
    return pages


# --- analyze ------------------------------------------------------------------------------------------

ANALYZE_RULES = """You are an analyst writing a pilot report for the management of one business about how an AI assistant (ChatGPT) answers its customers' questions. You get: the brief, the counts (already counted: never change or recompute a number), what the assistant says about each business, the sites it cites and whether the client is on them, the assistant's answer to a direct question about the client, and the text of the client's own website.

Write everything in {language}. The reader is a business owner, not a marketer: plain words, short sentences, no jargon (no "GEO", "LLM", "share of voice", "entity"). Say "ИИ"/"SI"/"AI" for the assistant in running text.

Form:
- Plain text only: no markdown, no asterisks, no quotation marks around a whole value. A point's `lead` is two to four words ending with a full stop; its `text` is one sentence of at most 20 words.
- Write as the people who did the measurement: "we found", "the answers show". Never mention the input, "the data given", field names or words like true/false/null.
- Keep it short, the report is laid out on fixed pages: a section title at most 12 words; a note at most 30 words; a reason's evidence at most 35 words; a fact's `found` at most 20 words and its `example` only the assistant's few words about another business, without that business's name; a decision's `when` at most three words, its `why` and `risk` at most 25 words each, each option at most six words; a task at most six words, its `done` at most eight, its `owner` at most three; a target's `now` at most five words and its `goal` at most eight; a limit's `limit` two to four words ending with a full stop, its `text` and `action` at most 15 words each; a footnote at most 25 words.

Honesty rules, which matter more than a good story:
- Use only the facts in the input. Never invent a number, a price, a source or a quote. Counts are written as "N из M" / "M tadan N ta" / "N of M", never as percentages: the sample is small.
- Separate what was found from what is assumed. A reason's confidence is "high" only when the input shows it directly, "medium" when it fits the evidence but was not checked, "low" for an assumption.
- If the client's website text is empty, say the site was not read and do not claim what it lacks. If it was read, the facts check must use it.
- If the direct answer about the client contains something that contradicts the client's website, name it as a wrong fact in the flags.
- If the client's own site uses a name or an abbreviation that the answers use for another business (two schools both called by the same three letters), say so in the flags and the reasons: an assistant may take one for the other.
- When the client is named and recommended often, say so plainly: the report is not obliged to find a crisis.

What to write:
- terms: the category's noun in {language}, one word where one word is enough ("школа", not "частная школа"): nominative singular, accusative singular, genitive plural (for Uzbek and English: the plain noun, the plain noun, the plural).
- coverLead: one sentence on what the report answers. headline: the main finding in two short sentences, naming the client and the leader.
- brandLead and brandNote: what the assistant says about the client, in a few words and then one sentence. leaderQuote: how the assistant describes the leader, its own words from the input, or null. profilesNote: one line on where the two profiles come from.
- flags (2-3), strengths (2-3), firstSteps (3-5): each with a short bold lead and one sentence.
- sections: for each, `title` is that section's finding as a sentence (not a label) and `note` its conclusion in one or two sentences, or null. Keys: questions, leaders, peers, reasons, facts, decisions, plan, targets, limits.
- quote: one sentence from an answer's `advice`, word for word, in which the assistant names the businesses it suggests, with its source ("ChatGPT, вопрос 4" in the report's language), or null when no advice names a business.
- leadersNote: one plain point about the businesses that are named but never recommended (how many, and in what kind of answer they appear), or null when there is nothing clear to say.
- peers: `names` = 3-5 businesses from the counts whose profile, place or price is closest to the client's (exact names from the counts); `profile` = one sentence on the client's own profile and where that is known from; `unit` and `ranges` = when the assistant states comparable prices for the peers, the unit as a caption and each peer's range as numbers in that unit (high null for "from ..."; low and high equal for one price) with a label of a few characters that is only the number as a reader would write it ("6,6–8,7", "от 6", "4,8"), plus the client's row (low and high null when no price is known, its label two or three words saying so). Leave out a peer with no price. Otherwise unit null and ranges empty.
- reasons (2-4), most certain first. sourcesNote: the one thing the sources table shows. sourcesFootnote: what was and wasn't checked.
- facts (6-8): the facts the assistant states about businesses of this category (price, programme, location and so on); for each, an example of the assistant's wording about another business, what is found about the client (from its site, the direct answer and the sources) and a status: found, partial or missing. factsNote, factsFootnote.
- decisions (3-4): each a question the management must decide, our recommendation, why (from the evidence), 2-3 options, the risk, when (in words), effect and cost as high, medium or low.
- plan: 4-6 tasks over 12 weeks: own website first, outside sources next, a repeat measurement last (kind: site, external, measure); `done` says how one sees the task is finished; `owner` is a role, not a name.
- targets (3-4): a figure, its value now, its tone (bad, warn, ok) and a modest goal for the repeat measurement. Do not promise results.
- changes: null unless the input has `previousReport`. When it has: `title` = what changed since that report, as a finding in one sentence (say plainly when nothing changed or it got worse); `note` = what that means, one or two sentences, or null; `callout` = the one change that matters most, or null; `targets` = one entry for every target of the previous report, in the same order and with its `metric` copied exactly: `now` = its value in this measurement in the same wording as its old value, `met` = true or false against its goal, or null when this measurement cannot tell. Also, when `previousReport` is given, name each fact in `facts` exactly as the previous report named it wherever it is the same fact, so the two can be compared. A change between two small samples may be chance: never call it a result of the work unless the evidence shows the link (the client now appears on a source it was missing from, a fact it published is now quoted).
- When the same questions were also asked to other models, say in the questions section's note, in one clause, whether the client's place holds across them ("on every model: 1 or 2 of 27"), and never present one model's count as what every user sees.
- limits (4-5): each limit of this pilot with what to do about it; always the sample size, that answers change between runs, and what was not checked. checks (3-5): what the management should verify before deciding."""


def analysis_schema() -> Dict[str, Any]:
    section = obj(title=STR, note=OPT)
    return obj(
        terms=obj(one=STR, acc=STR, genPlural=STR),
        coverLead=STR,
        headline=STR,
        brandLead=STR,
        brandNote=STR,
        leaderQuote=OPT,
        profilesNote=STR,
        flags=arr(POINT),
        strengths=arr(POINT),
        firstSteps=arr(POINT),
        sections=obj(**{key: section for key in ("questions", "leaders", "peers", "reasons", "facts", "decisions", "plan", "targets", "limits")}),
        quote={"anyOf": [obj(text=STR, source=STR), {"type": "null"}]},
        leadersNote={"anyOf": [POINT, {"type": "null"}]},
        peers=obj(
            names=arr(STR),
            profile=STR,
            unit=OPT,
            ranges=arr(obj(name=STR, low={"type": ["number", "null"]}, high={"type": ["number", "null"]}, label=STR)),
        ),
        reasons=arr(obj(reason=STR, confidence=LEVEL, evidence=STR)),
        sourcesNote={"anyOf": [POINT, {"type": "null"}]},
        sourcesFootnote=OPT,
        facts=arr(obj(fact=STR, example=OPT, found=STR, status={"type": "string", "enum": ["found", "partial", "missing"]})),
        factsNote={"anyOf": [POINT, {"type": "null"}]},
        factsFootnote=OPT,
        decisions=arr(obj(question=STR, recommendation=STR, why=STR, options=arr(STR), risk=STR, when=STR, effect=LEVEL, cost=LEVEL)),
        plan=arr(obj(task=STR, done=STR, owner=STR, **{"from": {"type": "integer"}}, to={"type": "integer"}, kind={"type": "string", "enum": ["site", "external", "measure"]})),
        targets=arr(obj(metric=STR, now=STR, tone={"type": "string", "enum": ["bad", "warn", "ok"]}, goal=STR)),
        limits=arr(obj(limit=STR, text=STR, action=STR)),
        checks=arr(POINT),
        changes={"anyOf": [obj(title=STR, note=OPT, callout={"anyOf": [POINT, {"type": "null"}]}, targets=arr(obj(metric=STR, now=STR, met={"type": ["boolean", "null"]}))), {"type": "null"}]},
    )


def analyze(brief: Dict[str, Any], out: Path, counts: Dict[str, Any], answers: List[Dict[str, Any]], cited: List[Dict[str, Any]], pages: List[Dict[str, Any]], model: str, costs: Costs, force: bool = False, before: Optional[Dict[str, Any]] = None, models: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    path = out / "analysis.json"
    if path.exists() and not force:
        return load(path)
    direct = out / "raw" / "brand.json"
    material = {
        "brief": {key: brief[key] for key in ("brand", "category", "city", "preparedFor", "attributes") if key in brief},
        "method": {"questions": len(brief["questions"]), "samplesPerQuestion": brief.get("samples", 3), "answers": counts["answers"]},
        "counts": {"totals": counts["totals"], "questions": counts["questions"], "businesses": counts["brands"][:30]},
        "advice": [{"question": answer["question"] + 1, "sample": answer["sample"], "advice": answer["advice"]} for answer in answers if answer.get("advice")],
        "sources": cited,
        "directAnswerAboutClient": llm.text_of(load(direct)["response"]) if direct.exists() else None,
        "clientWebsite": pages,
    }
    if models and len(models) > 1:
        # The same questions asked to other models: the first row is the model the report is counted on
        material["sameQuestionsOnOtherModels"] = models
    if before:
        # What the earlier report found and promised, so this one can say what changed and whether its goals were met
        material["previousReport"] = {
            "measuredOn": before["method"]["collectedAt"],
            "answers": before["method"]["answers"],
            "totals": before["totals"],
            "headline": before["summary"]["headline"],
            "facts": [{"fact": fact["fact"], "status": fact["status"]} for fact in before.get("facts") or []],
            "sources": [{"name": source["name"], "answers": source["answers"], "brandListed": source["brandListed"]} for source in before.get("sources") or []],
            "decisions": [{"question": decision["question"], "recommendation": decision["recommendation"]} for decision in before.get("decisions") or []],
            "targets": before.get("targets") or [],
            "countedChanges": compare(before, counts, cited, []),
        }
    print("  writing the analysis")
    written, response = llm.structured(
        model,
        ANALYZE_RULES.replace("{language}", LANGUAGES.get(brief["language"], "Russian")),
        json.dumps(material, ensure_ascii=False),
        "pilot_analysis",
        analysis_schema(),
    )
    costs.add("analyze", response)
    save(path, written)
    return written


# --- build --------------------------------------------------------------------------------------------


def tidy(value: Any) -> Any:
    """Takes a model's formatting out of its sentences: bold marks, stray spaces."""
    if isinstance(value, str):
        return " ".join(value.replace("**", "").replace("__", "").split())
    if isinstance(value, list):
        return [tidy(item) for item in value]
    if isinstance(value, dict):
        return {key: tidy(item) for key, item in value.items()}
    return value


def closed(lead: str) -> str:
    """A bold lead reads into its sentence: it ends with a stop of its own."""
    return lead if not lead or lead[-1] in ".!?:»\"" else f"{lead}."


def build(brief: Dict[str, Any], counts: Dict[str, Any], cited: List[Dict[str, Any]], written: Dict[str, Any], collected_at: str, model: str, before: Optional[Dict[str, Any]] = None, models: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """The report's file, in the shape of `frontend/src/features/pilot/types`."""
    written = tidy(written)
    for points in (written["flags"], written["strengths"], written["checks"]):
        for point in points:
            point["lead"] = closed(point["lead"])
    for limit in written["limits"]:
        limit["limit"] = closed(limit["limit"])
    peers = {name.casefold() for name in written["peers"]["names"]}
    brands = [{**brand, "peer": brand["isClient"] or brand["name"].casefold() in peers} for brand in counts["brands"]]
    known = {brand["name"].casefold() for brand in brands}
    weeks = 12
    previous = None
    if before:
        text = written.get("changes") or {"title": "", "note": None, "callout": None, "targets": []}
        drafted = {target["metric"].casefold(): target for target in text["targets"]}
        previous = {
            **compare(before, counts, cited, written["facts"]),
            "title": text["title"],
            "note": text["note"],
            "callout": text["callout"],
            # Every goal the earlier report set, in its order; one the draft skipped stays "not measured"
            "targets": [
                {
                    "metric": target["metric"],
                    "goal": target["goal"],
                    "was": target["now"],
                    "now": drafted.get(target["metric"].casefold(), {}).get("now", "—"),
                    "met": drafted.get(target["metric"].casefold(), {}).get("met"),
                }
                for target in before.get("targets") or []
            ],
        }
    return {
        "slug": brief["slug"],
        "language": brief["language"],
        "brand": {"name": brief["brand"]["name"], "aliases": brief["brand"].get("aliases") or [], "domain": brief["brand"].get("domain"), "city": brief["city"]},
        "terms": written["terms"],
        "preparedFor": brief.get("preparedFor", ""),
        "method": {
            "engine": "ChatGPT",
            "model": model,
            "webSearch": True,
            "collectedAt": collected_at,
            "questions": len(brief["questions"]),
            "samples": brief.get("samples", 3),
            "answers": counts["answers"],
            "languages": sorted({question["language"] for question in brief["questions"]}),
        },
        "attributes": brief["attributes"],
        "totals": counts["totals"],
        "summary": {key: written[key] for key in ("coverLead", "headline", "brandLead", "brandNote", "leaderQuote", "profilesNote", "flags", "strengths", "firstSteps")},
        "sections": written["sections"],
        "questions": counts["questions"],
        "quote": written["quote"],
        "brands": brands,
        "leadersNote": written["leadersNote"],
        "peers": {
            "profile": written["peers"]["profile"],
            "unit": written["peers"]["unit"],
            # Only the businesses the answers name: a range for anyone else has nothing behind it
            "ranges": [row for row in written["peers"]["ranges"] if row["name"].casefold() in known],
        },
        "reasons": written["reasons"],
        "sources": cited,
        "sourcesNote": written["sourcesNote"],
        "sourcesFootnote": written["sourcesFootnote"],
        "facts": written["facts"],
        "factsNote": written["factsNote"],
        "factsFootnote": written["factsFootnote"],
        "decisions": written["decisions"],
        "plan": {"weeks": weeks, "tasks": [{**task, "from": max(1, min(weeks, task["from"])), "to": max(1, min(weeks, max(task["from"], task["to"])))} for task in written["plan"]]},
        "targets": written["targets"],
        "limits": written["limits"],
        "checks": written["checks"],
        "contact": {key: (brief.get("contact") or {}).get(key) for key in ("phone", "telegram", "email")},
        "previous": previous,
        "models": models if models and len(models) > 1 else None,
    }
