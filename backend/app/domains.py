"""The type of every cited site (report spec §4.6) and the actions a type allows (§7): Phase 0 item 0.4.

A site's type is decided in this order, the first that knows it winning:

1. the project: the client's own site, a tracked competitor's site;
2. a review by hand (`python -m app.admin domain`), for this project or for every project;
3. our seed list below (spec §9's sites for each market, the big platforms' help pages, social networks,
   Telegram, search engines), with a route onto the site only where one was opened and checked;
4. the AI's reading, labelled `automated`, asked once a site and project at the end of a check (`classify`);
5. otherwise `unclassified`, which is never acted on.

A route (how a business gets onto a site: its listing page, its form, its editors' contact) comes only from the
seed list or a review by hand, never from the AI (the user's decision, 21 Nov 2026): a "get listed" action needs
one, so an AI-typed directory is shown but not acted on until someone checks how to get onto it.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import or_, select
from sqlalchemy.orm import Session as Db

from . import engines
from .config import settings
from .db import Answer, Brand, Citation, DomainType, Project, Run, now

# The spec's types (§4.6, §10), in the order the report lists them
TYPES = ["client_owned", "client_managed", "competitor_site", "directory", "media", "ugc", "telegram", "reference", "platform_docs", "unclassified"]
# Who controls what a site says of the client (§4.6)
CONTROL = {
    "client_owned": "owned",
    "client_managed": "managed",
    "directory": "earned",
    "media": "earned",
    "ugc": "earned",
    "telegram": "earned",
}
# The types a "get listed" action may target (§7, third-party placement); every other type is "monitor" only
PLACEABLE = ("directory", "media", "ugc", "telegram")
# What the AI may answer: the project's own types are the project's to say
AI_TYPES = ["competitor_site", "directory", "media", "ugc", "telegram", "reference", "platform_docs", "unclassified"]
# How a route gets a business onto a site
ROUTES = ("listing_page", "form", "editor_contact")


def _route(how: str, url: str) -> Dict[str, str]:
    return {"how": how, "url": url}


# The seed list (spec §9, "reviewer verifies"). Each route was opened on 21 Nov 2026 and its page read: a listing
# page or form that says it adds a business, or a page with the editors' contact. A site without one has no route
# that could be checked (its page didn't open, or showed nothing without a browser): it is typed, never acted on.
SEED: Dict[str, Tuple[str, Optional[Dict[str, str]]]] = {
    # Uzbekistan: media
    "kun.uz": ("media", None),
    "daryo.uz": ("media", None),
    "spot.uz": ("media", _route("editor_contact", "https://www.spot.uz/ru/contact/")),
    "gazeta.uz": ("media", _route("editor_contact", "https://www.gazeta.uz/ru/about/")),
    "afisha.uz": ("media", None),
    "podrobno.uz": ("media", None),
    "repost.uz": ("media", None),
    "uznews.uz": ("media", None),
    "weproject.media": ("media", None),
    # Uzbekistan: directories and listings ("2GIS: how to add a company" links this form for Uzbekistan)
    "2gis.uz": ("directory", _route("form", "https://reklama.2gis.uz/add-info")),
    "goldenpages.uz": ("directory", _route("listing_page", "https://www.goldenpages.uz/add/")),
    "olx.uz": ("directory", None),
    "uzum.uz": ("directory", _route("listing_page", "https://seller.uzum.uz/")),
    "yellowpages.uz": ("directory", None),
    "oblako.uz": ("directory", None),
    "sprav.uz": ("directory", None),
    "orginfo.uz": ("directory", None),
    # Kazakhstan
    "tengrinews.kz": ("media", None),
    "zakon.kz": ("media", None),
    "nur.kz": ("media", None),
    "forbes.kz": ("media", None),
    "kursiv.media": ("media", None),
    "2gis.kz": ("directory", _route("form", "https://reklama.2gis.kz/add-info/")),
    "satu.kz": ("directory", None),
    "kaspi.kz": ("directory", _route("listing_page", "https://kaspi.kz/merchantcabinet/")),
    "olx.kz": ("directory", None),
    "krisha.kz": ("directory", None),
    # Kyrgyzstan
    "24.kg": ("media", None),
    "kaktus.media": ("media", None),
    "akchabar.kg": ("media", None),
    "2gis.kg": ("directory", None),
    "lalafo.kg": ("directory", _route("listing_page", "https://lalafo.kg/add")),
    # Everywhere: maps and reviews
    "2gis.ru": ("directory", None),
    "maps.google.com": ("directory", _route("listing_page", "https://business.google.com/")),
    "tripadvisor.com": ("directory", None),
    "tripadvisor.ru": ("directory", None),
    # Telegram: a channel's route is its own admin, not the site's
    "t.me": ("telegram", None),
    "telegram.me": ("telegram", None),
    # Social networks, forums and reviews written by users
    "youtube.com": ("ugc", None),
    "instagram.com": ("ugc", None),
    "facebook.com": ("ugc", None),
    "tiktok.com": ("ugc", None),
    "vk.com": ("ugc", None),
    "ok.ru": ("ugc", None),
    "linkedin.com": ("ugc", None),
    "x.com": ("ugc", None),
    "twitter.com": ("ugc", None),
    "reddit.com": ("ugc", None),
    "quora.com": ("ugc", None),
    "medium.com": ("ugc", None),
    "vc.ru": ("ugc", None),
    "habr.com": ("ugc", None),
    "otzovik.com": ("ugc", None),
    "irecommend.ru": ("ugc", None),
    # Reference: encyclopedias, laws, the state's own sites
    "wikipedia.org": ("reference", None),
    "lex.uz": ("reference", None),
    "gov.uz": ("reference", None),
    "stat.uz": ("reference", None),
    "gov.kz": ("reference", None),
    # Search engines' own pages: never a target (§7). Google Maps is typed apart, above
    "google.com": ("reference", None),
    "google.uz": ("reference", None),
    "google.ru": ("reference", None),
    "google.kz": ("reference", None),
    "yandex.uz": ("reference", None),
    "yandex.ru": ("reference", None),
    "yandex.kz": ("reference", None),
    "yandex.com": ("reference", None),
    "bing.com": ("reference", None),
    "duckduckgo.com": ("reference", None),
    # The platforms' help and documentation (the audit's support.google.com directory, defect 4)
    "support.google.com": ("platform_docs", None),
    "developers.google.com": ("platform_docs", None),
    "cloud.google.com": ("platform_docs", None),
    "ai.google.dev": ("platform_docs", None),
    "help.openai.com": ("platform_docs", None),
    "platform.openai.com": ("platform_docs", None),
    "learn.microsoft.com": ("platform_docs", None),
    "support.microsoft.com": ("platform_docs", None),
    "support.apple.com": ("platform_docs", None),
    "developer.apple.com": ("platform_docs", None),
    "developers.facebook.com": ("platform_docs", None),
    "faq.whatsapp.com": ("platform_docs", None),
    "telegram.org": ("platform_docs", None),
    "core.telegram.org": ("platform_docs", None),
}
# Any other site's help or documentation pages, by the first part of the address
DOCS_PREFIXES = ("support.", "help.", "docs.", "developers.", "developer.")


def host(domain: str) -> str:
    """The domain as the report compares it: lower case, without "www."."""
    domain = (domain or "").strip().lower()
    return domain[4:] if domain.startswith("www.") else domain


def _within(domain: str, site: str) -> bool:
    return domain == site or domain.endswith(f".{site}")


def seeded(domain: str) -> Optional[Tuple[str, Optional[Dict[str, str]]]]:
    """The seed list's type and route for a site: the longest entry it falls under (maps.google.com before
    google.com), then the help and documentation prefixes."""
    domain = host(domain)
    found = sorted((site for site in SEED if _within(domain, site)), key=len, reverse=True)
    if found:
        return SEED[found[0]]
    if domain.startswith(DOCS_PREFIXES):
        return ("platform_docs", None)
    return None


def _competitor(domain: str, rivals: Sequence[Tuple[str, Optional[str]]]) -> bool:
    """A tracked competitor's site: its domain, or an address carrying its name (the whole name, or its first
    two words, written together; one word of a longer name proves nothing: "ielts" in a competitor's name made
    ielts.org a competitor's site, seen in the first weekly check, 16 Nov 2026)."""
    if any(site and _within(domain, host(site)) for _, site in rivals):
        return True
    slug = re.sub(r"[^a-z0-9]", "", "".join(domain.split(".")[:-1]))
    for name, _ in rivals:
        words = re.findall(r"[a-z0-9]+", name.lower())
        if any(len(written) >= 5 and written in slug for written in {"".join(words), "".join(words[:2])}):
            return True
    return False


