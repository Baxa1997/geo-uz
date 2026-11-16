# Variables

Every setting the project reads from its environment, where each is set, and what it does. **No values of
secrets are written here or anywhere in this repository** (it is public): secrets live in files that git
ignores and on the server.

Rule: when a change adds, renames or removes a variable, this file is updated in the same piece of work, and
the user is told in the reply which variable, where to set it (this computer, Vercel, the server) and to what.

## Where they are set

| Place | File or screen | Read by |
| --- | --- | --- |
| This computer, frontend | `frontend/.env.local` (ignored by git; `frontend/.env.example` is its pattern) | `npm run dev` |
| This computer, backend | `backend/.env`, and `backend/pilot/.env` for the OpenAI key (both ignored) | `uvicorn`, the pilot script |
| Vercel (the frontend) | Project → Settings → Environment Variables; a change needs a redeploy | the deployed site |
| The server (the backend) | `/opt/geo-backend/.env`, readable by the service's user only | the `geo-backend` service; restart it after a change |
| Hand-over | `backend/.env.server` (ignored): values the user writes for the server, copied there over SSH | nobody; it is a way to pass secrets without the chat |

## Frontend

All three are public (built into the site), none is a secret.

| Variable | What it does | This computer | Vercel |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | The backend's address. The browser reaches it through the site itself (`/api/backend`) | `http://localhost:8000` | `https://geo-api.shopsready.com` |
| `NEXT_PUBLIC_USE_MOCKS` | `true`: pages the backend doesn't serve yet use sample data. `false`: everything calls the backend | `true` | `true` |
| `NEXT_PUBLIC_LIVE` | The parts of the API that are the backend's while the rest are sample data: `auth`, `first-run`, `projects` (since 15 Nov: the project list, a project's questions and its report) | `auth,first-run,projects` | `auth,first-run,projects`. Since 16 Nov `first-run` alone also makes projects the backend's (a real first run saved into sample data became the sample dental clinic), so the old value `auth,first-run` works too once the new code is deployed |

## Backend

Since 16 Nov 2026 this computer's `backend/.env` also has `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASSWORD`,
copied from the server's `.env`, so a local login emails its code as the server does. Remove them to have codes
printed to the backend's log again.

| Variable | Secret | What it does | Default | Set on the server (15 Nov 2026) |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | yes | The database. Supabase's Postgres as `postgresql+psycopg://…` | a file, `backend/local.db` | yes |
| `SUPABASE_URL` | no | The Supabase project. With the key below and no `SMTP_HOST`, Supabase sends and checks login codes | none | yes (unused while `SMTP_HOST` is set) |
| `SUPABASE_ANON_KEY` | no (public key) | The Supabase project's public key | none | yes (unused while `SMTP_HOST` is set) |
| `SMTP_HOST` | no | The mail server for the login email. Set: the backend makes the code and sends it itself. Since 16 Nov the same account also emails each demo request from the landing page to `SMTP_FROM` (or `SMTP_USER`) | none: the code is printed in the log | yes |
| `SMTP_PORT` | no | 465 for SSL; another port uses STARTTLS when offered | `465` | yes |
| `SMTP_USER` | no | The mail account | none | yes |
| `SMTP_PASSWORD` | yes | The mail account's password (Gmail: an app password) | none | yes |
| `SMTP_FROM` | no | The sender's address when it differs from `SMTP_USER` | `SMTP_USER` | no |
| `OPENAI_API_KEY` | yes | Asks ChatGPT. Its model also reads and writes for us when Gemini on Vertex is not set up or fails. Without it ChatGPT is not asked | none | yes |
| `GEMINI_API_KEY` | yes | Asks Gemini. Without it Gemini is not asked | none | **no** |
| `GOOGLE_CLOUD_PROJECT` | no | Gemini through Vertex AI: the Google Cloud project. With it set, Vertex is used and `GEMINI_API_KEY` is not. It also turns on Gemini as the model that reads and writes for us (`READ_MODEL`, `WRITE_MODEL`) | none | yes (the IELTS project's, for now) |
| `GOOGLE_CLOUD_LOCATION` | no | The Vertex location; Gemini 3 models answer only at `global` | `global` | no (the default) |
| `GOOGLE_APPLICATION_CREDENTIALS` | yes (the file it names) | The path of the Google credentials file Vertex is reached with. Read by Google's own library | none | yes (a copy of the IELTS project's file, for now) |
| `CHATGPT_MODEL` | no | The model that answers the questions | `gpt-6.1-terra` | no |
| `GEMINI_MODEL` | no | The Gemini model that answers the questions | `gemini-3.8-flash` (the user's choice, 15 Nov). Asked with Google Search on; an answer that came without a search is asked once more | no |
| `READ_MODEL` | no | The model that reads who an answer names, gathers a business's spellings and checks facts. A name that starts with `gemini` goes to Vertex | `gemini-3.8-flash` when `GOOGLE_CLOUD_PROJECT` is set (since 15 Nov), else `gpt-6.1-terra` | no (the default) |
| `WRITE_MODEL` | no | New on 15 Nov. The model that writes a website's profile and questions, the first check's conclusion and the briefs of pages. If it fails or takes over a minute, `gemini-3.8-flash` does the call, then OpenAI's model | `gemini-4-hydrogen` when `GOOGLE_CLOUD_PROJECT` is set, else `gpt-6.1-terra` | no (the default) |
| `FIRST_RUN_QUESTIONS` | no | Questions in a new account's first run | `10` | no |
| `FIRST_RUN_CHATGPT_QUESTIONS` | no | Of a first check's questions, how many ChatGPT is asked when Gemini is asked too (Gemini gets all) | `5` | no (the default) |
| `FIRST_RUNS_A_DAY` | no | First runs one account may start in a day (each costs money) | `3` | no |
| `FIRST_RUN_REPLAY` | no | Development: a first run replays a saved one and asks nobody. Never on the server | `false` | no (on this computer: `true`; taken out for one real check on 16 Nov and put back the same day, the user: "replay") |
| `TEAM_EMAILS` | no | Our own accounts, comma-separated emails: not bound by "one free check an account", so the team can try the product | empty | no (on the server: the team's address, set 16 Nov) |
| `RUN_SAMPLES` | no | A weekly check: how many times each tracked question is asked to each assistant. Every extra one multiplies the check's cost; waits for the prices decision | `1` | no (the default) |
| `WEEKLY_RUNS` | no | `true` where the server's timer starts the checks (every day at 01:00 UTC; Standard is due on Mondays, Pro and Enterprise on Mondays and Thursdays): the report then says when the next check is | `false` | set to `true` on 15 Nov, with the timer `geo-weekly` |
| `CHROME_PATH` | no | The browser that prints a report as a PDF (Chrome or Chromium). Left out, the usual places are tried | found by itself | no: no browser is installed on the server yet |
| `FRONTEND_ORIGIN` | no | The site's public address. Since 15 Nov it is the address in a report's link and email, and the page the server prints as a PDF, so it must open without Vercel's own login. Also the site allowed to call the backend directly (CORS) | `http://localhost:3000` | default: **to be set to the site's public address before reports are sent** |
| `SECURE_COOKIES` | no | `true`: the login cookie only over HTTPS | `false` | `true` |

## Not variables, but needed to run it

- The server's address and login, the DNS record `geo-api.shopsready.com`, the Supabase project: see `CLAUDE.md`,
  "Where the project stands", and `backend/README.md`, "On the server".
- Passwords that passed through a chat must be replaced: see `CLAUDE.md`, "Waiting on the user".
