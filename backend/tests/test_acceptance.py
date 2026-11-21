"""Spec §11.1, the Phase 0 acceptance tests, on the baseline client's first check.

Each is expected to fail until the Phase 0 item named in its mark is built. `xfail_strict` (pytest.ini) makes
one that starts passing fail the run until its mark is taken off, so a mark never outlives its item.

What the page tests read, the report marks as each part is built:
- `data-metric="<key>"` on the element that shows a value: `headline`, `scope.<name>`, `brand.<id>.<name>`,
  `claims.<verdict>`, `share_of_voice`;
- `data-block="<name>"` on a block: `branded`, `top-finding`, `single-run-note`;
- `data-domain` and `data-type` on a cited site's row;
- `data-answer` (the answer's id), `data-engine` and `data-date` on an answer inside an evidence block;
- `data-k` and `data-n` on the element whose percentage stands on that count;
- `data-example` on a glossary example.
These keys are a first proposal: the item that builds a part may rename them here with it.

Names, counts and texts come from the local fixture (`baseline.expected.json`), never from this file: the
repository is public. The page tests start their own servers: `pytest -m page`.
"""

from __future__ import annotations

import json
import math
import re
from typing import Any, Dict, Set

import pytest

from pagetools import HIDDEN, Node, Page

page = pytest.mark.page
# The composite as the report writes it today: "N/100", "N out of 100"
COMPOSITE = re.compile(r"\b\d{1,3}\s*(?:/|out of)\s*100\b")


def todo(item: str, what: str) -> Any:
    return pytest.mark.xfail(reason=f"Phase 0 {item}: {what}")


def read_aloud(report_page: Page) -> str:
    """Everything a reader meets: the text, and what a screen reader says for a picture."""
    return " ".join([report_page.text, *(node.attrs["aria-label"] for node in report_page.root.find_all("aria-label"))])


def plain_words(text: str) -> Set[str]:
    """An answer's words, without the addresses of its Markdown links."""
    return set(re.findall(r"\w+", re.sub(r"\(https?://[^)\s]*\)", " ", text).lower()))


def text_outside(node: Node, attr: str) -> str:
    """A block's text, leaving out every element that carries `attr`."""
    parts = []

    def visit(current: Node) -> None:
        for child in current.children:
            if isinstance(child, str):
                parts.append(child)
            elif child.tag not in HIDDEN and attr not in child.attrs:
                visit(child)

    visit(node)
    return " ".join(" ".join(parts).split())


def numbers_in(value: Any) -> Set[str]:
    """Every number written anywhere in a value, as text."""
    if isinstance(value, dict):
        return set().union(*(numbers_in(item) for item in value.values())) if value else set()
    if isinstance(value, (list, tuple)):
        return set().union(*(numbers_in(item) for item in value)) if value else set()
    if isinstance(value, bool) or value is None:
        return set()
    if isinstance(value, (int, float)):
        return {str(int(value)), str(value)}
    return set(re.findall(r"\d+", str(value)))


# --- the scope card (0.1) -------------------------------------------------------------------------------


@page
def test_the_scope_card_counts(report_page: Page, expected: Dict[str, Any]) -> None:
    scope = expected["scope"]
    shown = {key: report_page.number(f"scope.{key}") for key in ("discovery_prompts", "slots", "completed", "excluded", "failed")}
    assert shown == {key: scope[key] for key in shown}
    assert {engine: report_page.number(f"scope.engine.{engine}") for engine in scope["completed_by_engine"]} == scope["completed_by_engine"]
    assert {language: report_page.number(f"scope.language.{language}") for language in scope["answers_by_language"]} == scope["answers_by_language"]
    # The excluded slots say why, and Gemini's answers without a search are said (the user's decisions, 21 Nov 2026)
    assert report_page.metric("scope.excluded_reason")
    assert report_page.fraction("scope.searched.gemini") == tuple(scope["gemini_searched"])


