"""The market a first check measures, and websites that show almost no words (25 Nov 2026, the user: "if it was in
Uzbekistan even in USA it must measure"). Step 1 no longer picks Uzbekistan for everybody: without the owner's word the
website says where the customers are, the website's own view is kept beside the owner's, a draft can be written again
for another market, and a website read as almost no words is said to be so. Nothing is fetched or asked: the website,
the profile and the comparison are stand-ins."""

from __future__ import annotations

from typing import Any, Dict, Iterator, List, Optional, Tuple

import pytest
from fastapi import HTTPException
from sqlalchemy import delete

from app import firstrun, main, research
from app.db import FirstRun, LimitHit, User
from test_limits import visitor

WORDS = "Fleet software for trucking companies: electronic logs, GPS tracking and fuel tax reports. " * 20
WHO = {
    "name": "Stand-in Fleet",
    "aliases": [],
    "category": "fleet software",
    "city": "",
    "cityEn": "",
    "description": "Fleet software.",
    "services": ["Electronic logs"],
    "competitors": [],
    "brandQuestions": [],
    "questions": [
        {"text": "Which ELD is best for a small fleet?", "language": "en", "topic": "eld"},
        {"text": "Какой ELD лучше для автопарка?", "language": "ru", "topic": "eld"},
        {"text": "Avtopark uchun qaysi ELD yaxshi?", "language": "uz", "topic": "eld"},
    ],
}


@pytest.fixture()
def reading(monkeypatch: Any) -> Iterator[Tuple[List[Dict[str, Any]], Dict[str, Any]]]:
    """A website of WORDS, a profile that reads its market as `site["country"]`, and nothing fetched."""
    calls: List[Dict[str, Any]] = []
    site: Dict[str, Any] = {"text": WORDS, "country": "US", "seen": "US"}

    def profile(domain: str, pages: List[Dict[str, str]], category: Optional[str], city: Optional[str], count: int, country: Optional[str] = None, name: Optional[str] = None, thin: Optional[int] = None) -> Tuple[Dict[str, Any], float]:
        calls.append({"country": country, "thin": thin})
        # Told the owner's country, the profile writes for it; its own view of the website stays in siteCountry
        return {**WHO, "questions": [dict(question) for question in WHO["questions"]], "country": country or site["country"], "siteCountry": site["seen"]}, 0.0

    monkeypatch.setattr(firstrun.web, "read_site", lambda domain, language: [{"url": f"https://{domain}/", "text": site["text"]}])
    monkeypatch.setattr(firstrun, "profile", profile)
    monkeypatch.setattr(firstrun, "_raw", lambda url: "")
    monkeypatch.setattr(firstrun, "search_competitors", lambda *args: ([], 0.0))
    yield calls, site


def test_without_the_owners_word_the_website_says_where_the_customers_are(reading: Any) -> None:
    calls, _ = reading
    draft, _ = firstrun.prepare("fleet.example", None, None, None)
    assert (draft["country"], draft["countryFrom"], draft["siteCountry"]) == ("US", "site", "US")
    # The questions are the market's: English for the US
    assert [question["language"] for question in draft["who"]["questions"]] == ["en"]
    assert calls[0]["country"] is None and draft["thin"] is False and draft["siteWords"] > firstrun.THIN_WORDS


def test_the_owners_word_wins_and_the_websites_view_is_kept(reading: Any) -> None:
    calls, _ = reading
    draft, _ = firstrun.prepare("fleet.example", None, None, "UZ")
    assert (draft["country"], draft["countryFrom"], draft["siteCountry"]) == ("UZ", "owner", "US")
    assert calls[0]["country"] == "UZ"
    assert {question["language"] for question in draft["who"]["questions"]} == {"ru", "uz"}


def test_a_website_that_shows_nothing_of_its_market_leaves_uzbekistan_said_so(reading: Any) -> None:
    _, site = reading
    site.update(country="", seen="")
    draft, _ = firstrun.prepare("fleet.example", None, None, None)
    assert (draft["country"], draft["countryFrom"], draft["siteCountry"]) == ("UZ", "default", "")


