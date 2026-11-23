"""Free Snapshots for the demand test (report spec §2, §4.14, §8): for every prospect's website in a list, the free
first check made without its screens, saved as a trial project on the team's account, and its snapshot's link and
Telegram digest written out for the outreach. Fully automatic, as spec §8 sets for the Free Snapshot (the user's
choice, 22 Nov 2026): the draft the website gives (profile, questions, competitors found by a search) is asked as it
is. Run on the server, where the keys and `FRONTEND_ORIGIN` are:

    python -m app.prospects <websites.txt> [--account <email>] [--lang uz|ru|en] [--out <file.csv>] [--dry-run]

One website a line, optionally with its country after a comma ("site.uz, KZ"; Uzbekistan when left out); blank lines
and lines starting with # are skipped. `--account` is the team's account the projects go to (the first of
`TEAM_EMAILS` when left out). A website that already has a project is skipped, so a list can be run again after a
stop. `--dry-run` reads the list and prints what it would cost, and asks nobody. Each site takes about five minutes
and, on ChatGPT alone, about $0.6 (the first check's reading, competitor search, ten questions and the brand
questions).
"""

from __future__ import annotations

import argparse
import csv
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select

from . import delivery, digest, firstrun, fixes, projects, slots
from .config import settings
from .db import Brand, FirstRun, Project, SessionLocal, User, create_tables, now

# What one prospect's snapshot costs on ChatGPT alone, measured from the free checks of 16 and 22 Nov 2026
SITE_USD = 0.6
COLUMNS = ["website", "status", "project", "snapshot", "named", "most_named", "cost_usd", "questions", "competitors", "digest"]


def read_list(path: Path) -> List[Tuple[str, Optional[str]]]:
    """The websites of a list, each with its country (None: the website's own reading decides, Uzbekistan by default)."""
    sites: List[Tuple[str, Optional[str]]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        site, _, country = line.partition(",")
        sites.append((site.strip(), projects._country(country.strip()) or None))
    return sites


def snapshot_link(first_run_id: str, language: str) -> str:
    return f"{settings.frontend_origin.rstrip('/')}/{language}/snapshot/{first_run_id}"


def _save(run_id: str, **values: Any) -> None:
    with SessionLocal() as db:
        run = db.get(FirstRun, run_id)
        if run:
            for key, value in values.items():
                setattr(run, key, value)
            db.commit()


def _progress(run_id: str) -> Any:
    def progress(status: str, answered: int, total: int) -> None:
        _save(run_id, status=status, answered=answered, total=total)

    return progress


def _row(site: str, status: str, **values: Any) -> Dict[str, Any]:
    return {"website": site, "status": status, **{column: values.get(column, "") for column in COLUMNS[2:]}}


def make(user_id: str, site: str, country: Optional[str], language: str, engine_names: Optional[List[str]] = None) -> Dict[str, Any]:
    """One prospect's Free Snapshot: the first check, the project, its link and digest. Never raises: a website that
    can't be read, or a check that fails, comes back as a row saying so. `engine_names`: the assistants asked, the
    server's (`ANSWER_ENGINES`) when not given."""
    try:
        domain = firstrun.normalize(site)
    except firstrun.FirstRunError as error:
        return _row(site, f"failed: {error.code}")
    with SessionLocal() as db:
        if projects.domain_taken(db, domain):
            taken = db.scalar(select(Project).join(Brand, Brand.project_id == Project.id).where(Brand.own.is_(True), Brand.domain == domain))
            first = taken.first_run_id if taken is not None else None
            return _row(domain, "skipped: has a project", project=taken.id if taken is not None else "", snapshot=snapshot_link(first, language) if first else "")
        run = FirstRun(user_id=user_id, domain=domain)
        db.add(run)
        db.commit()
        run_id = run.id
    cost = 0.0
    try:
        _progress(run_id)("reading_site", 0, 0)
        draft, cost = firstrun.prepare(domain, None, None, country)
        _save(run_id, status="ready", draft=draft, cost_usd=cost)
        snapshot, raw, spent = firstrun.check(draft, firstrun.confirmed_of(draft), _progress(run_id), engine_names, log=slots.SlotLog(first_run_id=run_id))
        cost = round(cost + spent, 4)
        result = {"id": run_id, **snapshot}
        _save(run_id, status="done", result=result, raw=raw, cost_usd=cost, finished_at=now())
    except firstrun.FirstRunError as error:
        _save(run_id, status="failed", error=error.code, finished_at=now())
        return _row(domain, f"failed: {error.code}", cost_usd=round(cost, 4))
    except Exception as error:  # one prospect's failure must not stop the list
        print(f"prospects: {domain} failed: {error!r}")
        _save(run_id, status="failed", error="internal", finished_at=now())
        return _row(domain, "failed: internal", cost_usd=round(cost, 4))

    with SessionLocal() as db:
        user = db.get(User, user_id)
        project, check_id = projects.create(db, user, projects.first_run_body(result, run_id))
        fixes.sync(db, project)
        db.commit()
        project_id = project.id
    if check_id:
        # The sites typed and the cited pages read, as after "Save" in the app
        fixes.after_creation(project_id, check_id)
    with SessionLocal() as db:
        project = db.get(Project, project_id)
        run = db.get(FirstRun, run_id)
        total = (run.cost_usd if run else cost) or cost
        text = digest.for_run(db, project, check_id, language, delivery.link(project_id, check_id, language)) if check_id else ""
    lines = text.splitlines()
    return _row(
        domain,
        "done",
        project=project_id,
        snapshot=snapshot_link(run_id, language),
        # The digest's own lines: the client's count and who is named instead, every number the data object's
        named=lines[1] if len(lines) > 1 else "",
        most_named=lines[2] if len(lines) > 2 else "",
        cost_usd=round(total, 4),
        questions="; ".join(question["text"] for question in draft["who"]["questions"]),
        competitors="; ".join(rival["name"] for rival in draft["who"].get("competitors") or []),
        digest=text,
    )


def account(email: Optional[str]) -> User:
    chosen = (email or (settings.team_emails[0] if settings.team_emails else "")).strip().lower()
    if not chosen:
        raise SystemExit("prospects: no account: give --account or set TEAM_EMAILS")
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == chosen))
        if user is None:
            raise SystemExit(f"prospects: no account {chosen}: log in to the app with it once first")
        db.expunge(user)
        return user


