"""Counts in the place of a score (Phase 0 items 0.2, 0.3): the numbers `app/metrics.py` computes from a check's
data object, on the baseline client's check and on made-up checks for each rule (spec rules 1, 5, 6, 9; §4.6,
§4.7, §6.3)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app import delivery, metrics, wave

# --- the baseline ---------------------------------------------------------------------------------------


def test_the_baseline_headline_is_a_count(db: Any, project: Any, run_id: str, expected: Dict[str, Any]) -> None:
    seen = wave.payload(db, project, run_id)["metrics"]["visibility"]
    assert [seen["named"], seen["answers"]] == expected["headline"]
    assert seen["answers"] == expected["scope"]["completed"] and seen["small_sample"]
    assert seen["prompts"] == expected["scope"]["discovery_prompts"] and seen["prompts_named"] == 0
    # The user's decision of 21 Nov 2026: the client's site over the answers that cite any site
    assert seen["client_cited"] == 0 and 0 < seen["cited_answers"] < seen["answers"]


def test_the_baseline_rivals_are_tied_without_place_tone_or_share(db: Any, project: Any, run_id: str, brand_ids: Dict[str, str], expected: Dict[str, Any]) -> None:
    found = wave.payload(db, project, run_id)["metrics"]["brands"]
    rows = {row["id"]: row for row in found["rows"]}
    first, second = (rows[brand_ids[name]] for name in expected["tied_at_one"])
    assert first["named"] == second["named"] == 1 and first["rank"] == second["rank"] == {"place": 1, "tied": 2}
    # Named in a bulleted list among many: no place
    assert first["position"] == second["position"] == {"numbered": 0, "named": 1, "median": None}
    # One mention each: counted, not summed up
    assert first["tone"]["summary"] is None and first["tone"]["mentions"] == 1
    assert sorted(found["leaders"]) == sorted([first["id"], second["id"]])
    assert not found["share_of_voice"]["shown"] and found["share_of_voice"]["shares"] is None


def test_the_baseline_client_has_nothing_to_measure(db: Any, project: Any, run_id: str, brand_ids: Dict[str, str], expected: Dict[str, Any]) -> None:
    rows = {row["id"]: row for row in wave.payload(db, project, run_id)["metrics"]["brands"]["rows"]}
    client = rows[brand_ids[expected["brand"]]]
    assert client["own"] and client["named"] == 0 and client["rank"] is None
    assert client["tone"] == {"mentions": 0, "counts": {}, "summary": None}
    assert client["position"]["median"] is None
    # Every tracked brand is there, at 0 too
    assert {rows[brand_ids[name]]["named"] for name in expected["competitors"] if name not in expected["tied_at_one"]} == {0}


def test_the_report_has_no_score(report: Dict[str, Any]) -> None:
    assert "conditionHistory" not in report


def test_the_email_tells_counts_not_a_score(db: Any, project: Any, run_id: str, expected: Dict[str, Any]) -> None:
    facts = delivery.summary(wave.payload(db, project, run_id))
    assert [facts["named"], facts["answers"]] == expected["headline"]
    text = delivery.message(facts, "en", "https://example.test/report", None).get_body(("plain",)).get_content()
    assert "/ 100" not in text and "100" not in text.replace(str(facts["answers"]), "")
    assert f"{facts['named']}/{facts['answers']}" in text and "tied" in text


def test_the_email_opens_with_the_digest(db: Any, project: Any, run_id: str) -> None:
    from app import digest

    found = wave.payload(db, project, run_id)
    lines = digest.for_run(db, project, run_id, "en", "https://example.test/report")
    email = delivery.message(delivery.summary(found), "en", "https://example.test/report", None, lines)
    text = email.get_body(("plain",)).get_content()
    assert text.startswith(lines.splitlines()[0]) and lines in text
    assert lines.splitlines()[1] in email.get_body(("html",)).get_content()


# --- the rules, on made-up checks -----------------------------------------------------------------------


def _brand(key: str, domain: str = "") -> Dict[str, Any]:
    return {"id": key, "name": key.title(), "aliases": [], "domains": [domain] if domain else []}


def _answer(key: str, prompt: str, text: str, named: List[tuple], cites: List[str] = (), engine: str = "gemini", lang: str = "ru") -> Dict[str, Any]:
    return {
        "id": key,
        "prompt_id": prompt,
        "engine": engine,
        "lang": lang,
        "text": text,
        "mentions": [{"brand_id": brand, "name": brand.title() if brand else name, "tracked": bool(brand), "position": index, "tone": tone, "recommended": False} for index, (brand, name, tone) in enumerate(named, start=1)],
        "citations": [{"url": f"https://{domain}/", "title": None, "domain": domain} for domain in cites],
    }


def _wave(answers: List[Dict[str, Any]], prompts: Optional[List[str]] = None, domains: Optional[List[Dict[str, Any]]] = None, branded: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    keys = prompts or sorted({answer["prompt_id"] for answer in answers})
    return {
        "project": {"brand": _brand("acme", "acme.uz"), "competitors": [_brand("bolt", "bolt.uz"), _brand("cora"), _brand("dart")]},
        "prompts": [{"id": key, "group": "discovery", "topic": "prices" if key in ("p1", "p2") else "service"} for key in keys] + [{"id": "brand:1", "group": "branded", "topic": ""}],
        "answers": answers,
        "domains": domains or [],
        "branded": branded or [],
    }


def test_a_place_comes_only_from_a_numbered_list() -> None:
    numbered = _answer("a1", "p1", "Best:\n1. **Bolt** — fast\n2. Acme, cheap\n", [("bolt", "", "positive"), ("acme", "", "neutral")])
    bulleted = _answer("a2", "p1", "Options:\n* **Bolt** — fast\n* Acme\n", [("bolt", "", "positive"), ("acme", "", "neutral")])
    rows = {row["id"]: row for row in metrics.brands(_wave([numbered, bulleted]))["rows"]}
    assert rows["bolt"]["position"] == {"numbered": 1, "named": 2, "median": 1}
    assert rows["acme"]["position"] == {"numbered": 1, "named": 2, "median": 2}


def test_ranks_group_ties_and_skip_brands_named_nowhere() -> None:
    answers = [
        _answer("a1", "p1", "Bolt and Cora", [("bolt", "", "positive"), ("cora", "", "neutral")]),
        _answer("a2", "p2", "Bolt", [("bolt", "", "positive")]),
        _answer("a3", "p3", "Acme and Cora", [("acme", "", "positive"), ("cora", "", "neutral")]),
    ]
    found = metrics.brands(_wave(answers))
    rows = {row["id"]: row for row in found["rows"]}
    assert rows["bolt"]["rank"] == rows["cora"]["rank"] == {"place": 1, "tied": 2}
    assert rows["acme"]["rank"] == {"place": 3, "tied": 1}
    assert rows["dart"]["rank"] is None
    assert sorted(found["leaders"]) == ["bolt", "cora"]
    assert sorted(found["rivals_top"]["named"]["ids"]) == ["bolt", "cora"] and found["rivals_top"]["named"]["value"] == 2


def test_share_of_voice_waits_for_ten_mentions() -> None:
    nine = [_answer(f"a{n}", f"p{n}", "Bolt", [("bolt", "", "neutral")]) for n in range(9)]
    assert not metrics.brands(_wave(nine))["share_of_voice"]["shown"]
    ten = nine + [_answer("a9", "p9", "Acme", [("acme", "", "neutral")])]
    share = metrics.brands(_wave(ten))["share_of_voice"]
    assert share["shown"] and share["shares"]["acme"] == {"k": 1, "n": 10} and share["shares"]["bolt"] == {"k": 9, "n": 10}


def test_tone_is_counted_per_mention_and_summed_up_from_three() -> None:
    two = [_answer(f"a{n}", f"p{n}", "Bolt", [("bolt", "", "negative")]) for n in range(2)]
    tone = {row["id"]: row for row in metrics.brands(_wave(two))["rows"]}["bolt"]["tone"]
    assert tone == {"mentions": 2, "counts": {"negative": 2}, "summary": None}
    three = two + [_answer("a2", "p2", "Bolt", [("bolt", "", "positive")])]
    assert {row["id"]: row for row in metrics.brands(_wave(three))["rows"]}["bolt"]["tone"]["summary"] == "negative"
    four = three + [_answer("a3", "p3", "Bolt", [("bolt", "", "positive")])]
    assert {row["id"]: row for row in metrics.brands(_wave(four))["rows"]}["bolt"]["tone"]["summary"] == "mixed"


def test_the_brand_questions_and_untracked_names_stay_out() -> None:
    answers = [
        _answer("a1", "p1", "Acme", [("acme", "", "positive"), (None, "Zeta", "neutral")], cites=["www.acme.uz"]),
        _answer("a2", "p2", "nothing", [], cites=["2gis.uz"]),
        _answer("b1", "brand:1", "Acme is…", [("acme", "", "positive")], cites=["acme.uz"]),
    ]
    seen = metrics.visibility(_wave(answers, ["p1", "p2"]))
    assert [seen["named"], seen["answers"], seen["prompts_named"], seen["prompts"]] == [1, 2, 1, 2]
    assert [seen["client_cited"], seen["cited_answers"]] == [1, 2]
    assert metrics.brands(_wave(answers, ["p1", "p2"]))["share_of_voice"]["mentions"] == 1


# --- 0.3: one rounding rule, and the sections' counts ---------------------------------------------------


def test_a_share_is_a_whole_percent_rounded_half_up() -> None:
    assert [metrics.share(1, 8), metrics.share(3, 8), metrics.share(1, 3), metrics.share(2, 3), metrics.share(7, 7)] == [13, 38, 33, 67, 100]
    assert metrics.share(0, 0) is None


def test_the_baseline_sections_count_what_they_show(db: Any, project: Any, run_id: str, brand_ids: Dict[str, str], expected: Dict[str, Any]) -> None:
    found = wave.payload(db, project, run_id)["metrics"]
    scope = expected["scope"]
    assert {row["engine"]: row["answers"] for row in found["assistants"]} == scope["completed_by_engine"]
    assert sum(row["answers"] for row in found["topics"]) == scope["completed"] == sum(row["answers"] for row in found["languages"])
    assert {row["key"]: row["answers"] for row in found["languages"]} == scope["answers_by_language"]
    # The two rivals named once are named by one assistant, in one topic: tied there too
    tied = sorted(brand_ids[name] for name in expected["tied_at_one"])
    assert [sorted(row["rivals"]["ids"]) for row in found["topics"] if row["rivals"]["ids"]] == [tied]
    # Sites counted in sites: every cited site once, each over the answers that cite any site
    sources = found["sources"]
    assert sources["sites"] == expected["cited_domains"] == sum(sources["types"].values())
    assert all(0 < row["cited"] <= sources["cited_answers"] for row in sources["rows"])
    # The brand-question check apart: its verdicts, and none of its answers among the buyers'
    claims = found["claims"]
    assert {verdict: claims[verdict] for verdict in expected["claims"]} == expected["claims"]
    assert claims["statements"] == sum(expected["claims"].values())


def test_assistants_topics_and_languages_group_ties() -> None:
    answers = [
        _answer("a1", "p1", "Bolt, Cora", [("bolt", "", "positive"), ("cora", "", "neutral")], engine="chatgpt", lang="ru"),
        _answer("a2", "p3", "Acme", [("acme", "", "positive")], engine="gemini", lang="uz"),
    ]
    found = metrics.compute({**_wave(answers), "slots": [], "wave": {"number": 1, "is_baseline": True, "kind": "first", "collected_at": "", "settings_hash": "", "reconstructed": False, "runs_per_prompt": 1}})
    chatgpt = next(row for row in found["assistants"] if row["engine"] == "chatgpt")
    assert chatgpt["answers"] == 1 and chatgpt["named"] == 0 and sorted(chatgpt["top"]["ids"]) == ["bolt", "cora"]
    prices = next(row for row in found["topics"] if row["key"] == "prices")
    assert prices["named"] == 0 and sorted(prices["rivals"]["ids"]) == ["bolt", "cora"]
    service = next(row for row in found["topics"] if row["key"] == "service")
    assert service["named"] == 1 and service["rivals"] == {"value": 0, "ids": []}
    assert {row["key"]: (row["named"], row["answers"]) for row in found["languages"]} == {"ru": (0, 1), "uz": (1, 1)}


def _site(domain: str, kind: str, route: Optional[str] = None, listed: bool = False, rivals: List[str] = ()) -> Dict[str, Any]:
    from app import domains

    return {"domain": domain, "type": kind, "control": domains.CONTROL.get(kind, "not_addressable"), "route": {"how": "form", "url": route} if route else None, "review": "seed", "listed": listed, "rivals": list(rivals)}


def test_sites_are_counted_once_an_answer_and_split_by_type_in_sites() -> None:
    answers = [
        _answer("a1", "p1", "", [], cites=["2gis.uz", "2gis.uz", "bolt.uz"]),
        _answer("a2", "p2", "", [], cites=["2gis.uz", "acme.uz", "help.example.com"]),
        _answer("a3", "p3", "", [], cites=[]),
    ]
    domains = [_site("2gis.uz", "directory", "https://example.org/add", rivals=["bolt"]), _site("bolt.uz", "competitor_site"), _site("acme.uz", "client_owned", listed=True), _site("help.example.com", "platform_docs")]
    found = metrics.sources(_wave(answers, domains=domains))
    assert found["cited_answers"] == 2 and found["sites"] == 4
    assert [(row["domain"], row["cited"]) for row in found["rows"]] == [("2gis.uz", 2), ("acme.uz", 1), ("bolt.uz", 1), ("help.example.com", 1)]
    assert found["types"] == {"client_owned": 1, "competitor_site": 1, "directory": 1, "platform_docs": 1}
    # The one site a "get listed" action may name: a directory with a route, a competitor beside it, the client not there
    assert found["targets"] == ["2gis.uz"]
    assert {row["domain"]: row["control"] for row in found["rows"]} == {"2gis.uz": "earned", "acme.uz": "owned", "bolt.uz": "not_addressable", "help.example.com": "not_addressable"}


def test_the_brand_check_counts_each_verdict() -> None:
    branded = [{"statements": [{"check": "confirmed"}, {"check": "contradicted"}, {"check": "unverified"}]}, {"statements": [{"check": "confirmed"}]}]
    assert metrics.claims(_wave([], branded=branded)) == {"answers": 2, "statements": 4, "verified": 2, "unverified": 1, "contradicted": 1}


# --- the top finding (0.5) ------------------------------------------------------------------------------


def test_the_baseline_top_finding_is_the_question_where_competitors_appear(db: Any, project: Any, run_id: str, brand_ids: Dict[str, str], baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    found = wave.payload(db, project, run_id)["metrics"]["top_finding"]
    prompts = {prompt["id"]: prompt["text"] for prompt in baseline["tables"]["prompts"]}
    assert found["kind"] == "competitor" and prompts[found["prompt_id"]] == expected["top_finding"]["prompt"]
    assert len(found["answers"]) == found["of"] == expected["top_finding"]["answers"] and found["client_named"] == 0
    assert sorted(found["named"]) == sorted(brand_ids[name] for name in expected["tied_at_one"])


def test_the_top_finding_prefers_competitors_where_the_client_is_absent() -> None:
    answers = [
        _answer("a1", "p1", "Acme, Bolt", [("acme", "", "positive"), ("bolt", "", "neutral")]),
        _answer("a2", "p1", "Bolt", [("bolt", "", "neutral")]),
        _answer("a3", "p2", "Bolt", [("bolt", "", "neutral")]),
        _answer("a4", "p3", "Cora", [("cora", "", "neutral")], engine="chatgpt"),
        _answer("a5", "p3", "Bolt, Cora", [("bolt", "", "neutral"), ("cora", "", "neutral")]),
    ]
    found = metrics.top_finding(_wave(answers))
    # p3: competitors in 2 answers and the client in none, ahead of p1 where the client is beside them
    assert found["kind"] == "competitor" and found["prompt_id"] == "p3" and found["of"] == 2
    # ChatGPT's answer first, then the competitors by how many answers name them
    assert found["answers"] == ["a4", "a5"] and found["named"] == ["cora", "bolt"]
    shared = metrics.top_finding(_wave(answers[:2]))
    assert shared["kind"] == "shared" and shared["prompt_id"] == "p1" and shared["client_named"] == 1


def test_an_open_shelf_and_no_answer() -> None:
    assert metrics.top_finding(_wave([_answer("a1", "p1", "Nobody", [])])) == {"kind": "open", "prompt_id": None, "answers": [], "named": [], "client_named": 0, "of": 0}
    alone = metrics.top_finding(_wave([_answer("a1", "p1", "Nobody", []), _answer("a2", "p2", "Acme", [("acme", "", "positive")])]))
    assert alone["kind"] == "client" and alone["prompt_id"] == "p2"
    assert metrics.top_finding(_wave([])) is None


# --- the Free Snapshot and the digest (0.8) --------------------------------------------------------------


def test_the_baseline_shelf_and_who_appeared(db: Any, project: Any, run_id: str, brand_ids: Dict[str, str], expected: Dict[str, Any]) -> None:
    found = wave.payload(db, project, run_id)["metrics"]
    counts = found["shelf"]["counts"]
    # One question where only competitors are named, none where the client is, the rest open
    assert counts == {"competitor": 1, "client": 0, "shared": 0, "open": expected["scope"]["discovery_prompts"] - 1}
    providers = found["providers"]
    assert providers["answers"] == expected["scope"]["completed"]
    tracked = {row["key"]: row for row in providers["rows"] if row["tracked"]}
    # Only the tracked brands that were named appear: the two rivals once each, the client not at all
    assert sorted(tracked) == sorted(brand_ids[name] for name in expected["tied_at_one"]) and all(row["answers"] == 1 for row in tracked.values())
    assert all(row["answers"] >= 1 for row in providers["rows"]) and len(providers["rows"]) > len(tracked)


def test_the_shelf_and_providers_on_a_made_up_check() -> None:
    answers = [
        _answer("a1", "p1", "", [("acme", "", "positive"), ("bolt", "", "neutral")]),
        _answer("a2", "p2", "", [("bolt", "", "neutral"), ("", "Zeta Bots", "neutral")]),
        _answer("a3", "p3", "", [("acme", "", "neutral")]),
        _answer("a4", "p4", "", [("", "zeta bots", "neutral"), ("", "Zeta Bots", "neutral")]),
    ]
    found = metrics.shelf(_wave(answers))
    assert [row["status"] for row in found["questions"]] == ["shared", "competitor", "client", "open"]
    rows = metrics.providers(_wave(answers))["rows"]
    # Counted once an answer; an untracked business by its spelling written most, the ties in the project's order
    assert [(row["name"], row["answers"], row["tracked"]) for row in rows] == [("Acme", 2, True), ("Bolt", 2, True), ("Zeta Bots", 2, False)]


def test_the_digest_says_the_change_and_the_action() -> None:
    from app import digest

    def check(answers: List[Dict[str, Any]], settings: str = "same") -> Dict[str, Any]:
        built = {**_wave(answers), "wave": {"collected_at": "2026-11-24T05:00:00+00:00", "settings_hash": settings}}
        named = {key: sum(1 for answer in answers if any(mention["brand_id"] == key for mention in answer["mentions"])) for key in ("acme", "bolt", "cora")}
        rivals = {key: count for key, count in named.items() if key != "acme"}
        top = max(rivals.values())
        computed = {
            "scope": {"engines": [{"engine": "chatgpt"}, {"engine": "gemini"}]},
            "visibility": {"named": named["acme"], "answers": len(answers)},
            "brands": {"rows": [{"id": key, "name": key.title(), "named": count} for key, count in named.items()], "rivals_top": {"named": {"value": top, "ids": [key for key, count in rivals.items() if count == top]}}},
        }
        return {"wave": built, "metrics": computed}

    def asked(key: str, prompt: str, engine: str, *brands: str) -> Dict[str, Any]:
        return _answer(key, prompt, "-", [(brand, "", "neutral") for brand in brands], engine=engine)

    # The check before asked p1 and p2 on both assistants; this one p1 on both, p2 on ChatGPT and p3 (new) on Gemini
    before = check([asked("b1", "p1", "chatgpt", "bolt"), asked("b2", "p1", "gemini", "cora"), asked("b3", "p2", "chatgpt"), asked("b4", "p2", "gemini", "bolt")])
    now = check([asked("n1", "p1", "chatgpt", "acme", "bolt"), asked("n2", "p1", "gemini", "acme", "cora"), asked("n3", "p2", "chatgpt", "acme", "cora"), asked("n4", "p3", "gemini", "acme", "cora")])
    action = {"kind": "listing", "domain": "goldenpages.uz", "status": "new"}
    lines = digest.render(now["wave"], now["metrics"], "en", "https://example.test/r", before, action).splitlines()
    assert lines == [
        "Seenova · Acme · 24 Nov 2026 · ChatGPT, Gemini",
        "In AI answers: Acme 4/4 (was 0/4)",
        "Most named instead of you: Cora 3/4",
        # Over the 3 answers on the questions asked on the same assistant in both checks, not over all 4
        "Biggest change: Acme 3/3, was 0/3 on the same questions",
        "This week's action: get listed on goldenpages.uz (Marketing)",
        "Full report: https://example.test/r",
    ]
    # A change of settings is said; with no question asked the same way there is nothing to compare
    elsewhere = check([asked("o1", "p9", "chatgpt", "acme")], settings="other")
    lines = digest.render(elsewhere["wave"], elsewhere["metrics"], "en", "https://example.test/r", before, None).splitlines()
    assert lines[1] == "In AI answers: Acme 1/1 (was 0/4, asked another way)"
    assert lines[3] == "Biggest change: can't compare, no question was asked the same way in both checks"
    # One answer either way is no material change, however many points it moves (here 25)
    nudged = check([asked("m1", "p1", "chatgpt", "bolt"), asked("m2", "p1", "gemini", "cora"), asked("m3", "p2", "chatgpt", "acme"), asked("m4", "p2", "gemini", "bolt")])
    lines = digest.render(nudged["wave"], nudged["metrics"], "en", "https://example.test/r", before, None).splitlines()
    assert lines[3] == "Biggest change: no material change on the same questions"
    quiet = digest.render(before["wave"], before["metrics"], "uz", "https://example.test/r", before, None).splitlines()
    assert len(quiet) == 6 and quiet[3].endswith("sezilarli oʻzgarish yoʻq") and quiet[4].endswith("kuzatamiz")


# --- the topic ranking rule (0.9) -------------------------------------------------------------------------


def test_the_baseline_topics_are_too_small_to_rank_or_judge(db: Any, project: Any, run_id: str, report: Dict[str, Any]) -> None:
    from app import fixes

    found = wave.payload(db, project, run_id)["metrics"]["topic_ranking"]
    assert not found["ranked"] and found["eligible"] == [] and found["largest"] < metrics.TOPIC_RANK_ANSWERS
    # No page suggested about a topic of fewer than 3 answers, and the one stored with the check no longer shows
    assert not any(action["kind"] == "content" for action in fixes.suggested(db, project, report))
    assert not any(action["kind"] == "content" for action in fixes.listed(db, project))


def test_topics_are_ranked_from_three_topics_of_three_answers() -> None:
    def answers(prompt: str, count: int, offset: int) -> List[Dict[str, Any]]:
        return [_answer(f"a{offset + index}", prompt, "Bolt", [("bolt", "", "neutral")]) for index in range(count)]

    # p1 and p2 are one topic ("prices"), p3 and p4 another ("service"): two topics of 3 answers or more
    two = answers("p1", 2, 0) + answers("p2", 1, 10) + answers("p3", 3, 20) + answers("p4", 1, 30)
    found = metrics.topic_ranking(_wave(two))
    assert found["eligible"] == ["prices", "service"] and not found["ranked"]
    wave_three = _wave(two + answers("p5", 3, 40))
    wave_three["prompts"][-2]["topic"] = "delivery"
    assert metrics.topic_ranking(wave_three)["ranked"]
