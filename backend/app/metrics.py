"""Every number the report shows, computed in code from one check's data object (report spec §6.3, §10). No
model writes a number; the pages and the digest show these, and work out none of their own.

    compute(wave)    the metrics of a check, by part

Phase 0 item 0.1 brings the scope card (spec §4.0), counted from the slot log alone: what was planned, what
came back, what was left out and why. Item 0.2 brings counts in the place of the 0–100 score (spec rules 1, 5,
6, 9; §6.3): the client's count over the buyers' answers, every tracked brand's count with ties grouped, its tone
per mention, its place only where an answer names it in a numbered list, share of voice only from enough
mentions, and how often the client's site is cited. Nothing is defaulted: what can't be measured is None, and
the pages write "N/A". Item 0.3 brings one rounding rule (`share`), shown beside its count, and the counts of
the sections that showed shares: each assistant, each topic and question language, each cited site, and the
brand-question check's verdicts, kept apart from every count of the buyers' answers. The other parts come with
their items.
"""

from __future__ import annotations

import json
import re
import statistics
from collections import Counter
from typing import Any, Dict, List, Optional

from . import domains

# The assistants the scope card lists, in its order, and the ones not checked yet (spec §2, Phase 2)
ENGINE_ORDER = ["chatgpt", "gemini"]
NOT_TRACKED = ["google_ai_overviews", "yandex"]

# Spec §6.3: a count over fewer answers than this carries the "small sample" badge
SMALL_SAMPLE = 20
# Share of voice is shown only when the tracked brands are mentioned at least this often in all
SHARE_OF_VOICE_FROM = 10
# A brand's tone is summed up in a word only from this many mentions; under it, its mentions are counted
TONE_SUMMARY_FROM = 3
TONES = ["positive", "neutral", "negative"]
# A line that is an item of a numbered list in Markdown ("3. **Name** — …", "3) Name"): only there does an
# answer give a brand a place (spec §6.3); a bulleted list, a table or a paragraph names brands in no order
NUMBERED = re.compile(r"^\s*(\d{1,3})[.)]\s+")


def compute(wave: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "scope": scope(wave),
        "visibility": visibility(wave),
        "brands": brands(wave),
        "assistants": assistants(wave),
        "topics": groups(wave, "topic"),
        "languages": groups(wave, "lang"),
        "sources": sources(wave),
        "claims": claims(wave),
    }


def share(k: int, n: int) -> Optional[int]:
    """A count as a whole percent of what it is counted over, rounded half up (12.5 is 13): the one rounding rule
    for every share the report shows (spec 0.3), which shows it beside its count. None when there is nothing to
    count over. In whole numbers, so no floating point can tip a half."""
    return None if n <= 0 else (200 * k + n) // (2 * n)


def _tally(slots: List[Dict[str, Any]]) -> Dict[str, Any]:
    """How a set of slots came out, with why the failed ones failed and the excluded ones were left out."""
    statuses = Counter(slot["status"] for slot in slots)
    return {
        "slots": len(slots),
        # Put to the assistant: every slot but the ones left out
        "asked": len(slots) - statuses["excluded"],
        "completed": statuses["completed"],
        "failed": statuses["failed"],
        "excluded": statuses["excluded"],
        # Planned and never closed: the check stopped before the call came back
        "unfinished": statuses["planned"],
        "failed_reasons": dict(Counter(slot["reason"] or "not_logged" for slot in slots if slot["status"] == "failed")),
        "excluded_reasons": dict(Counter(slot["reason"] or "not_planned" for slot in slots if slot["status"] == "excluded")),
    }


def _engine(engine: str, slots: List[Dict[str, Any]]) -> Dict[str, Any]:
    """One assistant on the scope card: its models, where its answers come from, what it was told of the
    customer's place, how its slots came out, and how many of its answers searched the web."""
    asked = [slot for slot in slots if slot["engine"] == engine and slot["status"] != "excluded"]
    done = [slot for slot in asked if slot["status"] == "completed"]
    places = Counter(json.dumps(slot["location"], sort_keys=True) for slot in asked)
    return {
        "engine": engine,
        "models": sorted({slot["model"] for slot in done if slot["model"]}),
        "surface": next((slot["surface"] for slot in asked if slot["surface"]), None),
        # The location most of its calls were told, and whether all of them were told the same
        "location": json.loads(places.most_common(1)[0][0]) if places else None,
        "location_varies": len(places) > 1,
        **_tally([slot for slot in slots if slot["engine"] == engine]),
        "searched": sum(1 for slot in done if slot["searched"]),
    }


