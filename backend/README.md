# Backend

Two things live here:

- `pilot/`: the script that makes a pilot report's file from a brief (its own README).
- `app/`: the API the frontend calls, built a slice at a time. `PLAN.md` is the plan for all of it.

## The stack (decided 14 Nov 2026)

- **Supabase** for the database (Postgres) and the login (email code; Google next).
- **A server at Contabo** runs this Python service: the API and the runs that ask the assistants.
- The frontend talks only to this service, which sets the `geo_session` cookie the pages already expect.
- **Assistants:** ChatGPT and Gemini. Each is asked only when its key is set.

## Run it on this computer

Nothing needs an account: the database is the file `local.db`, and a login code is printed to the server's log
instead of being emailed.

```
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install fastapi uvicorn "sqlalchemy>=2" "psycopg[binary]"
uvicorn app.main:app --reload --port 8000
```

Keys go into `backend/.env` (never committed; `pilot/.env` is read too):

```
OPENAI_API_KEY=...
GEMINI_API_KEY=...              # optional: without it only ChatGPT is asked
# The login email, sent by this service (Gmail: an app password, not the account's password):
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<the address>
SMTP_PASSWORD=<app password>
# On the server:
DATABASE_URL=postgresql+psycopg://...   # Supabase's connection string
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=...
FRONTEND_ORIGIN=https://<the site>
SECURE_COOKIES=true
```

## What is built

| Endpoint | What it does |
| --- | --- |
| `POST /auth/code` `{email}` | Sends a six-digit code: by this service's own email when `SMTP_HOST` is set, else by Supabase's, else (development) into the server's log |
| `POST /auth/code/verify` `{email, code}` | Logs in, makes the account on the first login, sets the cookie |
| `GET /auth/me`, `PATCH /auth/me` `{name}`, `POST /auth/logout` | The account; its name; logging out |
| `POST /first-runs` `{domain, category?, city?}` | Starts a new account's first run and returns at once (202) |
| `GET /first-runs` | The account's first runs, newest first |
| `GET /first-runs/{id}` | Its progress: `status`, `answered`, `total` |
| `GET /first-runs/{id}/result` | The first statistics, in the frontend's `Snapshot` shape and a little more |
| `POST /projects` `{name, aliases, domain, category, city, competitors, prompts, firstRunId?}` | The setup's last button: a project. With `firstRunId`, the first run's answers become its first check, for the questions that were kept |
| `GET /projects`, `GET /projects/{id}`, `GET /projects/{id}/prompts` | The account's projects; one; its questions |
| `GET /projects/{id}/report` `?language=&topic=` | The `Report` the dashboard's pages read, counted from the answers |
| `GET /projects/{id}/prompts/{promptId}/report`, `GET /projects/{id}/reports/{runId}` | The report over one question; the report as it stood at a run |
| `GET /projects/{id}/topics`, `/tags` | Counted from the questions |
| `POST`, `PATCH /projects/{id}/prompts`, `PUT`, `PATCH /projects/{id}/prompts/{promptId}` | Questions: add several (all or none; 409 at the plan's limit, 422 for a repeat), edit one, archive or track again, and for several at once a topic, tags, fact-checking |
| `POST /projects/{id}/topics`, `PATCH`, `DELETE /projects/{id}/topics/{topic}`; the same for `/tags` | Topics and tags; deleting a topic archives its questions |
| `POST /projects/{id}/competitors`, `PATCH`, `DELETE /projects/{id}/competitors/{brandId}`, `PATCH /projects/{id}/untracked-brands` | Competitors: one added gets the mentions the answers already hold under its name, one removed leaves them as an untracked name; hiding an untracked brand |
| `PATCH /projects/{id}` | The brand profile |
| `GET`, `PUT /projects/{id}/facts`; `GET`, `PATCH /projects/{id}/report-settings`; `POST /projects/{id}/plan-requests` | The brand's facts against the plan's limit; where the report goes (connecting Telegram answers 501: no bot yet); a plan request, written to the log |
| `GET /projects/{id}/reports/{runId}/pdf` `?lang=` | The run's report as a PDF (503 when no browser is installed) |
| `GET /projects/{id}/actions` | The recommended fixes, each with its proof once done (read without login, like the report) |
| `PATCH /projects/{id}/actions/{actionId}`, `PATCH /projects/{id}/actions`, `POST /projects/{id}/actions` | An action's status and ticked steps; one status for several; "Add a page" (a page of the client's to rework) |
| `GET /projects/{id}/prompt-suggestions`, `GET /members` | Empty or default answers, so those pages open on a real project; nothing is kept for them yet |
| `GET /runs/{id}/progress` | A run's progress (a project's first check is done when the project is made) |
| `GET /health` | Which assistants have a key, and which login is on |

