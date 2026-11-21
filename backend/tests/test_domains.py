"""Every cited site's type and the actions a type allows (Phase 0 item 0.4, spec §4.6, §7, §8): the seed list, the
project's own sites, a review by hand, the AI's reading (a stand-in here: nothing is asked, nothing is paid), and
the baseline's sites and actions."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import pytest

from app import domains, fixes, metrics, wave
from app.db import DomainType

RIVALS = [("Bolt Systems", "bolt.uz"), ("Cora AI", None)]


def _typed(domain: str, stored: Optional[Dict[str, List[DomainType]]] = None, project_id: Optional[str] = "p1") -> Dict[str, Any]:
    return domains.resolve(domain, "acme.uz", RIVALS, stored or {}, project_id)


def test_the_seed_list_types_known_sites_and_their_subdomains() -> None:
    assert _typed("support.google.com")["type"] == "platform_docs"
    # Any site's help pages, by the first part of the address
    assert _typed("help.openai.com")["type"] == _typed("docs.example.io")["type"] == "platform_docs"
    # The longest entry wins: Google Maps is a directory with a route, Google's own pages a search engine's
    maps, search = _typed("maps.google.com"), _typed("www.google.com")
    assert maps["type"] == "directory" and maps["route"]["url"].startswith("https://") and maps["control"] == "earned"
    assert search["type"] == "reference" and search["route"] is None and search["control"] == "not_addressable"
    assert _typed("www.kun.uz")["type"] == "media" and _typed("tashkent.2gis.uz")["type"] == "directory"
    assert _typed("t.me")["type"] == "telegram" and _typed("instagram.com")["type"] == "ugc"
    assert all(typed["review"] == "seed" for typed in (maps, search))
    unknown = _typed("somevendor.uz")
    assert unknown == {"type": "unclassified", "control": "not_addressable", "route": None, "review": "seed"}


def test_the_project_types_its_own_and_its_competitors_sites() -> None:
    assert _typed("acme.uz")["type"] == _typed("shop.acme.uz")["type"] == "client_owned"
    assert _typed("acme.uz")["control"] == "owned"
    assert _typed("bolt.uz")["type"] == "competitor_site"
    # A competitor without a website, by its name in the address
    assert _typed("cora-ai.com")["type"] == "competitor_site"
    # One word of a longer name proves nothing
    assert _typed("bolt.com")["type"] == "unclassified"


def test_a_review_by_hand_wins_and_the_ai_never_gives_a_route() -> None:
    def row(review: str, kind: str, project_id: Optional[str], route: Optional[Dict[str, str]] = None) -> DomainType:
        return DomainType(domain="somevendor.uz", project_id=project_id, type=kind, review=review, route=route)

    ai = row("automated", "directory", "p1", route={"how": "form", "url": "https://somevendor.uz/add"})
    typed = _typed("somevendor.uz", {"somevendor.uz": [ai]})
    assert typed == {"type": "directory", "control": "earned", "route": None, "review": "automated"}
    # Another project's AI answer is not this project's
    assert _typed("somevendor.uz", {"somevendor.uz": [ai]}, project_id="p2")["type"] == "unclassified"
    everyone = row("founder-reviewed", "media", None, route={"how": "editor_contact", "url": "https://somevendor.uz/contacts"})
    this_one = row("founder-reviewed", "ugc", "p1")
    assert _typed("somevendor.uz", {"somevendor.uz": [ai, everyone]})["type"] == "media"
    assert _typed("somevendor.uz", {"somevendor.uz": [ai, everyone]})["route"]["how"] == "editor_contact"
    assert _typed("somevendor.uz", {"somevendor.uz": [ai, everyone, this_one]})["type"] == "ugc"
    # A review wins over the seed list too, never over the project's own sites
    assert _typed("kun.uz", {"kun.uz": [row("founder-reviewed", "reference", None)]})["type"] == "reference"
    assert _typed("acme.uz", {"acme.uz": [row("founder-reviewed", "directory", None)]})["type"] == "client_owned"


def test_only_section_7_sites_are_placement_targets() -> None:
    route = {"how": "form", "url": "https://example.org/add"}
    assert domains.placeable("directory", route, False, ["bolt"])
    assert domains.placeable("media", route, False, ["bolt"]) and domains.placeable("telegram", route, False, ["bolt"])
    # No route, the client already there, no competitor beside it: no action
    assert not domains.placeable("directory", None, False, ["bolt"])
    assert not domains.placeable("directory", route, True, ["bolt"])
    assert not domains.placeable("directory", route, False, [])
    for kind in ("platform_docs", "competitor_site", "reference", "unclassified", "client_owned"):
        assert not domains.placeable(kind, route, False, ["bolt"])


def test_the_other_pages_keep_their_six_kinds() -> None:
    assert [domains.kind(kind) for kind in ("client_owned", "competitor_site", "media", "directory", "ugc", "telegram", "platform_docs", "unclassified")] == ["own", "competitor", "news", "directory", "social", "social", "other", "other"]


# --- the baseline ---------------------------------------------------------------------------------------


def test_every_baseline_site_has_a_type_and_platform_docs_get_no_action(db: Any, project: Any, run_id: str, report: Dict[str, Any], expected: Dict[str, Any]) -> None:
    found = wave.payload(db, project, run_id)
    typed = {site["domain"]: site for site in found["wave"]["domains"]}
    assert len(typed) == expected["cited_domains"] and all(site["type"] in domains.TYPES for site in typed.values())
    for domain in expected["platform_docs"]:
        assert typed[domain]["type"] == "platform_docs" and typed[domain]["control"] == "not_addressable"
    # The two tracked competitors cited are competitors' sites; nothing on the baseline is a placement target
    assert sum(site["type"] == "competitor_site" for site in typed.values()) == 2
    assert found["metrics"]["sources"]["targets"] == []
    # No action is suggested on them, and the one the audit saw (stored with the check) no longer shows
    suggested = fixes.suggested(db, project, report)
    assert not any(action["kind"] == "listing" for action in suggested)
    listed = json.dumps(fixes.listed(db, project))
    for domain in expected["platform_docs"]:
        assert domain not in listed
    # The report's other pages see a platform's help pages as "other", not a directory
    assert all(source["type"] == "other" for source in report["topSources"] if source["domain"] in expected["platform_docs"])


def test_the_ai_types_each_unknown_site_once_without_a_route(db: Any, project: Any, run_id: str, monkeypatch: Any) -> None:
    from app import config, engines
    from app.db import Run

    asked: List[str] = []

    def stand_in(instructions: str, content: str, name: str, schema: Dict[str, Any]) -> Any:
        asked.append(content)
        sites = [line[2:].split(":")[0] for line in content.splitlines() if line.startswith("- ")]
        return {"sites": [{"domain": site, "type": "competitor_site" if index % 2 else "directory", "why": "stand-in"} for index, site in enumerate(sites)]}, 0.001

    monkeypatch.setattr(engines, "read", stand_in)
    monkeypatch.setattr(type(config.settings), "can_read", property(lambda self: True))
    assert not config.settings.first_run_replay
    run = db.get(Run, run_id)
    try:
        before = wave.payload(db, project, run_id)["metrics"]["sources"]["types"]
        assert domains.classify(db, project, run) == pytest.approx(0.001)
        db.flush()
        rows = db.query(DomainType).filter(DomainType.project_id == project.id).all()
        # Only the unclassified sites were asked, in one call, each kept once with no route
        assert len(asked) == 1 and len(rows) == before["unclassified"]
        assert all(row.review == "automated" and row.route is None for row in rows)
        after = metrics.sources(wave.build(db, project, run_id))
        assert "unclassified" not in after["types"] and after["sites"] == sum(after["types"].values())
        # An AI-typed directory has no route, so it is never a placement target
        assert after["targets"] == []
        assert all(row["review"] == "automated" for row in after["rows"] if row["type"] == "directory")
        # Asked once: a second check of the same sites asks nothing
        assert domains.classify(db, project, run) == 0.0 and len(asked) == 1
    finally:
        db.rollback()
