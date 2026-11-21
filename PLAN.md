# The plan to the MVP

Written 15 November 2026. This is the plan for the whole product; `backend/PLAN.md` is the detail behind its
backend parts (tables, formulas, rules), and `CLAUDE.md` says where the work stands today.

Keep it current: when a stage is finished and the user has confirmed it, mark it here with the date.

## What the MVP is

One business can do all of this by itself, on real data, and pay for it:

1. Log in with an email.
2. Enter its website and get a first check on ChatGPT and Gemini.
3. Confirm its profile, competitors and questions.
4. Open a dashboard that shows its own numbers.
5. Be checked again every week without doing anything.
6. Receive a report each week that says where it stands and what to do, as a page and a PDF.
7. See a list of fixes made from its own answers.

The MVP is finished when a first client goes through steps 1–7 without us touching the database by hand.

**Not in the MVP** (each exists as a design, or is planned for after it): the Telegram bot, Yandex, Google login,
team members, automatic billing, the Seenova AI assistant, Discovery and keyword import, the agency's own
branding, a full site audit.

## Where it stands (18 Nov 2026)

| Part | State |
| --- | --- |
| Every page's design | Built, in three languages, with our own look (the name Seenova AI since 17 Nov) |
| Login by email | **Real**: the backend sends the code; used on this computer and on the Vercel site |
| First check | **Real** on ChatGPT and Gemini together since 16 Nov, as "confirm, then check" (the website read, the owner confirms the business, competitors and questions, then the check): $0.84 and about five minutes on the user's own site. It also finds competitors by a web search, asks the brand questions, writes a conclusion and shows results while it runs |
| Projects and the dashboard | **Built, deployed, waiting for the user's look**: a first check saved as a real project, every page reading and writing it |
| Checks by plan | **Ran live once** (16 Nov, Standard, the user's own site: 20 answers of 20, $1.63, about seven minutes). The server's timer checks paid projects on their days; one is paid |
| The report by link, as a PDF and by email | **Built, waiting for the user's look**. The PDF download (18 Nov) works on this computer; on the live site it waits for Vercel's login to go and for Chromium on the server. No report email has reached a real inbox yet |
| Fixes and wrong facts | **Built, waiting for the user's look**. Wrong facts come from the brand answers against the website (16 Nov, no model); a page's brief ran in the live check of 16 Nov; the check against the owner's own facts (Pro) has never run |
| Backend on the server | Running at `geo-api.shopsready.com` with Supabase's database (in Mumbai), the OpenAI key and Google credentials (since 15 Nov) |
| Frontend on Vercel | Deployed, its server in Frankfurt (17 Nov); behind Vercel's own login |
| The pilot report (a one-off report made by script) | Works; run once for a first client; on hold until the platform's flow is set up |

## Prices and the free first check (the user's decision, 15 Nov 2026)

| Plan | Price a month | Checked | Questions | Notes |
| --- | --- | --- | --- | --- |
| Free first check | $0 | once | 10 on Gemini, 5 of them on ChatGPT | every new account; costs us about $0.50 |
| Standard (`start`) | $39.99 | weekly, Mondays | 25 | checks cost about $9 a month on two assistants |
| Pro (`business`) | $89.99 | twice a week, Mondays and Thursdays | 50 | wrong facts included; about $35 a month |
| Enterprise (`agency`) | by agreement | twice a week | 300, several projects | "contact us" |

After the free check nothing more is checked until a plan is paid; we switch plans on by hand
(`python -m app.admin`). The user proposed Pro "every 2 or 3 days"; it was built as twice a week with 50
questions because every other day with 75 would cost $55–80 of the $89.99. The user confirmed that
correction on 15 Nov ("yes agree with your questions count"). Managed GEO stays on the pages, priced by agreement.

## The stages, in order

Each stage ends with something the user can open and check. A stage is marked done only after the user says so.

### Stage 1. Real projects

The setup's last button saves a real project, and the dashboard opens on its numbers.

- Backend: tables for projects, brands, questions, runs, answers, mentions and citations; a first run's result
  is saved into them; `POST /projects` (from a first run), `GET /projects`, `GET /projects/{id}`,
  `GET /projects/{id}/prompts`, `GET /projects/{id}/report`.
- Frontend: the slice `projects` goes live; the project list, Overview, Savollar, Javoblar, Raqobatchilar and
  Manbalar read the backend. With one check, charts show dots and "what changed" is empty.
- Needs: nothing from the user. No paid request (the replayed run is saved as the project).
- **State (15 Nov): built, waiting for the user's look.** Tried on this computer in Uzbek, desktop and phone
  width: the setup saves the project and every page opens on it. On the server and Vercel since 16 Nov (with
  the corrections from the user's first real use). Left for later stages: the pages' buttons (stage 2); the
  report's link for someone not logged in, and its sentence "no wrong fact found" on a project nobody checked
  (stage 3).
- Check: log in → website → first check → setup → the Overview shows that business, not the sample clinic.

### Stage 2. Weekly checks

Every project is checked again each Monday, and a question added on Tuesday is asked the next Monday.

- Backend: the weekly run (every tracked question × assistants × samples), started by a timer on the server;
  retries; history, so charts get lines and changes get arrows; adding, editing and archiving questions and
  competitors; the plan's limits.
- Frontend: Savollar's and Raqobatchilar's buttons call the backend.
- Needs: **the prices decision** (below): it sets how many questions, samples and assistants a run has. The
  OpenAI and Gemini keys on the server, and permission to spend.
- Check: start a run by hand for one project; the second point appears on its charts.
- **State (16 Nov): built, waiting for the user's look; first live check done.** The buttons work on a real
  project and the plan's limits on questions, competitors and facts hold. The timer is on the server since
  15 Nov and checks only paid projects. On 16 Nov the user's own site was switched to Standard by hand and
  checked live (20 answers of 20 on both assistants, the six brand questions, $1.63): the charts got their
  second point. Questions per plan follow the prices (25, 50, 300), one answer a question (`RUN_SAMPLES`).
  Still owed: suggested questions.

### Stage 3. The report

After each check the client gets its status report.

- Backend: every check's counts, from its data object and slot log (`app/wave.py`, `app/metrics.py`,
  `app/slots.py`; the 0–100 condition score went on 21 Nov, Phase 0 item 0.2 of the report spec);
  a past run's report; a PDF printed from the report's own page by a headless browser on the server; an email
  with the summary, the link and the PDF.
- Frontend: Hisobotlar and the public report read the backend.
- Needs: a mail service that sends from our own domain (Gmail's account is for login codes and testing).
- Check: the report of a real project opens, prints as a PDF, and arrives by email after a run.
- **State (15 Nov): built, waiting for the user's look.** On this computer the report's link opens without
  login, the server prints it as a 10-page PDF, and the email (summary, link, PDF) reached a local test mail
  server. Since 18 Nov the report's PDF buttons download that file, and open the print dialog where the
  backend can't make it. Still owed: a browser on the server (the user: not yet), the site's public address in
  `FRONTEND_ORIGIN` (Vercel's own login is in the way: the user is to turn it off), one email to a real inbox,
  and later a mail service on our own domain.

### Stage 4. Fixes and wrong facts

The "what to do" half: the part that keeps a small business paying.

- Backend: reading the cited pages (which brands each names), whether the client is listed on a cited site,
  wrong facts against the client's own facts, the rules that make the actions, the brief for a page, proof
  after a fix is marked done.
- Frontend: Harakatlar, Notoʻgʻri faktlar and Sozlamalar › Faktlar read the backend.
- Check: a real project has a list of fixes that names real sites and real questions.
- **State (15 Nov): built, waiting for the user's look and a live check.** A real project has its list of
  fixes (real sites, real questions), statuses and steps are kept, proof appears after the next check. Since
  16 Nov wrong facts also come from the brand answers against the website, with no model, and a page's brief
  ran in the live check of 16 Nov. The check against the owner's own facts (a model, Pro only) has never run.
  Still owed: a live Pro check with facts filled in, suggested questions, facts read from the website.

### Stage 5. Ready for a paying client

- Prices and plans final, shown on the landing page; the plan's limits enforced.
- Payment by hand at first: the client asks for a plan, we invoice, we switch the plan on.
- The landing page's claims match the product (the Telegram report, "no sign-up needed").
- The product's own domain; the frontend and the emails on it; privacy policy and terms.
- Limits against abuse on the first check; backups of the database; an alert when a run fails.
- Every password and key that passed through a chat replaced.
- The lawyer's answer on where personal data may be stored.

## Every value the product shows

"Yes" below means counted from real answers on a real project, from its first check and at every check after
(one live weekly check so far, 16 Nov).

| Value | What it is | Where it comes from | Real today |
| --- | --- | --- | --- |
| Tilga olinish (visibility) | Answers naming the brand ÷ all answers | counted from the answers | yes |
| Tavsiya qilindi (recommended) | Answers that advise choosing the brand | a model reads each answer | yes |
| Ovoz ulushi (share of voice) | The brand's mentions ÷ all tracked brands' mentions | counted (the report, since 21 Nov: shown from 10 mentions) | yes |
| Oʻrni (position) | The brand's mean place among the businesses an answer names | counted (the report, since 21 Nov: the median place, from numbered lists only) | yes |
| Baho (tone) | Mean of positive 100, neutral 50, negative 0 over its mentions | a model reads each answer (the report, since 21 Nov: counted per mention, a word from 3 mentions, never a number, N/A at none) | yes |
| Manba sifatida (used as a source) | Answers citing the client's own site ÷ all answers (the report, since 21 Nov: ÷ the answers that cite any site, spec §6.3) | counted from citations | yes |
| Each assistant apart | The same numbers per assistant (ChatGPT, Gemini) | counted | yes, both (the pages' switcher, 16 Nov) |
| Change since last week | This check minus the one before | needs two checks | yes, since the live check of 16 Nov |
| Cited sites and pages | Which sites the answers rely on, their kind, how often | citations of the answers; the type from the project, a review, our seed list or the AI (`app/domains.py`) | yes; the report shows the spec's types since 21 Nov (Phase 0 item 0.4), the other pages six kinds worked out from them |
| "Are you on them" | Whether a cited site lists the client | reading the cited pages | yes, for the most cited pages |
| What the assistant searched | The web searches behind an answer | the search tool's report | yes: a question's page and an opened answer |
| Untracked brands | Businesses the answers name that aren't tracked | names in the answers | yes (AI assistants named among them are not yet left out) |
| Site checks | AI bots blocked, prices as pictures, no business markup, contacts missing | reading the client's site | first check |
| Wrong facts | Claims about the client that contradict its website or its own facts | the brand answers against the website (since 16 Nov); a model against the client's facts | from the website: yes, from the first check; from the client's facts: written, never run |
| Condition score | One number from 0 to 100 over five areas | — | removed on 21 Nov (Phase 0 item 0.2): the report shows counts, every percentage beside its count, ties grouped, N/A where nothing was counted |
| The report's scope card | What a check asked, of which assistant and model, and what came of every call | the slot log | yes, since 21 Nov (a check before it has its slots rebuilt when read) |
| Risks and opportunities | The report's register | written from the numbers in the frontend | yes, in a real project's report; since 21 Nov each entry names the answers it stands on |
| Top finding and evidence | One buyer question with its answers; every answer in full, numbered, in the report and the PDF, and as a CSV | `metrics.top_finding`; the data object's answers | yes, since 21 Nov (Phase 0 item 0.5) |
| Recommended actions | Fixes with impact, steps, questions and proof | rules over the answers and sites | yes, from the first check; a page's brief first ran in the live check of 16 Nov |

## Decisions the user owes

| Decision | Why it blocks | Needed by |
| --- | --- | --- |
| Prices against cost | Decided 15 Nov (the table above), with Pro as twice a week and 50 questions, confirmed by the user | — |
| The Google credentials for Gemini | Set on the server on 15 Nov ("do it"): for now the IELTS project's Google Cloud project, with a copy of its credentials file. A project of GEO's own, to keep the bills apart, is still owed | Stage 5 |
| Permission to spend, and the keys on the server | The keys are on the server since 15 Nov. The user chooses each paid request; the one paid project is checked every Monday (about $1.63) until it is switched back | — |
| The product's name and domain | The name is Seenova AI (17 Nov) and the logo two rounds (18 Nov). The domain is still owed: the emails' sender, the site's address | Stage 5 |
| Vercel's own login | Until it is off, the server can't print a report and a client's report link asks for a Vercel login (the user is to turn it off, 18 Nov) | Stage 3 on the live site |
| Pilots or self-serve first | Whether to sell hand-made reports while the platform is built | any time |
| Where personal data is stored | Supabase's database is in Mumbai today; the user chose a new project in Frankfurt (17 Nov), theirs to create. The lawyer's answer is still owed | Stage 5 |

## What can go wrong

- **Cost.** The largest risk. The dollar prices of 15 Nov cover it as measured on 16 Nov (Standard about $15 a
  month in checks against $39.99), but the brand questions are a fixed share whatever the plan, and Gemini
  Flash's price doubles on 1 Jan 2027.
- **Answers differ between runs** (about half the businesses in common). Three answers per question hide some
  of it; one answer per question, the cheap option, hides none.
- **The API is not the ChatGPT app.** A client may see different answers in the app. Every report says how
  the answers were collected; a side-by-side measurement is still owed.
- **Gemini ran for the first time on 15 Nov 2026** (two first checks of ten questions, Gemini alone, on the server): about
  $0.52 and two and a half minutes each. Since then Gemini also reads the answers and writes the profile, the
  questions and the conclusion (`backend/README.md`). ChatGPT and Gemini together in one first check first ran
  on 16 Nov ($0.84). Gemini runs on another project's Google credentials until GEO has its own.
- **The database is far from the server** (Supabase in Mumbai, the server in Germany): a statement costs about
  0.12 s. The caches of 17 Nov hide most of it; a database in Frankfurt would remove it.