**The first run** (`app/firstrun.py`): reads the website and makes the four site checks; a model works out who
the business is and writes ten questions its customers ask (half Russian, half Uzbek, none naming a business);
each is asked once to every assistant, five at a time; a model reads who each answer names, in order, in what
tone, and whom it recommends; plain code counts the scores. About a minute and a half and about $0.47 on
ChatGPT alone (`gpt-6.1-terra`, measured 14 Nov 2026). One account may start three a day; the same website
again within a day returns the run it already has.

Beside the `Snapshot` of the contract the result carries `engines` (the scores per assistant), `recommended`
(how often each business is recommended), `answers`, `description` and `services`; each answer says which
`engine` gave it and each mention whether it is `recommended`.

**Projects** (`app/projects.py`, 15 Nov 2026; read only). Tables: `projects`, `brands` (the client's own and
the competitors, in a fixed order), `prompts`, `runs`, `answers`, `mentions` (every business an answer names;
without a brand id when the project doesn't track it: the "new competitor" list) and `citations`. Saving a
first run matches its competitors and questions to what the client kept in the setup, by name and by text: a
competitor the client dropped becomes an untracked name, one the client added is looked for in the answers'
text, a question the client removed loses its answers, a new one waits for the next check. The report is
counted in plain code from those rows for any set of questions, with the condition score by the formula of
`frontend/src/shared/helpers/condition.ts`. A new project is on Biznes until plans are sold. The plan's
limits on questions, competitors and facts are enforced. Not built: suggested questions (they need a model),
facts read from the website, actions, inviting members.

**The weekly check** (`app/weekly.py`, 15 Nov 2026; **never run against an assistant**). `python -m app.weekly`
checks every project, `--project <id>` one. It asks each tracked question to every assistant with a key,
`RUN_SAMPLES` times (default 1), five at a time, a failed one twice more; reads the answers as a first run does;
gathers the spellings of each business with the tracked brands' names among them; keeps what earlier checks
found about each cited site and reads the five most cited new ones. With `FIRST_RUN_REPLAY=true` it asks
nobody and saves the project's latest check again as a new one: that is how it was tried. On the server it is
to be started by a timer on Mondays at 01:00 UTC, with `WEEKLY_RUNS=true` so the report names the next check;
the timer is not installed.

**Fixes** (`app/fixes.py`, 15 Nov 2026). After a project is made and after every check, the most cited pages
on sites a business can be listed on are opened (plain HTTP, up to 15, no model) and it is kept which tracked
brands each names: `Source.brandListed` and `CitedPage.mentions`. Then the actions are made by rule from the
latest check: a listing for each cited site without the client (news, directories and social pages; any other
site only when a page of it names two or more tracked competitors; at most eight), a page to write for each
topic whose questions name competitors and never the client, a fix for each failed site check, a correction
for each wrong fact. An action's `key` never changes, so the client's status survives the next check; an
untouched suggestion that is no longer called for goes. Proof: the client's visibility on the action's
questions in the last check before it was done and in the latest one. Two parts use a model and run only
inside a live weekly check, so **they have never run**: wrong facts (each answer that names the client, read
against the facts in Sozlamalar › Faktlar; `Report.factsChecked` says whether it happened) and the briefs of
content actions (also when a page is added by hand).

**The report's delivery** (`app/delivery.py`, 15 Nov 2026). `GET /projects/{id}/report`,
`/reports/{runId}` and `/actions` answer without login: the report's page is the link a client shares, and the
project's id (32 random characters) is what the link's holder knows. The PDF is that page
(`FRONTEND_ORIGIN/{lang}/projects/{id}/report?run=`) printed by a headless Chrome, so paper and page can't
differ. After a weekly check the report is emailed to the address in the project's report settings, in the
language chosen there: the condition, visibility with its change, the place among the brands, the link, the
PDF attached (sent without it when no browser is found). `python -m app.delivery <project id> [<run id>]`
sends one again. Tried on this computer: the page without login, a 10-page PDF, the email into a local test
mail server. On the server it needs Chrome or Chromium installed and `FRONTEND_ORIGIN` set to the public site.

**Without paying** (`FIRST_RUN_REPLAY=true` in `backend/.env`): a first run replays the latest saved one over
about ten seconds and asks no assistant; its result carries `replayed: true`. For building pages. Never on the
server.

## On the server (since 15 Nov 2026)

The service runs on the Contabo server beside the user's other projects, which it must not touch: its own
folder `/opt/geo-backend` (`app/`, `pilot/llm.py` and `pilot/web.py`, `.venv`, `.env`, the database file
`local.db`), its own user `geo`, and the systemd service `geo-backend` on `127.0.0.1:8200`. Port 8000 is not
used: another project's nginx site points at it. The server's address and access are not written in this
repository.

- Its address is `https://geo-api.shopsready.com` (since 15 Nov): an nginx site of its own
  (`/etc/nginx/sites-available/geo-api.shopsready.com`) passes it to the service, with a Let's Encrypt
  certificate that certbot renews; HTTP redirects to HTTPS. `SECURE_COOKIES=true` in its `.env`.
- The frontend's browser code reaches it through the frontend itself (`/api/backend`, a rewrite in
  `frontend/next.config.ts`), so the session cookie works whatever domain the frontend has, and
  `FRONTEND_ORIGIN` (CORS) matters only for a direct call.
