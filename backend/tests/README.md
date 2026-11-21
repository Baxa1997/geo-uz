# Tests (Phase 0 of the report spec, since 21 Nov 2026)

The spec's acceptance tests (§11.1) run on the baseline client's first check, the one the spec's audit read
(§3.2–3.3). Its data is exported from the server into `fixtures/`, which stays on this computer.

## Run them

From `backend/`, once: `.venv/bin/pip install -r requirements-dev.txt` (pytest; this computer only).

- `.venv/bin/python -m pytest`: the data and the backend, in under a second. No server is started.
- `.venv/bin/python -m pytest -m page`: the report as a reader gets it. The tests start a backend on their own
  database and a frontend dev server reading from it, on free ports, render the report in English, and stop
  both: about 20 seconds once compiled. Next allows one dev server per project, so stop `npm run dev` first
  (the tests say so and are skipped otherwise). This computer's backend on port 8000 can keep running.

Nothing here can reach the server, an assistant or an inbox: `conftest.py` points `DATABASE_URL` at a fresh
SQLite file and blanks every key before `app` is imported, and checks that it held.

## What there is

- `test_baseline.py` passes now: the fixture is the panel of spec §3.3 (with ChatGPT asked half the questions
  by the free check's design, and the Gemini answers that ran no web search), and today's code still shows
  what the audit found (the composite from a default 50, the share, tone and place of a single mention, a
  listing on platform docs). Each of those checks names the Phase 0 item that fixes it and goes when that item
  lands.
- `test_acceptance.py`: §11.1, each test marked with the item that makes it pass. `xfail_strict` makes one
  that starts passing fail the run until its mark comes off. Its docstring lists the `data-*` marks the page
  tests read, which each item adds to the report as it builds its part.
- `export_baseline.py` (read-only) writes `fixtures/baseline.json`; `fixture_db.py` loads it into the tests'
  database; `pagetools.py` starts the servers and reads the page. It moves the parts React streams late
  (`<div hidden id="S:n">`) into their places (`<template id="P:n">`), as the browser's script does, and its
  percentage check leaves out answers quoted word for word (`data-verbatim`) as it does glossary examples
  (`data-example`): both since Phase 0 item 0.5 (21 Nov 2026). Since 0.9 it also places the parts streamed inside
  tables (`<tbody>` and `<tr>` of a `<table hidden>`). `empty_check.py` adds a made-up check with nothing to show
  (nothing cited, nobody named, no brand question) for the empty states, and takes it out after; one page test prints
  the report to PDF with Chrome and reads its section numbers (`pypdf`, in `requirements-dev.txt`).

Names, counts and texts of the baseline come from `fixtures/baseline.expected.json`, never from a test file:
the repository is public. So does the project's id, which opens its report by link.
