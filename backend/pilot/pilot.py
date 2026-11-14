#!/usr/bin/env python3
"""Makes a pilot report's file from a brief. See README.md.

    export OPENAI_API_KEY=...
    python3 pilot.py briefs/example.json            # every step; a step already done is not paid for twice
    python3 pilot.py briefs/example.json --to ask   # only ask, to see what it costs
    python3 pilot.py briefs/example.json --redo analyze
"""

from __future__ import annotations

import argparse
import datetime
import re
import sys
from pathlib import Path

import llm
import steps

HERE = Path(__file__).resolve().parent
ORDER = ["ask", "extract", "names", "sources", "site", "analyze", "build"]


def check(brief: dict) -> None:
    """Stops on a brief that would waste a paid run."""
    problems = []
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", str(brief.get("slug", ""))):
        problems.append("slug: lowercase Latin letters, digits and hyphens (it becomes the report's address)")
    if brief.get("language") not in ("ru", "uz", "en"):
        problems.append("language: ru, uz or en (the report's language)")
    if not (brief.get("brand") or {}).get("name"):
        problems.append("brand.name is missing")
    for key in ("city", "category"):
        if not brief.get(key):
            problems.append(f"{key} is missing")
    questions = brief.get("questions") or []
    if not questions:
        problems.append("questions: at least one")
    for question in questions:
        if question.get("language") not in ("ru", "uz"):
            problems.append(f"question language must be ru or uz: {question.get('text')}")
        if steps.web.names(question.get("text", ""), steps.spellings(brief)) if (brief.get("brand") or {}).get("name") else False:
            problems.append(f"a question must not name the client: {question.get('text')}")
    keys = [attribute.get("key") for attribute in brief.get("attributes") or []]
    if not keys or any(not re.fullmatch(r"[a-z_]+", str(key)) for key in keys):
        problems.append("attributes: one or more, each with a key in lowercase Latin letters and a label")
    if brief.get("previous") is not None and not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", str(brief["previous"])):
        problems.append("previous: the slug of the client's earlier report")
    elif brief.get("previous") == brief.get("slug"):
        problems.append("previous: a new report needs a slug of its own (the earlier report keeps its file)")
    if problems:
        sys.exit("The brief has problems:\n- " + "\n- ".join(problems))


def main() -> None:
    parser = argparse.ArgumentParser(description="Make a pilot report's file from a brief.")
    parser.add_argument("brief", type=Path)
    parser.add_argument("--to", choices=ORDER, default="build", help="stop after this step")
    parser.add_argument("--redo", choices=ORDER, action="append", default=[], help="run this step again even if its result is saved (may be repeated)")
    parser.add_argument("--ask-model", default="gpt-6.1-sol", help="the model that answers the questions, with web search")
    parser.add_argument("--read-model", default="gpt-6.1-terra", help="the model that reads the answers")
    parser.add_argument("--write-model", default="gpt-6.1-sol", help="the model that drafts the analysis")
    parser.add_argument("--out", type=Path, default=HERE.parent.parent / "frontend" / "pilots", help="where the report's file goes")
    parser.add_argument("--overwrite", action="store_true", help="replace a report's file that exists (it may hold hand edits)")
    args = parser.parse_args()

    brief = steps.load(args.brief)
    check(brief)
    work = HERE / "out" / brief["slug"]
    costs = steps.Costs(work / "costs.json")
    last = ORDER.index(args.to)
    # The client's earlier report, to compare with: its file, as it was sent (hand edits included)
    before = None
    if brief.get("previous"):
        earlier = args.out / f"{brief['previous']}.json"
        if not earlier.exists():
            sys.exit(f"The earlier report {earlier} is not there.")
        before = steps.load(earlier)
    redo = set(args.redo)

    def due(step: str) -> bool:
        if ORDER.index(step) <= last:
            print(f"[{step}]")
            return True
        return False

    try:
        if due("ask"):
            steps.ask(brief, work, args.ask_model, costs, "ask" in redo)
        if due("extract"):
            answers = steps.extract(brief, work, args.read_model, costs, "extract" in redo)
        if due("names"):
            mapping = steps.names(brief, work, answers, args.read_model, costs, "names" in redo)
        if due("sources"):
            cited = steps.sources(brief, work, answers, "sources" in redo)
        if due("site"):
            pages = steps.site(brief, work, "site" in redo)
        if due("analyze"):
            counts = steps.aggregate(brief, answers, mapping)
            written = steps.analyze(brief, work, counts, answers, cited, pages, args.write_model, costs, "analyze" in redo, before)
        if due("build"):
            target = args.out / f"{brief['slug']}.json"
            if target.exists() and not args.overwrite:
                print(f"  {target} exists and may hold hand edits: not replaced. Pass --overwrite to replace it.")
            else:
                first = work / "raw" / "q1_s1.json"
                day = datetime.date.fromtimestamp(first.stat().st_mtime).isoformat()
                steps.save(target, steps.build(brief, counts, cited, written, day, args.ask_model, before))
                print(f"  written: {target}\n  open http://localhost:3000/{brief['language']}/pilots/{brief['slug']} and read every sentence before sending it")
    except llm.LlmError as error:
        print(f"\nStopped: {error}\nWhat was collected is kept in {work}; run the same command to go on.")
        sys.exit(1)
    finally:
        if costs.rows:
            print(f"\nCost so far ({work / 'costs.json'}):\n{costs.summary()}")


if __name__ == "__main__":
    main()
