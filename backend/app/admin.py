"""What we do by hand until billing exists: see the accounts' projects, and switch a plan on or off.

    python -m app.admin list                                 every project: id, account, brand, plan, paid or trial
    python -m app.admin plan <project id> <plan>             the plan paid from now: start (Standard), business (Pro), agency (Enterprise)
    python -m app.admin plan <project id> <plan> --trial     the plan's limits without payment: no further checks

The cited sites' types (report spec §4.6, §8: the founder classifies what nothing else types):

    python -m app.admin domains                              each project's latest check: its sites still unclassified
    python -m app.admin domain <domain> <type>               a site typed by hand for every project (`founder-reviewed`)
        [--project <id>]                                     ... for one project only
        [--route <listing_page|form|editor_contact> <url>]   ... with the way onto it, which a "get listed" action needs
    python -m app.admin classify <project id>                the AI types the latest check's unknown sites (a paid call, under a cent)

The website's audit and the actions (23 Nov 2026: the SEO audit's checks came after most projects were made):

    python -m app.admin audit <project id>                   the website read and checked again, the actions brought in
                                                             line and the pages to write given briefs (no assistant asked)
    python -m app.admin research <project id>                why AI names others and not the client, on the latest check
                                                             (report spec §4.5; the reading model, a few cents), then the
                                                             actions brought in line and the briefs written
    python -m app.admin briefs <project id>                  every page to write given its brief, not five as a check
                                                             does (24 Nov 2026; the writing model, about a cent a page)

Types: client_managed, directory, media, ugc, telegram, reference, platform_docs, competitor_site, unclassified.
The pages keep a report two minutes (`app/cache.py`): a site typed here shows within that.

A paid project is checked on its plan's days by the timer (`app/weekly.py`).
"""

from __future__ import annotations

import sys
from typing import Any, Optional

from sqlalchemy import select

from . import cache, domains, firstrun, fixes, projects, research
from .db import Action, Brand, Project, Run, SessionLocal, User, create_tables
from .projects import PLAN_LIMITS


def _option(arguments: list, name: str, count: int = 1) -> Optional[list]:
    """The values after `--name`, or None when it isn't given."""
    if name not in arguments:
        return None
    at = arguments.index(name)
    values = arguments[at + 1 : at + 1 + count]
    if len(values) != count:
        sys.exit(__doc__)
    return values


def _latest(db: Any, project: Project) -> Optional[Run]:
    return db.scalar(select(Run).where(Run.project_id == project.id, Run.status == "done").order_by(Run.collected_at.desc()).limit(1))


def main(arguments: list) -> None:
    create_tables()
    with SessionLocal() as db:
        if arguments[:1] == ["list"]:
            for project in db.scalars(select(Project).order_by(Project.created_at)):
                owner = db.get(User, project.user_id)
                brand = db.scalar(select(Brand).where(Brand.project_id == project.id, Brand.own.is_(True)))
                print(f"{project.id}  {owner.email if owner else '?':32}  {brand.name if brand else '?':32}  {project.plan:9} {'paid' if project.paid else 'trial'}")
        elif arguments[:1] == ["plan"] and len(arguments) >= 3 and arguments[2] in PLAN_LIMITS:
            project = db.get(Project, arguments[1])
            if project is None:
                sys.exit("No such project")
            project.plan, project.paid = arguments[2], "--trial" not in arguments
            db.commit()
            print(f"{project.id}: {project.plan}, {'paid' if project.paid else 'trial'}")
        elif arguments[:1] == ["domains"]:
            for project in db.scalars(select(Project).order_by(Project.created_at)):
                run = _latest(db, project)
                if run is None:
                    continue
                sites = projects.report(db, project, run_id=run.id)["topSources"]
                left = [site for site in sites if site["domainType"] == "unclassified"]
                print(f"{project.id}: {len(left)} of {len(sites)} sites unclassified")
                for site in left:
                    print(f"    {site['domain']:40} cited by {site['count']}")
        elif arguments[:1] == ["domain"] and len(arguments) >= 3 and arguments[2] in domains.TYPES and arguments[2] != "client_owned":
            only = _option(arguments, "--project")
            route = _option(arguments, "--route", 2)
            if route and route[0] not in domains.ROUTES:
                sys.exit(__doc__)
            if only and db.get(Project, only[0]) is None:
                sys.exit("No such project")
            row = domains.set_by_hand(db, arguments[1], arguments[2], only[0] if only else None, {"how": route[0], "url": route[1]} if route else None)
            db.commit()
            print(f"{row.domain}: {row.type}{' with ' + route[0] + ' ' + route[1] if route else ''}, for {only[0] if only else 'every project'}")
        elif arguments[:1] == ["classify"] and len(arguments) == 2:
            project = db.get(Project, arguments[1])
            run = _latest(db, project) if project else None
            if run is None:
                sys.exit("No such project, or no check yet")
            usd = domains.classify(db, project, run)
            run.cost_usd = round((run.cost_usd or 0.0) + usd, 4)
            db.commit()
            print(f"{project.id}: the latest check's unknown sites typed, ${usd:.4f}")
        elif arguments[:1] == ["audit"] and len(arguments) == 2:
            project = db.get(Project, arguments[1])
            if project is None:
                sys.exit("No such project")
            own = db.scalar(select(Brand).where(Brand.project_id == project.id, Brand.own.is_(True)))
            languages = firstrun.languages_for(project.country or "UZ")
            pages = firstrun.web.read_site(own.domain, "en" if languages == ["en"] else "ru")
            if not pages:
                sys.exit(f"{own.domain} could not be read")
            project.site_checks = firstrun.audit(pages, languages)
            fixes.sync(db, project)
            db.commit()
            fixes.write_briefs(db, project)
            db.commit()
            cache.touch(project.id)
            failed = [check["check"] for check in project.site_checks if not check["passed"]]
            print(f"{project.id}: {len(project.site_checks)} checks, failed: {', '.join(failed) or 'none'}; {len(fixes.listed(db, project))} actions")
        elif arguments[:1] == ["research"] and len(arguments) == 2:
            project = db.get(Project, arguments[1])
            run = _latest(db, project) if project else None
            if run is None:
                sys.exit("No such project, or no check yet")
            project_id, run_id = project.id, run.id
            db.commit()
            kept = research.research(project_id, run_id)
            if kept is None:
                sys.exit("The research failed: see the lines above")
            db.expire_all()
            project = db.get(Project, project_id)
            fixes.sync(db, project)
            db.commit()
            fixes.write_briefs(db, project)
            db.commit()
            cache.touch(project_id)
            statuses = ", ".join(f"{status} {sum(item['status'] == status for item in kept['items'])}" for status in ("compared", "no_page", "unreadable", "failed"))
            print(f"{project_id}: {len(kept['items'])} questions researched ({statuses}), ${kept['cost']:.4f}")
        elif arguments[:1] == ["briefs"] and len(arguments) == 2:
            project = db.get(Project, arguments[1])
            if project is None:
                sys.exit("No such project")
            fixes.write_briefs(db, project, limit=None)
            db.commit()
            cache.touch(project.id)
            pages = [action for action in db.scalars(select(Action).where(Action.project_id == project.id, Action.kind == "content")) if action.status in ("new", "in_progress")]
            print(f"{project.id}: {sum(bool((action.details or {}).get('brief')) for action in pages)} of {len(pages)} pages to write have a brief")
        else:
            sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
