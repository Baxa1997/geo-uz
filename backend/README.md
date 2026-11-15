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
- Projects, questions, weekly runs and everything else in `PLAN.md`.
- A first run is done in a thread of the web process: fine for a start, a queue when there is traffic.