def scope(wave: Dict[str, Any]) -> Dict[str, Any]:
    """The scope card: what this check is, from its slot log only (spec §4.0)."""
    slots = wave["slots"]
    discovery = [slot for slot in slots if slot["group"] == "discovery"]
    branded = [slot for slot in slots if slot["group"] == "branded"]
    engines = [engine for engine in ENGINE_ORDER if any(slot["engine"] == engine for slot in slots)]
    engines += sorted({slot["engine"] for slot in slots} - set(engines))
    prompts = {prompt["id"]: prompt for prompt in wave["prompts"]}
    asked = list(dict.fromkeys(slot["prompt_id"] for slot in discovery))
    group_of = {prompt["id"]: prompt["group"] for prompt in wave["prompts"]}
    # Businesses the buyers' answers name that the project doesn't track, each spelling once
    others = {mention["name"].casefold() for answer in wave["answers"] if group_of.get(answer["prompt_id"]) == "discovery" for mention in answer["mentions"] if not mention["tracked"]}
    return {
        "wave": {key: wave["wave"][key] for key in ("number", "is_baseline", "kind", "collected_at", "settings_hash", "reconstructed")},
        "engines": [_engine(engine, discovery) for engine in engines],
        "not_tracked": NOT_TRACKED,
        "prompts": {
            "discovery": len(asked),
            "by_language": dict(Counter(prompts[prompt_id]["lang"] for prompt_id in asked if prompt_id in prompts)),
            "branded": len({slot["prompt_id"] for slot in branded}),
            "howto": 0,
        },
        "runs_per_prompt": wave["wave"]["runs_per_prompt"],
        "slots": _tally(discovery),
        "answers_by_language": dict(Counter(slot["lang"] for slot in discovery if slot["status"] == "completed")),
        "branded": {**_tally(branded), "engines": [{"engine": engine, **_tally([slot for slot in branded if slot["engine"] == engine])} for engine in engines]},
        "brands_tracked": 1 + len(wave["project"]["competitors"]),
        "other_names": len(others),
    }


# --- counts in the place of a score (0.2) ---------------------------------------------------------------


def _discovery(wave: Dict[str, Any]) -> List[Dict[str, Any]]:
    """The buyers' answers: every completed answer to a discovery question. The brand questions' answers are
    the brand-facts check's, never counted here (spec rule 4)."""
    group_of = {prompt["id"]: prompt["group"] for prompt in wave["prompts"]}
    return [answer for answer in wave["answers"] if group_of.get(answer["prompt_id"]) == "discovery"]


def _host(domain: str) -> str:
    domain = (domain or "").strip().lower()
    return domain[4:] if domain.startswith("www.") else domain


def _tracked(wave: Dict[str, Any]) -> List[Dict[str, Any]]:
    """The client, then its competitors in the project's order, each with whether it is the client."""
    project = wave["project"]
    return [{**project["brand"], "own": True}] + [{**competitor, "own": False} for competitor in project["competitors"]]


def visibility(wave: Dict[str, Any]) -> Dict[str, Any]:
    """The headline (spec rule 1, §4.1): the buyers' answers that name the client, out of all of them, and the
    questions it was named in at least once, out of the questions with an answer (§6.3, prompt coverage)."""
    client = wave["project"]["brand"]["id"]
    answers = _discovery(wave)
    named = [answer for answer in answers if any(mention["brand_id"] == client for mention in answer["mentions"])]
    rivals = {competitor["id"] for competitor in wave["project"]["competitors"]}
    prompts = list(dict.fromkeys(answer["prompt_id"] for answer in answers))
    with_client = {answer["prompt_id"] for answer in named}
    with_rivals = {answer["prompt_id"] for answer in answers if any(mention["brand_id"] in rivals for mention in answer["mentions"])}
    cited = [answer for answer in answers if answer["citations"]]
    own = {_host(domain) for domain in wave["project"]["brand"]["domains"]}
    return {
        "answers": len(answers),
        "named": len(named),
        "small_sample": len(answers) < SMALL_SAMPLE,
        "small_sample_below": SMALL_SAMPLE,
        "prompts": len(prompts),
        "prompts_named": len(with_client),
        # Questions where a tracked competitor was named and the client never was
        "prompts_only_rivals": len(with_rivals - with_client),
        # Spec §6.3, client citation rate: answers citing a site of the client's over answers citing any site
        # (the user's decision of 21 Nov 2026, not over every answer)
        "cited_answers": len(cited),
        "client_cited": sum(1 for answer in cited if any(_host(citation["domain"]) in own for citation in answer["citations"])),
    }