@page
def test_the_scope_card_lists_the_slot_logs_assistants(report_page: Page, site: Any, baseline: Dict[str, Any], run_id: str) -> None:
    logged = {slot["engine"] for slot in site.api(f"/projects/{baseline['project_id']}/waves/{run_id}")["wave"]["slots"]}
    shown = {key.rsplit(".", 1)[1] for key in report_page.metric_keys("scope.engine.")}
    assert logged and shown == logged


@page
def test_the_report_counts_its_answers_one_way(report_page: Page) -> None:
    """Defect 2, three denominators for one panel: the scope card counts from the slot log, no sentence counts
    "of every 10 answers", and the method no longer says every question is asked several times."""
    assert "several times" not in report_page.text
    # The whole number: the glossary's "42 of every 100" is an example, for 0.9
    assert not re.search(r"\bof every 10\b", report_page.text)


def test_every_chatgpt_slot_is_located(db: Any, project: Any, run_id: str, expected: Dict[str, Any]) -> None:
    from app import wave

    slots = [slot for slot in wave.build(db, project, run_id)["slots"] if slot["engine"] == "chatgpt"]
    assert slots and all(slot["location"]["set"] and slot["location"]["country"] == expected["location_country"] for slot in slots)


# --- counts, not a composite (0.2) ----------------------------------------------------------------------


@page
def test_no_overall_score_anywhere(report_page: Page, site: Any, baseline: Dict[str, Any]) -> None:
    assert not COMPOSITE.search(read_aloud(report_page))
    assert "conditionHistory" not in site.api(f"/projects/{baseline['project_id']}/report")


@page
def test_the_headline_is_a_count(report_page: Page, expected: Dict[str, Any]) -> None:
    assert report_page.fraction("headline") == tuple(expected["headline"])


@page
def test_the_clients_sentiment_and_accuracy_are_na(report_page: Page, brand_ids: Dict[str, str], expected: Dict[str, Any]) -> None:
    assert report_page.metric(f"brand.{brand_ids[expected['brand']]}.sentiment") == "N/A"
    # No accuracy is worked out of a tone that wasn't measured
    assert all(report_page.metric(key) == "N/A" for key in report_page.metric_keys("accuracy"))


@page
def test_rivals_named_once_are_tied_without_place_tone_or_share(report_page: Page, brand_ids: Dict[str, str], expected: Dict[str, Any]) -> None:
    first, second = (brand_ids[name] for name in expected["tied_at_one"])
    answers = expected["scope"]["completed"]
    assert report_page.fraction(f"brand.{first}.mentions") == report_page.fraction(f"brand.{second}.mentions") == (1, answers)
    assert report_page.metric(f"brand.{first}.rank") is not None
    assert report_page.metric(f"brand.{first}.rank") == report_page.metric(f"brand.{second}.rank")
    assert not re.search(r"#\d", report_page.text)
    assert not re.search(r"\b100\s*/\s*100\b", report_page.text)
    assert "too few mentions" in (report_page.metric("share_of_voice") or "")


# --- every brand, counts behind every share, the branded check apart (0.3) ------------------------------


@page
def test_every_tracked_brand_is_shown_with_its_count(report_page: Page, brand_ids: Dict[str, str], expected: Dict[str, Any]) -> None:
    """Passes since 0.2 (21 Nov 2026): the competitors' table lists every tracked brand with its count, at 0/n too."""
    answers = expected["scope"]["completed"]
    shown = {name: report_page.fraction(f"brand.{brand_ids[name]}.mentions") for name in expected["competitors"]}
    assert shown == {name: (count, answers) for name, count in expected["competitors"].items()}


@page
def test_the_brand_question_check_is_labelled_and_apart(report_page: Page, expected: Dict[str, Any]) -> None:
    assert report_page.block("branded") is not None
    assert {verdict: report_page.number(f"claims.{verdict}") for verdict in expected["claims"]} == expected["claims"]
    # Its answers aren't counted among the buyers' answers
    assert report_page.fraction("headline") == tuple(expected["headline"])