def resolve(domain: str, own: Optional[str], rivals: Sequence[Tuple[str, Optional[str]]], stored: Dict[str, List[DomainType]], project_id: Optional[str] = None) -> Dict[str, Any]:
    """A site's type, control, route and who typed it (`seed`, `automated`, `founder-reviewed`) for one project.
    `rivals` are the tracked competitors as (name, domain); `stored` the reviews and the AI's answers by domain."""
    domain = host(domain)
    rows = stored.get(domain, [])

    def found(kind: str, route: Optional[Dict[str, str]], review: str) -> Dict[str, Any]:
        return {"type": kind, "control": CONTROL.get(kind, "not_addressable"), "route": route, "review": review}

    if own and _within(domain, host(own)):
        return found("client_owned", None, "seed")
    if _competitor(domain, rivals):
        return found("competitor_site", None, "seed")
    by_hand = [row for row in rows if row.review == "founder-reviewed"]
    # A review for this project wins over one for every project
    for row in sorted(by_hand, key=lambda row: row.project_id is None):
        if row.project_id in (None, project_id):
            return found(row.type, row.route, "founder-reviewed")
    seed = seeded(domain)
    if seed:
        return found(seed[0], seed[1], "seed")
    for row in rows:
        if row.review == "automated" and row.project_id == project_id:
            # The AI types a site; it never gives a route (the user's decision, 21 Nov 2026)
            return found(row.type, None, "automated")
    return found("unclassified", None, "seed")