def test_a_website_read_as_almost_no_words_is_said_to_be_so(reading: Any) -> None:
    calls, site = reading
    site["text"] = "ACME LOGS - Fleet Management Platform"
    draft, _ = firstrun.prepare("fleet.example", None, None, None)
    # Six words, the dash among them, as the website's own text was split
    assert draft["thin"] is True and draft["siteWords"] == 6
    # The profile is told, so it writes no more than the name shows
    assert calls[0]["thin"] == 6
    assert [check["check"] for check in draft["checks"]][:2] == ["ai_bots_blocked", "js_only"]


def test_research_says_nothing_about_a_website_it_couldnt_read(monkeypatch: Any) -> None:
    def asked(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("the model must not be asked about a website that wasn't read")

    monkeypatch.setattr(research.engines, "read", asked)
    question = {
        "prompt": {"id": "p1", "text": "Which ELD is best?", "language": "en"},
        "answer": {"engine": "chatgpt", "text": "Rival Logs is the best ELD for small fleets."},
        "name": "Rival Logs",
        "tracked": False,
    }
    finding, usd = research.compare(question, ("https://rival.example/eld", "Rival ELD", "Rival Logs ELD is certified."), "[https://fleet.example/]\nACME LOGS", "en", unread=True)
    assert (finding["status"], usd, finding["page"]["url"]) == ("site_unreadable", 0.0, "https://rival.example/eld")
    assert "missing" not in finding and finding["rival"]["name"] == "Rival Logs"
    assert research.words_of("[https://fleet.example/]\nACME LOGS") < research.THIN_WORDS


@pytest.fixture()
def owner(db: Any) -> Iterator[User]:
    user = User(email="owner@market.example")
    db.add(user)
    db.commit()
    yield user
    db.execute(delete(FirstRun).where(FirstRun.user_id == user.id))
    db.execute(delete(User).where(User.id == user.id))
    db.execute(delete(LimitHit))
    db.commit()


def ready(db: Any, user: User, **draft: Any) -> FirstRun:
    run = FirstRun(user_id=user.id, domain="fleet.example", status="ready", draft={"who": {**WHO}, "country": "UZ", **draft})
    db.add(run)
    db.commit()
    return run


def test_a_draft_is_written_again_for_another_market(db: Any, owner: User, monkeypatch: Any) -> None:
    started: List[Tuple[Any, ...]] = []
    monkeypatch.setattr(main.threading, "Thread", lambda target, args, daemon: type("Started", (), {"start": lambda self: started.append(args)})())
    run = ready(db, owner, countryFrom="owner", siteCountry="US")
    # What step 2 reads: where the market came from and the website's own view
    shown = main.first_run_draft(run.id, owner)
    assert (shown["country"], shown["countryFrom"], shown["siteCountry"], shown["thin"]) == ("UZ", "owner", "US", False)
    out = main.change_market(run.id, main.MarketChange(country="us"), visitor("203.0.113.80"), owner)
    assert out["status"] == "reading_site"
    db.expire_all()
    kept = db.get(FirstRun, run.id)
    assert kept.status == "reading_site" and kept.draft is None
    # Read again for the US, under the name read before, counted as a website read
    assert started == [(run.id, "fleet.example", None, None, "US", "Stand-in Fleet", True)]
    assert db.query(LimitHit).filter(LimitHit.kind == "read").count() == 1
    # Not a country, a draft not ready, someone else's
    for country, status in (("United States", 422), ("US", 409)):
        with pytest.raises(HTTPException) as refused:
            main.change_market(run.id, main.MarketChange(country=country), visitor("203.0.113.80"), owner)
        assert refused.value.status_code == status
    stranger = User(email="stranger@market.example")
    db.add(stranger)
    db.commit()
    with pytest.raises(HTTPException) as hidden:
        main.change_market(ready(db, owner).id, main.MarketChange(country="US"), visitor("203.0.113.81"), stranger)
    assert hidden.value.status_code == 404
    db.execute(delete(User).where(User.id == stranger.id))
    db.commit()


def test_a_draft_from_before_reads_as_the_owners_uzbekistan(db: Any, owner: User) -> None:
    shown = main.first_run_draft(ready(db, owner).id, owner)
    assert (shown["country"], shown["countryFrom"], shown["siteCountry"], shown["siteWords"], shown["thin"]) == ("UZ", "owner", "", None, False)
