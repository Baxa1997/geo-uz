"""The fixture is the audited baseline, and today's code still shows what the audit found (spec §3.2).

These pass now. Each check of a defect names the Phase 0 item that fixes it and goes when that item lands;
from then on the acceptance tests (test_acceptance.py) say what the report shows instead. Names, counts and
texts come from the local fixture, never from this file: the repository is public.
"""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict

import pytest


def named_in_answers(baseline: Dict[str, Any]) -> Counter:
    """Answers naming each tracked brand, each answer counted once."""
    names = {brand["id"]: brand["name"] for brand in baseline["tables"]["brands"]}
    return Counter(names[brand_id] for _, brand_id in {(m["answer_id"], m["brand_id"]) for m in baseline["tables"]["mentions"] if m["brand_id"]})


# --- the data is the panel of spec §3.3 -----------------------------------------------------------------


def test_the_panel_is_the_one_spec_3_3_describes(baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    tables, scope = baseline["tables"], expected["scope"]
    prompts = {prompt["id"]: prompt for prompt in tables["prompts"]}
    answers = tables["answers"]
    assert len(prompts) == scope["discovery_prompts"]
    assert Counter(prompt["language"] for prompt in prompts.values()) == scope["prompt_languages"]
    assert len(answers) == scope["completed"]
    assert Counter(answer["engine"] for answer in answers) == scope["completed_by_engine"]
    assert Counter(prompts[answer["prompt_id"]]["language"] for answer in answers) == scope["answers_by_language"]
    assert len({citation["domain"] for citation in tables["citations"]}) == expected["cited_domains"]


def test_who_the_answers_name(baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    named = named_in_answers(baseline)
    assert named[expected["brand"]] == expected["headline"][0]
    assert {name: named[name] for name in expected["competitors"]} == expected["competitors"]


def test_the_top_finding_question_has_its_two_answers(baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    tables = baseline["tables"]
    prompt = next(prompt for prompt in tables["prompts"] if prompt["text"] == expected["top_finding"]["prompt"])
    answers = [answer for answer in tables["answers"] if answer["prompt_id"] == prompt["id"]]
    assert len(answers) == expected["top_finding"]["answers"]
    names = {brand["id"]: brand["name"] for brand in tables["brands"]}
    rivals = {names[m["brand_id"]] for m in tables["mentions"] if m["brand_id"] and m["answer_id"] in {answer["id"] for answer in answers}}
    assert rivals == set(expected["tied_at_one"])


def test_nothing_failed_the_free_check_planned_only_what_it_asked(baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    """Spec §3.3 reads the missing ChatGPT answers as failed slots. The first run planned only what it asked,
    ChatGPT getting part of the questions by design (`FIRST_RUN_CHATGPT_QUESTIONS`), and every planned slot came
    back: the rest are excluded, not failed (the user's decision, 21 Nov 2026)."""
    first = baseline["tables"]["first_runs"][0]
    assert first["total"] == first["answered"] == expected["scope"]["completed"]
    assert sorted(answer["question"] for answer in first["raw"]["answers"] if answer["engine"] == "chatgpt") == expected["chatgpt_questions"]
    assert expected["scope"]["slots"] - expected["scope"]["completed"] == expected["scope"]["excluded"]


def test_most_gemini_answers_searched_nothing(baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    gemini = [answer for answer in baseline["tables"]["answers"] if answer["engine"] == "gemini"]
    assert [sum(1 for answer in gemini if answer["searches"]), len(gemini)] == expected["scope"]["gemini_searched"]


def test_the_brand_check_counts(baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    run = baseline["tables"]["runs"][0]
    checks = Counter(statement["check"] for view in run["brand_view"] for statement in view["statements"])
    assert {"verified": checks["confirmed"], "unverified": checks["unverified"], "contradicted": checks["contradicted"]} == expected["claims"]
    assert len(run["brand_view"]) == expected["scope"]["branded_answers"]


def test_the_fixture_loads(db: Any, baseline: Dict[str, Any]) -> None:
    from sqlalchemy import func, select

    from app.db import Answer, Citation, Mention

    tables = baseline["tables"]
    assert db.scalar(select(func.count()).select_from(Answer)) == len(tables["answers"])
    assert db.scalar(select(func.count()).select_from(Mention)) == len(tables["mentions"])
    assert db.scalar(select(func.count()).select_from(Citation)) == len(tables["citations"])


# --- today's code shows what the audit found ------------------------------------------------------------


# Defects 2 and 3 (the scope's three denominators, ChatGPT named alone) went with 0.1 (21 Nov 2026): the report
# counts its scope from the slot log (`metrics.scope`), and test_acceptance.py checks the page. Defects 1, 5, 6
# and 9 (the composite from a default 50, a rank among ties, the share, tone and place of a single mention, tone
# with no mention) went with 0.2 the same day: the report shows counts (`metrics.visibility`, `metrics.brands`),
# and test_metrics.py and test_acceptance.py check them. Defect 4 (a platform's help pages typed a directory, with
# a listing action) went with 0.4: every cited site has the spec's type (`domains.resolve`) and only §7's sites get
# an action (test_domains.py, test_acceptance.py).


@pytest.mark.page
def test_todays_page_shows_what_the_audit_saw(report_page: Any, expected: Dict[str, Any]) -> None:
    """The page renders from the fixture. The audited defects it showed went with their items: the composite and
    the places with 0.2, the sites' share of citations ("91%" beside 24 sites) with 0.3 (21 Nov 2026)."""
    assert expected["brand"] in report_page.text