def stored_for(db: Db, domains: Iterable[str], project_id: Optional[str]) -> Dict[str, List[DomainType]]:
    """The reviews and the AI's answers kept for these sites, for this project and for every project."""
    wanted = sorted({host(domain) for domain in domains})
    if not wanted:
        return {}
    found: Dict[str, List[DomainType]] = {}
    query = select(DomainType).where(DomainType.domain.in_(wanted), or_(DomainType.project_id.is_(None), DomainType.project_id == project_id))
    for row in db.scalars(query):
        found.setdefault(row.domain, []).append(row)
    return found


def kind(kind_of_site: str) -> str:
    """The six kinds the app's other pages still show (`SourceType` in the frontend), from a spec type: they move
    to the spec's types with the rest of the data object, after Phase 0."""
    return {
        "client_owned": "own",
        "competitor_site": "competitor",
        "media": "news",
        "directory": "directory",
        "client_managed": "directory",
        "ugc": "social",
        "telegram": "social",
    }.get(kind_of_site, "other")


def placeable(kind_of_site: str, route: Optional[Dict[str, Any]], listed: bool, rivals: Sequence[str]) -> bool:
    """Spec §7, third-party placement: a directory, listing, media, UGC or Telegram site with a known route onto
    it, citing competitors and not the client. Platform docs, competitor sites, search engines, reference and
    `unclassified` sites are never a target."""
    return kind_of_site in PLACEABLE and bool(route and route.get("url")) and not listed and len(rivals) > 0


# --- the AI's reading ------------------------------------------------------------------------------------