def main() -> None:
    parser = argparse.ArgumentParser(description="Free Snapshots for a list of prospects' websites")
    parser.add_argument("list", type=Path, help="one website a line, optionally ', <country code>'")
    parser.add_argument("--account", help="the team account the projects go to (default: the first of TEAM_EMAILS)")
    parser.add_argument("--lang", default="uz", choices=["uz", "ru", "en"], help="the language of the links and the digest")
    parser.add_argument("--out", type=Path, help="the CSV written (default: <list>-snapshots.csv beside the list)")
    parser.add_argument("--dry-run", action="store_true", help="read the list and print the cost; ask nobody")
    chosen = parser.parse_args()
    if settings.first_run_replay:
        raise SystemExit("prospects: FIRST_RUN_REPLAY is on: every website would get a saved check, not its own")
    if not settings.engines:
        raise SystemExit("prospects: no assistant can be asked (ANSWER_ENGINES and the keys)")
    create_tables()
    sites = read_list(chosen.list)
    user = account(chosen.account)
    with SessionLocal() as db:
        fresh = []
        for site, country in sites:
            try:
                fresh.append((site, country, not projects.domain_taken(db, firstrun.normalize(site))))
            except firstrun.FirstRunError:
                fresh.append((site, country, False))
    asked = sum(1 for _, _, new in fresh if new)
    print(f"{len(sites)} websites, {asked} to check on {', '.join(settings.engines)} for {user.email}: about ${asked * SITE_USD:.2f} and {asked * 5} minutes")
    if not settings.frontend_origin.startswith("https://"):
        print(f"note: the links use FRONTEND_ORIGIN = {settings.frontend_origin}, which prospects can't open")
    if chosen.dry_run:
        return
    out = chosen.out or chosen.list.with_name(f"{chosen.list.stem}-snapshots.csv")
    rows: List[Dict[str, Any]] = []
    for site, country in sites:
        started = time.time()
        row = make(user.id, site, country, chosen.lang)
        rows.append(row)
        print(f"{row['website']}: {row['status']}, ${row['cost_usd'] or 0}, {time.time() - started:.0f}s {row['snapshot']}")
        # Written after every site, so a stop keeps what was made
        with out.open("w", newline="", encoding="utf-8-sig") as file:
            writer = csv.DictWriter(file, fieldnames=COLUMNS)
            writer.writeheader()
            writer.writerows(rows)
    spent = sum(float(row["cost_usd"] or 0) for row in rows)
    print(f"done: {sum(1 for row in rows if row['status'] == 'done')} snapshots, ${spent:.2f}; {out}")


if __name__ == "__main__":
    main()