- Since 15 Nov its `.env` points at the user's Supabase project: the database (direct connection, which works
  from this server) and the email login (`/health` says `"login": "supabase"`). Supabase serves a public
  table through its own API to anyone with the project's public key, so `create_tables` locks every table
  (row level security on, no rights for `anon` and `authenticated`); checked from outside: refused.
  Supabase is the database only: the login email is this service's own (`SMTP_*` in the `.env`, a Gmail
  account; `/health` says `"login": "email"`), because Supabase's emails kept the default sign-in link whatever
  its saved templates said. A code reached a real inbox on 15 Nov.
- Its `.env` holds no assistant's key yet, so `/health` lists no assistant and a first run fails with `no_engines`; login
  works, with the code in the service's log (`journalctl -u geo-backend`).
- To update: copy `app/` and `requirements.txt` (rsync), `pip install -r requirements.txt` in its `.venv`,
  `systemctl restart geo-backend`.

## Not built yet

- The frontend's login calls this service (since 14 Nov, with `NEXT_PUBLIC_LIVE=auth` in `frontend/.env.local`);
  and so does the first-run page (`auth,first-run`, since 15 Nov); every other page still runs on mocks.
- Gemini is written from Google's documentation and has never been run: no key yet.
- Supabase's login is written and has never been run: no project yet. Google login is not written.
- A live weekly check and its timer on the server; a browser on the server for the PDF; the report in
  Telegram; suggested questions; facts read from the website; and everything else in `PLAN.md`.
- A first run is done in a thread of the web process: fine for a start, a queue when there is traffic.
