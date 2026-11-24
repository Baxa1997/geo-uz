"""The recommendations of 23 Nov 2026 (the user: "seo and geo can be taken from research, recommendation, actions must
be appropriately structured"; "Build the full plan"): the website's SEO audit by rule, and the actions it makes.
Nothing is fetched: the pages and files are written here."""

from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy import delete, select

from app import firstrun, fixes, projects
from app.db import Action, Brand, Project, User

GOOD_HOME = """<html><head><title>Acme Dental — clinic in Tashkent</title>
<meta name="description" content="Acme Dental treats adults and children in Tashkent: implants, braces, cleaning. Prices from 200 000 so'm.">
<link rel="alternate" hreflang="uz" href="https://acme.example/uz/">
<script type="application/ld+json">{"@type": "Dentist", "name": "Acme"}</script></head>
<body><h1>Acme Dental</h1></body></html>"""
GOOD_TEXT = "Acme Dental. Цены: чистка 200 000 сум. Часто задаваемые вопросы. Телефон +998 90 123 45 67."


def checks(pages: List[Dict[str, str]], html: Any, robots: Any = None, sitemap: Any = None, llms: Any = None, languages: Any = ("ru", "uz")) -> Dict[str, bool]:
    return {check["check"]: check["passed"] for check in firstrun.site_checks(pages, html, robots, sitemap, llms, list(languages) if languages else None)}


def test_a_well_kept_site_passes_every_check() -> None:
    found = checks(
        [{"url": "https://acme.example/", "text": GOOD_TEXT}],
        GOOD_HOME,
        robots="User-agent: *\nAllow: /\nSitemap: https://acme.example/sitemap.xml",
        llms="# Acme Dental\n> A dental clinic in Tashkent. Prices, doctors, contacts.",
    )
    assert set(found) == {"ai_bots_blocked", "prices_as_images", "no_business_markup", "contacts_missing", "no_prices", "no_faq", "no_sitemap", "no_llms_txt", "weak_meta", "one_language"}
    assert all(found.values()), [name for name, passed in found.items() if not passed]


def test_a_bare_site_fails_the_seo_audit() -> None:
    found = checks([{"url": "https://bare.example/", "text": "Мы делаем чат-ботов для бизнеса. Напишите нам."}], "<html><head><title>Home</title></head><body><div>Hi</div></body></html>")
    for name in ("no_prices", "no_faq", "no_sitemap", "no_llms_txt", "weak_meta", "one_language", "no_business_markup", "contacts_missing"):
        assert found[name] is False, name
    # A page of prices with a price in it isn't "prices as pictures"
    assert found["prices_as_images"] is True


def test_what_cant_be_judged_is_left_out() -> None:
    # The home page's code not read: no verdict on its title; one language expected: no verdict on languages
    found = checks([{"url": "https://acme.example/", "text": GOOD_TEXT}], None, languages=("en",))
    assert "weak_meta" not in found and "one_language" not in found
    # An HTML page served for every address isn't an llms.txt, nor a sitemap
    assert checks([{"url": "https://acme.example/", "text": GOOD_TEXT}], GOOD_HOME, sitemap="<html>not found</html>", llms="<!doctype html><html>…</html>")["no_llms_txt"] is False


def test_both_languages_count_from_the_text_or_a_link() -> None:
    russian_only = [{"url": "https://acme.example/", "text": "Стоматология в Ташкенте. Цены и врачи. " * 20}]
    assert checks(russian_only, "<html><h1>x</h1></html>")["one_language"] is False
    assert checks(russian_only, '<html><a href="/uz/">Oʻzbekcha</a></html>')["one_language"] is True
    both = [{"url": "https://acme.example/", "text": "Стоматология в Ташкенте. " * 10 + "Biz bilan bogʻlaning va narxlar haqida soʻrang, xizmatlar uchun yoki qanday." * 2}]
    assert checks(both, "<html></html>")["one_language"] is True


def test_a_new_project_gets_a_brief_for_every_page(db: Any, monkeypatch: Any) -> None:
    """The user's live test of 24 Nov 2026: a new project had briefs for 5 of its 7 pages to write, and a free project
    has no next check to write the rest. A weekly check still writes five; a new project's background step, all."""
    owner = User(email="briefs@example.test")
    db.add(owner)
    db.flush()
    project = Project(user_id=owner.id, category="tests", city="", country="UZ")
    db.add(project)
    db.flush()
    db.add(Brand(project_id=project.id, name="Brief Co", domain="brief.example", aliases=[], own=True))
    db.add_all([Action(project_id=project.id, key=f"content:topic {number}", kind="content", details={"topic": f"topic {number}"}, prompt_ids=[]) for number in range(7)])
    db.commit()
    written: List[str] = []
    monkeypatch.setattr(fixes, "_brief", lambda project, client, topic, questions, page="", evidence="": written.append(topic) or {"summary": topic})
    monkeypatch.setattr(projects, "report", lambda db, project, **kwargs: {"prompts": []})
    try:
        fixes.write_briefs(db, project)
        assert len(written) == 5
        fixes.write_briefs(db, project, limit=None)
        assert len(written) == 7
        assert all((action.details or {}).get("brief") for action in db.scalars(select(Action).where(Action.project_id == project.id)))
    finally:
        db.rollback()
        for table in (Action, Brand):
            db.execute(delete(table).where(table.project_id == project.id))
        db.execute(delete(Project).where(Project.id == project.id))
        db.execute(delete(User).where(User.id == owner.id))
        db.commit()