def _place(answer: Dict[str, Any], names: List[str]) -> Optional[int]:
    """The number of the numbered list's item the answer first names the brand in, or None when the line it is
    first named on isn't one (a bulleted list, a table, a paragraph: no order, so no place)."""
    wanted = [name.casefold() for name in names if name and name.strip()]
    for line in answer["text"].splitlines():
        folded = line.casefold()
        if any(name in folded for name in wanted):
            match = NUMBERED.match(line)
            return int(match.group(1)) if match else None
    return None


def _tone(mentions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """A brand's tone, counted per mention (spec §6.3): each tone's count, and a word for them all only from
    TONE_SUMMARY_FROM mentions (the most frequent tone, "mixed" when two share the top). None at no mention:
    there is nothing to measure, and nothing stands in for it."""
    counts = Counter(mention["tone"] for mention in mentions)
    summary: Optional[str] = None
    if len(mentions) >= TONE_SUMMARY_FROM:
        top = counts.most_common()
        summary = "mixed" if len(top) > 1 and top[0][1] == top[1][1] else top[0][0]
    return {"mentions": len(mentions), "counts": {tone: counts[tone] for tone in TONES if counts[tone]}, "summary": summary}


def _top(rows: List[Dict[str, Any]], key: str) -> Dict[str, Any]:
    """The brands with the highest count of `key` among the rows, all of them when they tie; none at 0."""
    best = max([row[key] for row in rows], default=0)
    return {"value": best, "ids": [row["id"] for row in rows if best > 0 and row[key] == best]}


def brands(wave: Dict[str, Any]) -> Dict[str, Any]:
    """Every tracked brand over the buyers' answers (spec §4.4, §6.3), the client first: the answers naming it,
    its rank, its tone per mention, its place where an answer gives one, the answers citing its site. Ranks
    group ties: brands named equally often share a place, and a brand named nowhere has none. Share of voice
    only when the tracked brands are mentioned SHARE_OF_VOICE_FROM times in all; under it, the raw counts."""
    answers = _discovery(wave)
    rows: List[Dict[str, Any]] = []
    for brand in _tracked(wave):
        domains = {_host(domain) for domain in brand["domains"]}
        theirs = [(answer, [mention for mention in answer["mentions"] if mention["brand_id"] == brand["id"]]) for answer in answers]
        theirs = [(answer, mentions) for answer, mentions in theirs if mentions]
        places = [place for answer, mentions in theirs for place in [_place(answer, [mentions[0]["name"], brand["name"], *brand["aliases"]])] if place is not None]
        rows.append(
            {
                "id": brand["id"],
                "name": brand["name"],
                "own": brand["own"],
                "named": len(theirs),
                "answers": len(answers),
                "prompts_named": len({answer["prompt_id"] for answer, _ in theirs}),
                "mentions": sum(len(mentions) for _, mentions in theirs),
                "tone": _tone([mention for _, mentions in theirs for mention in mentions]),
                # Spec §6.3: a place only from numbered lists, "numbered list in k of n answers"
                "position": {"numbered": len(places), "named": len(theirs), "median": statistics.median(places) if places else None},
                "cited": sum(1 for answer in answers if domains and any(_host(citation["domain"]) in domains for citation in answer["citations"])),
            }
        )
    for row in rows:
        if row["named"] == 0:
            row["rank"] = None
        else:
            row["rank"] = {"place": 1 + sum(1 for other in rows if other["named"] > row["named"]), "tied": sum(1 for other in rows if other["named"] == row["named"])}
    total = sum(row["mentions"] for row in rows)
    shown = total >= SHARE_OF_VOICE_FROM
    rivals = [row for row in rows if not row["own"]]
    return {
        "rows": rows,
        # Who is named most: a leader only when one brand is named more often than every other
        "leaders": _top(rows, "named")["ids"],
        # The strongest competitor on each count, every one of them when they tie
        "rivals_top": {key: _top(rivals, key) for key in ("named", "prompts_named", "mentions", "cited")},
        "tone_summary_from": TONE_SUMMARY_FROM,
        "share_of_voice": {
            "mentions": total,
            "minimum": SHARE_OF_VOICE_FROM,
            "shown": shown,
            "shares": {row["id"]: {"k": row["mentions"], "n": total} for row in rows} if shown else None,
        },
    }


# --- the sections' counts, each share beside its count (0.3) -------------------------------------------


def _named_in(answers: List[Dict[str, Any]], brand_id: str) -> int:
    return sum(1 for answer in answers if any(mention["brand_id"] == brand_id for mention in answer["mentions"]))


def _counts(answers: List[Dict[str, Any]], wave: Dict[str, Any], rivals_only: bool) -> Dict[str, Any]:
    """Of these answers, the ones naming each tracked brand, and who is named most (every brand that ties)."""
    rows = [{"id": brand["id"], "named": _named_in(answers, brand["id"])} for brand in _tracked(wave) if not (rivals_only and brand["own"])]
    return _top(rows, "named")


def assistants(wave: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Each assistant over its own buyers' answers: how many, how many name the client, and who it names most
    (the client among them; every brand that ties)."""
    answers = _discovery(wave)
    client = wave["project"]["brand"]["id"]
    engines = [engine for engine in ENGINE_ORDER if any(answer["engine"] == engine for answer in answers)]
    engines += sorted({answer["engine"] for answer in answers} - set(engines))
    found = []
    for engine in engines:
        theirs = [answer for answer in answers if answer["engine"] == engine]
        found.append({"engine": engine, "answers": len(theirs), "named": _named_in(theirs, client), "top": _counts(theirs, wave, rivals_only=False)})
    return found


def groups(wave: Dict[str, Any], by: str) -> List[Dict[str, Any]]:
    """The buyers' answers by topic (`by` "topic") or by question language ("lang"), in the questions' order:
    each group's questions, answers, those naming the client, and the competitors named most (every one that
    ties). The groups are not ranked here (spec §6.3's topic ranking, item 0.9)."""
    answers = _discovery(wave)
    client = wave["project"]["brand"]["id"]
    prompts = {prompt["id"]: prompt for prompt in wave["prompts"]}
    key_of = (lambda answer: prompts[answer["prompt_id"]]["topic"]) if by == "topic" else (lambda answer: answer["lang"])
    keys = list(dict.fromkeys(key_of(answer) for answer in answers if answer["prompt_id"] in prompts))
    found = []
    for key in keys:
        theirs = [answer for answer in answers if answer["prompt_id"] in prompts and key_of(answer) == key]
        found.append(
            {
                "key": key,
                "prompts": len({answer["prompt_id"] for answer in theirs}),
                "answers": len(theirs),
                "named": _named_in(theirs, client),
                "rivals": _counts(theirs, wave, rivals_only=True),
            }
        )
    return found


def sources(wave: Dict[str, Any]) -> Dict[str, Any]:
    """The sites the buyers' answers cite (spec §4.6, §6.3): each counted once per answer, over the answers that
    cite any site, the most cited first, with its type, who controls it, who typed it, whether it lists the client
    and how many tracked competitors are beside it; the sites by type, counted in sites; and the placement target
    list, the only sites a "get listed" action may name (§7: `domains.placeable`)."""
    answers = [answer for answer in _discovery(wave) if answer["citations"]]
    typed = {domain["domain"]: domain for domain in wave["domains"]}
    cited: Counter = Counter(domain for answer in answers for domain in {citation["domain"] for citation in answer["citations"]})
    rows = []
    for domain, count in sorted(cited.items(), key=lambda item: (-item[1], item[0])):
        site = typed.get(domain) or {"type": "unclassified", "control": "not_addressable", "route": None, "review": "seed", "listed": False, "rivals": []}
        rows.append(
            {
                "domain": domain,
                "type": site["type"],
                "control": site["control"],
                "review": site["review"],
                "route": site["route"],
                "listed": bool(site["listed"]),
                "rivals": len(site["rivals"]),
                "cited": count,
                "target": domains.placeable(site["type"], site["route"], bool(site["listed"]), site["rivals"]),
            }
        )
    by_type = Counter(row["type"] for row in rows)
    return {
        "cited_answers": len(answers),
        "sites": len(rows),
        "rows": rows,
        "types": {kind: by_type[kind] for kind in domains.TYPES if by_type[kind]},
        "targets": [row["domain"] for row in rows if row["target"]],
    }


# The brand-question check's verdicts as the spec names them (§4.7), from what the check calls them
VERDICTS = {"confirmed": "verified", "unverified": "unverified", "contradicted": "contradicted"}


def claims(wave: Dict[str, Any]) -> Dict[str, Any]:
    """The brand-question check (spec §4.7), apart from every count of the buyers' answers: its answers and each
    of their statements' verdict against the website. "Outdated" isn't checked: it needs the date of the page
    compared with."""
    statements = [statement for view in wave["branded"] for statement in view["statements"]]
    verdicts = Counter(VERDICTS.get(str(statement.get("check")), "unverified") for statement in statements)
    return {"answers": len(wave["branded"]), "statements": len(statements), **{verdict: verdicts[verdict] for verdict in ("verified", "unverified", "contradicted")}}
