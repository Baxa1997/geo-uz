"""What we do by hand until billing exists: see the accounts' projects, and switch a plan on or off.

    python -m app.admin list                                 every project: id, account, brand, plan, paid or trial
    python -m app.admin plan <project id> <plan>             the plan paid from now: start (Standard), business (Pro), agency (Enterprise)
    python -m app.admin plan <project id> <plan> --trial     the plan's limits without payment: no further checks

A paid project is checked on its plan's days by the timer (`app/weekly.py`).
"""

from __future__ import annotations

import sys

from sqlalchemy import select

from .db import Brand, Project, SessionLocal, User, create_tables
from .projects import PLAN_LIMITS


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
        else:
            sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