DOMAIN_RULES = """You type the websites that AI assistants cited when customers asked about a kind of business.
For each site give one type:
- competitor_site: the website of a business that offers what the client offers (a competitor, named or not);
- directory: a catalog, map, marketplace, classifieds or review site that lists many businesses;
- media: a news site, magazine or blog run by an editorial team;
- ugc: a social network, forum, Q&A or reviews written by users;
- telegram: Telegram;
- reference: an encyclopedia, a dictionary, laws, a state or statistics site, a search engine's own pages;
- platform_docs: a platform's help, support or documentation pages;
- unclassified: none of these fits, or you are not sure (for example the website of a business that does
  something else than the client).
Judge from the address and the cited pages' titles only. Never guess: "unclassified" is better than a wrong type."""

DOMAIN_SCHEMA = {
    "type": "object",
    "properties": {
        "sites": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"domain": {"type": "string"}, "type": {"type": "string", "enum": AI_TYPES}, "why": {"type": "string"}},
                "required": ["domain", "type", "why"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["sites"],
    "additionalProperties": False,
}
# Sites asked in one call, and the cited pages shown for each
BATCH = 60
PAGES_SHOWN = 3


def classify(db: Db, project: Project, run: Run) -> float:
    """The AI types the sites this check cites that nothing else types, once a site and project, and keeps its
    answers (`automated`). Its cost in dollars; 0 when there is nothing to ask, no assistant can be asked, or in
    a replayed check. The caller commits."""
    if settings.first_run_replay or not settings.can_read:
        return 0.0
    brands = list(db.scalars(select(Brand).where(Brand.project_id == project.id)))
    client = next((brand for brand in brands if brand.own), None)
    rivals = [(brand.name, brand.domain) for brand in brands if not brand.own]
    pages: Dict[str, Dict[str, Optional[str]]] = {}
    for citation in db.scalars(select(Citation).join(Answer, Answer.id == Citation.answer_id).where(Answer.run_id == run.id).order_by(Citation.id)):
        pages.setdefault(host(citation.domain), {}).setdefault(citation.url, citation.title)
    stored = stored_for(db, pages, project.id)
    asked = {domain for domain, rows in stored.items() if any(row.review == "automated" and row.project_id == project.id for row in rows)}
    unknown = [domain for domain in sorted(pages) if domain not in asked and resolve(domain, client.domain if client else None, rivals, stored, project.id)["type"] == "unclassified"]
    cost = 0.0
    for start in range(0, len(unknown), BATCH):
        batch = unknown[start : start + BATCH]
        about = f"The client: {client.name if client else ''} ({client.domain if client else ''}), {project.category or ''}, {project.country or ''}.\n\nSites:\n"
        about += "\n".join(f"- {domain}: " + "; ".join(f"{title or ''} <{url}>" for url, title in list(pages[domain].items())[:PAGES_SHOWN]) for domain in batch)
        try:
            found, usd = engines.read(DOMAIN_RULES, about, "domain_types", DOMAIN_SCHEMA)
        except Exception as error:  # the check is saved; its sites stay unclassified until the next one
            print(f"domains: project {project.id}: the AI's typing failed: {error!r}")
            break
        cost += usd
        answered = {host(site["domain"]): site for site in (found or {}).get("sites", []) if site.get("type") in AI_TYPES}
        for domain in batch:
            site = answered.get(domain)
            db.add(DomainType(domain=domain, project_id=project.id, type=site["type"] if site else "unclassified", review="automated", model=settings.read_model, reason=(site or {}).get("why"), updated_at=now()))
    return cost


def set_by_hand(db: Db, domain: str, kind_of_site: str, project_id: Optional[str] = None, route: Optional[Dict[str, str]] = None) -> DomainType:
    """A site typed by a person (`founder-reviewed`), for one project or every project, with the route onto it
    when there is one. The caller commits."""
    domain = host(domain)
    row = db.scalar(select(DomainType).where(DomainType.domain == domain, DomainType.review == "founder-reviewed", DomainType.project_id.is_(None) if project_id is None else DomainType.project_id == project_id))
    if row is None:
        row = DomainType(domain=domain, project_id=project_id, review="founder-reviewed")
        db.add(row)
    row.type, row.route, row.model, row.reason, row.updated_at = kind_of_site, route, None, None, now()
    return row