def test_a_share_is_rounded_once_half_up() -> None:
    from app.metrics import share

    assert [share(24, 26), share(1, 15), share(0, 15), share(1, 8)] == [92, 7, 0, 13]


@page
def test_every_percentage_equals_its_count(report_page: Page) -> None:
    shown = report_page.percentages()
    assert shown
    for value, k, n in shown:
        assert k is not None and n, f"{value}% stands without its count"
        assert float(value.replace(",", ".")) == math.floor(k / n * 100 + 0.5), f"{value}% shown for {k}/{n}"


# --- domain types and the actions they allow (0.4) ------------------------------------------------------


@page
def test_every_cited_domain_typed_and_no_action_on_platform_docs(report_page: Page, site: Any, baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    types = report_page.domains()
    assert len(types) == expected["cited_domains"] and all(types.values())
    actions = json.dumps(site.api(f"/projects/{baseline['project_id']}/actions"))
    for domain in expected["platform_docs"]:
        assert types[domain] == "platform_docs"
        assert domain not in actions


# --- evidence (0.5) -------------------------------------------------------------------------------------


@page
@todo("0.5", "the top finding opens its answers")
def test_the_top_finding_opens_both_answers(report_page: Page, baseline: Dict[str, Any], expected: Dict[str, Any]) -> None:
    block = report_page.block("top-finding")
    assert block is not None and expected["top_finding"]["prompt"] in block.text
    shown = block.find_all("data-answer")
    assert len(shown) == expected["top_finding"]["answers"]
    answers = {answer["id"]: answer for answer in baseline["tables"]["answers"]}
    for node in shown:
        answer = answers[node.attrs["data-answer"]]
        assert node.attrs.get("data-engine") == answer["engine"] and node.attrs.get("data-date")
        # The whole answer, not its beginning
        words = plain_words(answer["text"])
        assert len(words & plain_words(node.text)) >= 0.95 * len(words)
        cited = {citation["url"] for citation in baseline["tables"]["citations"] if citation["answer_id"] == answer["id"]}
        assert cited <= set(node.links())


# --- the Free Snapshot and the digest (0.8) -------------------------------------------------------------


@page
@todo("0.8", "the Free Snapshot one-pager")
def test_the_snapshot_says_it_is_one_run(site: Any, baseline: Dict[str, Any]) -> None:
    first_run = baseline["tables"]["first_runs"][0]["id"]
    assert site.page(f"/en/snapshot/{first_run}").block("single-run-note") is not None


@todo("0.8", "the Telegram digest, from metrics")
def test_the_digest_is_six_lines_of_known_numbers(db: Any, project: Any, run_id: str) -> None:
    from app import digest, metrics, wave  # digest: built in 0.8

    built = wave.build(db, project, run_id)
    computed = metrics.compute(built)
    link = "https://example.test/report"
    text = digest.render(built, computed, language="en", link=link)
    assert 0 < len(text.strip().splitlines()) <= 6
    known = numbers_in(computed) | numbers_in(built["wave"]["collected_at"])
    assert set(re.findall(r"\d+", text.replace(link, ""))) <= known


# --- the template (0.9) ---------------------------------------------------------------------------------
# The audit's skipped numbers and empty headings (spec §3.2, defect 13) don't show on today's page of the
# baseline (21 Nov 2026: sections 1 to 13 in English and Uzbek, every heading with content under it), so
# these two pass and stay as guards; 0.9 checks the PDF's text as well.


@page
def test_the_sections_are_numbered_without_gaps(report_page: Page) -> None:
    numbers = report_page.section_numbers()
    assert numbers and numbers == list(range(1, len(numbers) + 1))


@page
def test_no_heading_stands_empty(report_page: Page) -> None:
    assert report_page.empty_headings() == []


@page
def test_the_glossary_examples_are_marked(report_page: Page) -> None:
    """Passes since 0.2 (21 Nov 2026): the definitions were rewritten without the score, and hold no example number."""
    glossary = report_page.section("glossary")
    assert glossary is not None
    assert not re.search(r"\d+\s*%", text_outside(glossary, "data-example"))
