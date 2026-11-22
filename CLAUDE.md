# Seenova AI: AI visibility for businesses in Uzbekistan (repository `geo-uz`)

Start here in a new session: this file says what the project is, how the work is organized, what is done and
what comes next. "Where the project stands" below is the place to pick the work up from. The details live in three other places, and each should be read before the work it covers:

- `PLAN.md`: the plan to the MVP: what the MVP is, the five stages in order, every value the product shows and
  whether it is real yet, the decisions the user owes. Read it before choosing what to build next.
- `ENVIRONMENT.md`: every variable, what it does and where it is set (this computer, Vercel, the server).
- `frontend/CLAUDE.md`: folder structure, the API contract, how the scores and charts work, and the rules
  that keep the landing page fast. Read it before changing frontend code.
- `backend/PLAN.md`: what the backend has to do, written from the frontend pages, with a change log of what
  was measured and decided. `backend/README.md`: what of it is built (`backend/app/`) and how to run it.
  `backend/pilot/README.md`: the pilot report's script.
- The two teardown documents in this folder ("Peec AI Teardown & Our Plan for Central Asia.md" and "GEO
  Competitor Teardown & Our Feature List.md"): every Peec feature with our version of it, the other
  competitors, and prices. Read them before adding a feature or making a pricing claim.

Keep "Done" and "To do" below current. When a page is finished or a decision is made, change them in the
same piece of work, with the date.

## What the project is

**Seenova AI** (the user's name for it, 17 Nov 2026; until then the working name GEO, which the repository, the
server and the code's internal names keep).

A tool that shows a business how AI assistants talk about it, and what to do about it.

Every week (Pro: twice a week) it asks ChatGPT and Gemini, with web search on, the questions customers ask,
such as "best dental clinic in Tashkent?", one answer a question (`RUN_SAMPLES`), and asks each assistant
about the business by its name (the brand questions). From the answers it measures how often the brand is
named compared with its competitors (visibility, share of voice, position, tone), which sites the assistants
rely on, and what they say about the brand that is wrong. Then it gives the owner a short list of fixes: get
listed on a site AI cites, correct a wrong fact, write a page on a topic where only competitors are named, fix
something on the website.

- **Buyers:** local businesses (the owner or their marketer) and agencies. Uzbekistan first, then the rest
  of Central Asia. Many will read their report on a phone, from Telegram.
- **Languages:** the interface is in Uzbek (default), Russian and English. The questions are in the languages
  of the business's country (16 Nov): Uzbek and Russian in Uzbekistan, Russian in Kazakhstan, Kyrgyzstan,
  Tajikistan, Turkmenistan, Russia and Belarus, English elsewhere.
- **Reference product:** Peec AI (peec.ai). We copy its layout where it works and make ours simpler, local
  and in plain words. We never copy its name, logo, colors, wording, customer quotes or logos.
- **Which assistants:** ChatGPT alone since 21 Nov 2026 (`ANSWER_ENGINES=chatgpt` on the server): Gemini with
  Google Search is paused, because Google's terms for it (Service Specific Terms 20(k)) allow its answers to be
  shown only to the person who asked and forbid storing, analysing or reselling them, which a report for a business
  does; Gemini still reads and writes for us, without Google Search. From 15 to 21 Nov ChatGPT and Gemini. Google's
  AI answers in Search and Yandex are "tez
  orada". The first reason given for ChatGPT alone (about 95% of AI visits in Uzbekistan, said to be
  DataReportal's) could not be found in DataReportal's report (corrected 16 Nov). StatCounter's October 2026
  figures for Uzbekistan: among AI chatbots Gemini 58%, ChatGPT 35%; in search Google 76%, Yandex 22%. The
  landing page shows them with their month.
- **Plans (the user's decision, 15 Nov, in dollars; the soʻm plans of October are gone; the prices of 22 Nov):**
  the first check free, once an account · Standard $34.99 a month (weekly, 25 questions; was $39.99) · Pro $79.99
  (twice a week, 50 questions, wrong facts against the owner's facts; was $89.99) · Enterprise "Custom" (several
  projects) · Managed GEO "Custom". A year costs 10 months. Standard and Pro are paid through Stripe once its key is
  set (`backend/app/billing.py`); until then, and for Enterprise, a plan is switched on by hand (`python -m app.admin
  plan`). The table is in `PLAN.md`.

## Where the project stands (21 November 2026)

Read this section first in a new session: it says what exists, how to run it, and where to go on. The entries
under "Done" hold the detail, newest first.

**Three parts, all on `main` (GitHub: Baxa1997/geo-uz, a public repository), every branch merged:**

1. **`frontend/`: a Next.js 16 app, every page built, in three languages.** With
   `NEXT_PUBLIC_LIVE=auth,first-run,projects` (this computer) a real account's pages read and write the backend;
   sample data (Tashkent dental clinics) stays for the landing page's preview and wherever a slice is off
   (`frontend/CLAUDE.md`). Deployed on Vercel, which still puts its own login in front of the site.
2. **`backend/app/`: the API** (`backend/README.md`): login by a code the backend emails itself; the first check
   (the website read, the owner confirms the business, competitors and questions, then ChatGPT and Gemini are
   asked, with the results filling in as they come); real projects behind every page; checks by plan, started
   by a timer; fixes and wrong facts; the report by its link, as a PDF and by email. Deployed at
   `https://geo-api.shopsready.com` on the Contabo server, with Supabase's database (in Mumbai).
3. **The pilot report**: `/pilots/<slug>` draws a one-off report from `frontend/pilots/<slug>.json`, made by
   `backend/pilot/` from a brief (`backend/pilot/README.md`). Run for real for the first client; on hold until
   the platform's flow is set up (the user, 14 Nov).

**The latest work (17–19 Nov), each merged, pushed and deployed, each waiting for the user's look** (entries
under "Done"): the name Seenova AI, then its logo as two rounds; the first part of the user's list of 17 Nov
(speed, loading, fields, the report's section on each assistant, Manbalar rebuilt); Harakatlar made simple,
with a task for the owner's own AI on every action; Notoʻgʻri faktlar rebuilt; a real PDF download; the
reader's signature lines gone from the report; the landing page's indicator, the sentence with chips and a
smaller headline; (19 Nov) full-height screens for the first check and the login, black and gray buttons in the
dashboard, and Savollar made simple. **(21 Nov) Phase 0 of the report spec**, its test harness and items 0.1–0.3
(the slot log and the data object with the scope card; counts in the place of the 0–100 score; every percentage
beside its count), merged, pushed and deployed; 0.1–0.3 confirmed by the user, the harness waiting for their look.

**The user's decisions that hold now:**

- The first flow (16 Nov, "confirm, then check"): login → the website and country → the business, competitors
  and questions, confirmed → the check on ChatGPT and Gemini → the first statistics → the project's dashboard.
  One free check an account; one website, one project.
- Supabase is the database only. The backend sends the login email itself (15 Nov, "switch to backend":
  Supabase's emails kept the default sign-in link through six tests, whatever the saved templates said). A
  server at Contabo runs the backend; the frontend talks only to it. Google login comes later.
- The prices of 15 Nov ("What the project is", and `PLAN.md`); a plan is switched on by hand.
- The pilot report "is good for now"; its polishing and sending come after the platform's flow is set up.
- The look is "navy and paper" with our own key icons and Phosphor for the rest; the Uzbek metric names are
  Tilga olinish, Oʻrni, Baho; the name is Seenova AI and the mark two rounds (`frontend/CLAUDE.md`, "Our look").
- A paid request (OpenAI, Gemini) is made only when the user has chosen it, as for the real checks of 16 Nov
  and the one request of 17 Nov. On this computer first checks are replayed (`FIRST_RUN_REPLAY=true`; the user,
  16 Nov: "replay"). Since 22 Nov nothing on the server spends by itself: the paid project is a trial again
  (below), and free checks are capped at 2 a day (`FREE_CHECKS_A_DAY=2` on the server; the OpenAI balance is about $2).

**Go on from here.** Nothing is finished until the user confirms it, and most of "Done" since 15 Nov still
waits for their look. The open work, in the order the user picks (ask as a short choice):

0. **Phase 0 of the report spec, item by item, a plan shown before each** (section "Seenova report: source of
   truth" below): every item built and deployed (step 1, 0.1–0.9, 21 Nov), 0.1–0.3 confirmed, the rest waiting for
   the user's look. Spec §2: Phase 1 waits for the demand signal (at least 5 paid First Audits out of 20 offers);
   until then the First Audits are made with these tools plus the founder's review. The Phase 0 review (21 Nov)
   found three gaps before the demand test; the close-out (branch `phase0-closeout`, merged and deployed 21 Nov) handles them:
   Gemini paused for Google's terms, each evidence card's channel and place, the
   digest's change over the same questions; the links wait for Vercel's login to go.
1. The rest of the user's list of 17 Nov: the report's competitors and sources (3–4), the bug in the dynamics
   window. Each waits for its screenshots. (Savollar, point 5, was made simple on 18 Nov from the user's own
   screenshot of it.)
2. The live site: the user turns off Vercel's login; then `FRONTEND_ORIGIN` on the server becomes the site's
   public address; then Chromium on the server, when the user says (the PDF on the live site, the emailed
   report's attachment).
3. The database to a Supabase project in Frankfurt, once its connection string is in `backend/.env.server`
   (`NEW_DATABASE_URL=…`): the data copied across and the server switched.
4. Stage 5 of `PLAN.md`, ready for a paying client: the domain, terms, limits against abuse, backups, an alert
   when a check fails, new passwords.

**Waiting on the user (ask once, don't block on it):**

- (21 Nov) Gemini with Google Search is paused for Google's terms (Service Specific Terms 20(k)): a letter to Google
  asking whether its answers may be stored, counted and shown in a report for a business (the terms allow what
  Google permits in writing), or a lawyer's read; and what to do with the Gemini answers past checks already hold
  (they stay as they are until the user decides).

- (17 Nov) The screenshots the list of 17 Nov names: the report's competitors and sources and the bug in the
  dynamics window (only Brend savollari's arrived; Savollar's came on 18 Nov and the page was rebuilt).
- (17 Nov) A Supabase project in the Frankfurt region (the user's choice), its connection string in
  `backend/.env.server` as one line `NEW_DATABASE_URL=…`, never in chat; then the data is copied across and the
  server switched.
- (18 Nov) Vercel's login turned off (theirs, in Vercel): until then neither the server nor a client given a
  report's link can open the site. Chromium on the server: not yet (the user's choice).
- The paid project on the server: the user's own site, switched to Standard by hand on 16 Nov for the first
  weekly check, and back to a trial on 22 Nov (the user's choice: "Skip it this week", to keep the OpenAI balance of
  about $2 for visitors), so the timer leaves it. Back on: `python -m app.admin plan <id> start` (without `--trial`).
- (22 Nov) The OpenAI balance is about $2, which the user can't top up for now; free checks are capped at 2 a day on
  the server (`FREE_CHECKS_A_DAY=2`) until it is. Past the cap a check joins the queue (live since 22 Nov); once the
  balance is topped up, the queue is run by hand on the server (`python -m app.queue --run N`).
- New passwords, since all were pasted in chat on 15 Nov: the server's root password (an SSH key is installed,
  so it is no longer needed), the Supabase database password (the same one) and the Gmail app password; each
  goes into `backend/.env.server` (ignored by git), not into chat.
- Google: Gemini runs through Vertex with the IELTS project's Google Cloud project and a copy of its
  credentials, for now; a Google Cloud project of our own is owed. A Gemini API key (the other path in
  `backend/app/engines.py`) has never run.
- The product's own domain (the emails' sender, the site's address) and a mail service on it: Gmail's account
  is for login codes and testing.
- Real contacts for the public pages (an email, a Telegram): the footer's placeholders were removed on 16 Nov.
  Contacts for the pilot report's last page.
- Three answers pasted from the ChatGPT app, to compare the app with the API.
- (Settled by the landing page's rebuild, 16 Nov, waiting for the user's look.) The weekly Telegram report is
  marked "tez orada" and "no sign-up needed" is gone: the free check is "sign in with your email, no card".
- The frontend on Vercel (the user, 15 Nov: "geo right now will be in Vercel, then it will be in its domain, I
  don't know yet"; the subdomain is for the API only). The browser calls the backend through the frontend
  (`/api/backend`, a rewrite), so the login works from any domain; the user used it there on 16 Nov (the
  fifteen corrections). Vercel's variables are in `ENVIRONMENT.md`. The Vercel connector in this session is
  not authorized.

**What is measured (details in `backend/PLAN.md`, change log):** an answer with web search costs $0.024 to
$0.077 on OpenAI's models ($0.044 on `gpt-6.1-terra`, the default) and about $0.035 on Gemini. A first check
on both assistants (ten questions on Gemini, five of them on ChatGPT, the brand questions) took about five
minutes and cost $0.84 (16 Nov); a weekly check on Standard (ten questions on both, six brand questions) took
about seven minutes and cost $1.63. At that rate Standard's 25 questions cost about $3.50 a check, about $15 a
month against its $34.99. Gemini Flash's price doubles on 1 Jan 2027. Answers differ between runs and between
models (about half the businesses in common); the pattern over many answers holds.

**On this computer only, never in git** (the repository is public): the OpenAI key (`backend/pilot/.env`, read
by `backend/app` too), clients' briefs (`backend/pilot/briefs/*` except the example), clients' report files
(`frontend/pilots/*.json`), the answers collected (`backend/pilot/out/`), the local database
(`backend/local.db`) and the Python environment (`backend/.venv`). Never write a client's name into a file
that is committed.

**To run it:**

- Frontend: `cd frontend`, `npm run dev`, http://localhost:3000. On this computer `node` is not on the shell's
  path: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"` first. Login needs the backend running
  (below): any email, and the code arrives by email (since 16 Nov this computer's `backend/.env` has the server's
  `SMTP_*`; without them the code is printed in the backend's log). An account sees its own projects (the slice
  `projects` is on here); one without a project starts at the first check. With `NEXT_PUBLIC_LIVE` empty the
  login is a mock again (demo@geo.uz with any six-digit code) and every page shows the sample project "Oq Tabassum".
- A pilot report: http://localhost:3000/ru/pilots/<slug> (the first client's two files are in `frontend/pilots/`).
  To make one: `cd backend/pilot`, `set -a; . ./.env; set +a`, `python3 pilot.py briefs/<brief>.json`.
- Backend: `cd backend`, `. .venv/bin/activate`, `uvicorn app.main:app --reload --port 8000`; `GET /health` says
  which assistants have a key and whether first runs are replayed (`FIRST_RUN_REPLAY=true` in `backend/.env`:
  no paid request, and every step of the first check says in a banner that it shows a saved check, not the
  website typed; remove the line for a live run, about $0.85 on both assistants). A login code is emailed (the `SMTP_*` lines in `backend/.env`), or
  printed to the server's log when they are removed.
- To check a pilot report as a PDF: Chrome headless, `--print-to-pdf` against the dev server.

## How we work

1. **One page at a time.** For each page the user sends Peec's screenshots of that page. Say which of its
   information we need and which we don't, build it, wait for the user's corrections, apply them. Only then
   start the next page.
2. **Clear enough for a business owner.** Every number and chart has to be professional, clear and simple
   to explain, and it has to help a decision. A block says in a plain sentence what its numbers mean and
   how to read them. On a page, the numbers and charts come first and the "what to do" blocks under them.
   Every table heading, figure and mark explains itself on hover (a tap on a phone), as on Peec: the rule
   is in `frontend/CLAUDE.md`, "Explanations on hover".
3. **Three languages, always.** Every piece of interface text goes into `uz.json`, `ru.json` and `en.json`.
4. **Check before saying done.** Open the change in a real browser, on desktop and phone width, and run the
   type check and the linter. Judge speed on a production build, not on `npm run dev`.
5. **Variables are reported (the user's rule, 15 Nov).** A change that adds, renames or removes a variable
   updates `ENVIRONMENT.md` in the same piece of work, and the reply names the variable, where the user has to
   set it (this computer, Vercel, the server) and to what. A secret's value is never written in the repository
   or asked for in chat: it goes into `backend/.env.server`, which git ignores.
6. **Finished means the user said so (the user's rule, 15 Nov).** When a feature is built and checked, say so
   and ask the user to confirm it. Only after they do is it written as finished in "Done" and in `PLAN.md`;
   until then it is recorded as built and waiting for their look. Every feature that is confirmed is
   documented: what it does, where it lives, how to run it, what it needs.
7. **Commit only when the user asks.** Say plainly which branch the work is on. "commit, push" has meant each
   time: a branch for the work, a commit, a merge into `main`, and a push of both. Before any commit, check
   that no key and no client's name is in it.

## Done (as of 18 November 2026)

- **Built, waiting for the user's look: the free checks' queue (22 Nov), on the branch `free-check-queue`; merged,
  pushed and deployed the same day, when the user said "commit push and deploy" (Vercel's build passed; the server's
  previous `app/` kept as `app.bak-before-queue`; live, `/health` answers and `python -m app.queue` says the queue is
  empty).** The user: the OpenAI balance is about $2 and can't be topped up for now, Gemini's isn't usable for the
  answers (its terms), so a post that goes viral "won't be successful"; asked, they chose "Cap at 2 a day + queue" with
  queued checks run "by hand", and to skip the paid project's Monday check. Done on the server the same day:
  `FREE_CHECKS_A_DAY=2` in its `.env` (the backend restarted, `/health` answers) and the paid project back to a trial.
  Found while planning: every website read ran a ChatGPT web search for competitors (about $0.075) before the cap,
  which counts only confirmed checks, so readings alone could empty the balance. Built: past the day's free checks a
  website read skips that search (the profile's own competitors, step 3 saying so), step 4 says the check will join
  the queue and its button reads "Join the queue", a confirmed check waits (`waiting`, one an account, 2 a day a
  connection) and its screen shows its place and the address the report goes to; `python -m app.queue` lists the
  queue with its cost and `--run N` asks the first N and emails each a link to its results in its language (refused
  while `FRONTEND_ORIGIN` is localhost); a check whose call found the OpenAI balance empty goes back to its place
  instead of failing, from the queue or from the site (`backend/README.md`). Tests: `pytest` 70 pass (5 new, stand-in
  assistants, emails kept in a list); type check and linter clean. Looked at in headless Chrome on this computer with
  throwaway accounts (removed after), the draft's and the start's answers swapped in the browser since this computer
  replays: steps 3 and 4 and the queue's screen in Uzbek on desktop, the queue's screen in Russian at 390px and in
  English on desktop, step 4 in English at 390px; nothing wider than the screen, no console error. Then, asked what a
  new user sees while waiting, the user chose "Queue on the dashboard": an account with no project and a check in the
  queue sees it on the dashboard (its place, where the report goes, a link to it) in the place of "No projects yet";
  looked at in Uzbek and English on desktop and Russian at 390px. No new variable
  (`FREE_CHECKS_A_DAY` is 2 on the server), no new table or column. Not tried: a real email (the tests keep them), a
  queued check on the server. Before a post: Vercel's login off and `FRONTEND_ORIGIN` the site's address, or nobody
  can open the site or the emails' links.

- **Built, waiting for the user's look: Vercel's Web Analytics (22 Nov), on the branch `vercel-analytics`; merged,
  pushed and deployed the same day, when the user said "commit push and deploy" (frontend only).** The user: "I need to enable the vercel analytics", with Vercel's own steps. `@vercel/analytics` 2.0.1
  (pinned) and `<Analytics />` in the root layout (`app/[locale]/layout.tsx`), so every page counts its visitors and
  views, without cookies; it sends only from the deployed site. Looked at on this computer's dev server: the landing
  page and the login load Vercel's debug script and log a page view, no error. Type check and linter clean. No
  variable; Analytics is switched on in the Vercel project's dashboard.

- **Built, waiting for the user's look: new prices (22 Nov), on the branch `free-check-login`; merged, pushed and deployed
  the same day (Vercel's build passed; the server's previous `app/` kept as `app.bak-before-prices`; no Stripe key on
  it yet, so its webhook answers 503 and plans are still switched on by hand).** The
  user: "prices change oto 34.99, 79.99 and Custom". Standard $34.99 a month ($349.90 a year), Pro $79.99 ($799.90),
  Enterprise "Custom" (uz "Individual", ru "Индивидуально"), which Managed GEO's price reads too, as it shared the "By
  agreement" label. One constant on the frontend (`PLAN_PRICES`: the landing page's cards, its plan table, "why us",
  Tarif) and Stripe's amounts (`PLANS` in `backend/app/billing.py`); Stripe was never set up, so no price exists there
  to change, and its setup now says when a price it finds differs. Docs brought to the new prices; the dated history
  keeps the old ones. Looked at in headless Chrome: the landing page's prices and Tarif's cards. `pytest` 65 pass; type
  check and linter clean. No new variable. Then the user made Standard's and Pro's monthly prices by hand in Stripe's
  dashboard ("from stripe you need price id, take it yourself"; products "Seenovai standard" and "Seenovai pro"): the
  setup takes them (`--use start:month=price_… --use business:month=price_…`), checks each against `PLANS`, gives it
  our lookup key and makes the yearly prices on the same products; waiting for `STRIPE_SECRET_KEY` in
  `backend/.env.server`. Nothing of Stripe goes to Vercel (`ENVIRONMENT.md`).

- **Built, waiting for the user's look: "Check for free" goes to the login first (22 Nov), on the branch `free-check-login`; merged,
  pushed and deployed the same day with the new prices, when the user said "commit push and deploy" (Vercel's build
  passed).** The user: "At the beginning check free need to immediately navigate to login first login then run the
  check." Every "Check for free" button on the landing page (the navbar, the phone menu, how it works, the free,
  Standard and Pro cards, the business card, the closing band) scrolled back to the hero's website field; now each
  opens the login (`/login?start=check`), and the website field opens it too, with the website carried to the first
  check's step 1 (it went through `/check` and two redirects). The login page says the free check starts right after
  login (three languages); its "Start with a free check" link, which led back to the login, is gone. After the code a
  new account starts its first check and one with projects opens its dashboard (unchanged); already logged in,
  "Check for free" opens the first check for an account without a project, the dashboard otherwise. Looked at in
  headless Chrome on this computer: each button clicked, logged out (Uzbek, Russian, English; desktop and 390px), and
  logged in with a throwaway local account with no project and an account with projects (removed after). Type check
  and linter clean. No new variable, no backend change.

- **Built, waiting for the user's look: paying with Stripe (22 Nov), on the branch `stripe-billing`, not committed; no
  Stripe key yet.** The user: "I have a stripe account … every company will have 7 days free trial"; asked, they chose
  one free report with 7 days to look (no card), the report staying after them with the tracking stopped, and the
  checks paused while a payment fails. `backend/app/billing.py`: Standard and Pro (monthly, or a year for 10 months)
  through Stripe's checkout; the plan paid for, the card, cancelling and invoices on Stripe's billing page; the webhook
  keeps each project's plan, status and "paid until" (new nullable columns on `projects`), reading the subscription
  again from Stripe on every event; the weekly timer reads it again before a check. Enterprise and Managed GEO stay
  by agreement. Tarif: "Choose" opens Stripe, the plan paid for "Manage billing", the billing card "Open billing"; the
  plan's line and the Overview's strip say the trial's days left, its end, a failed payment or an ended subscription
  (three languages). Set up by `python -m app.billing setup` in test mode first, which writes the webhook's secret
  into the server's `.env`. Tests: `pytest` 64 pass (the trial, checkout, signed webhook events, the timer's re-read),
  `-m page` 20 pass; type check and linter clean. Looked at in headless Chrome on the baseline with a placeholder key:
  Tarif in English and Russian on desktop and Uzbek at 390px, the Overview's strip in English and Uzbek at 390px. New
  variables `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (`ENVIRONMENT.md`); new requirement `stripe`. Seen, not
  changed: other pages still offer Telegram (Hisobotlar's "Connect Telegram"); the plan cards' "reports in Telegram" now
  reads "Email and PDF reports" (the user's choice).

- **Built, waiting for the user's look: limits against abuse (22 Nov), on the branch `abuse-limits`, not committed.**
  The user asked for "limits, and stripe integration"; asked, they chose the free checks, login codes and forms, with
  the numbers proposed: per connection 2 free checks, 6 websites read, 5 login codes an hour and 20 a day, 3 request
  forms a day (one a phone a day); for everyone 20 free checks a day (`FREE_CHECKS_A_DAY`, new) and 300 login codes,
  with one email to the team when one is reached. Team accounts aren't counted. The login form says when too many
  codes were asked for (three languages); a refused check reads "No checks left for today"; a form past its limit is
  answered as sent and dropped. Not yet known: which header carries the visitor's address through Vercel (its docs
  don't say for an outside server); the login-code route logs them until the user's own login through the site shows
  it, before Vercel's login is turned off. Tests: `pytest` 60 pass, `-m page` 20 pass; type check and linter clean.
  New table `limit_hits` (locked like the others), new variable `FREE_CHECKS_A_DAY` (default 20). Decided at the same
  time, for Stripe (the user has an account): a 7-day trial with one free report and no card; the weekly checks start
  only with a subscription (Standard or Pro through Stripe, Enterprise by agreement); after the 7 days the report
  stays and the tracking stops.

- **Built, waiting for the user's look: Free Snapshots for a list of prospects (22 Nov), on the branch
  `prospect-snapshots`, not committed.** After "what is next" the user chose "Prospect snapshot command" for the
  demand test, and, asked, "Straight away": no review of the draft, as spec §8 sets for the snapshot. `python -m
  app.prospects <websites.txt>` (on the server) makes for each website the free first check without its screens,
  saves it as a trial project on the team's account, and prints and writes to a CSV each snapshot's link, the
  digest, the cost, the questions and the competitors; a website that has a project is skipped; `--dry-run` prints
  the cost and asks nobody (`backend/README.md`). About $0.6 and five minutes a site on ChatGPT alone. The links are
  usable once Vercel's login is off and `FRONTEND_ORIGIN` is the site's address. Tests: `pytest` 56 pass (a list of
  two made by stand-in assistants, then skipped on a second run), `-m page` 20 pass. No new variable, no new table,
  no paid request.

- **Tried, waiting for the user's look: the first real First Audit check, 3 runs (22 Nov), on the paid project on the
  server; no code change.** After "what is next" the user chose "Real First Audit, ~$2": `python -m app.weekly
  --project <id> --runs 3` asked ChatGPT alone (Gemini paused) its 10 questions 3 times: 30 of 30 answers, each run in
  its own slot, every call told Tashkent as ChatGPT's `user_location` (0.7's first real check), all 30 with a web
  search; 6 of 6 brand questions; $1.42 (the estimate said $2.47, at the last check's price an answer with Gemini),
  306 seconds. On it: the client 1 of 30; a top finding where competitors are named in all 3 runs and the client in
  none; the topics ranked (3 runs give them enough answers). Found: Gemini's writing model refused 5 calls with 429
  (Google's rate limit on the IELTS project's Google Cloud project), the fallback read them; the AI's typing of new
  sites timed out on Gemini and OpenAI's model answered in its place, typing 8 and leaving 5 "unclassified" with its
  reasons (spec §8: the founder types those for a First Audit; each row names `READ_MODEL`, not the model that
  answered); the digest's "biggest change" took one answer either way ("1/30, was 1/10") for a change, as nothing
  said what is material (fixed on the branch `digest-material`, 22 Nov, the user's "Fix both": a change counts at 2
  answers and 10 points; the retry the user also chose was not built, as the typing had not given up); the next 1-run check will say "asked another
  way" against it (the settings include the runs); the report wasn't emailed (no address in Hisobotlar). The
  founder's review, as the user chose: the 5 sites typed by hand (four competitors' sites, one reference), and the
  competitors swapped (BandUp, IELTSbiz and IELTS-CBT, named in none of the 30 answers, out; Axiom, IELTS Ready and
  Sinav Multilevel, 6 of 30 each, in, with their sites where the answers cited them), so the three lead tied at 6/30.
  Left to the user: up to 3 actions (one is generated, a page on a topic), the top question's page against the
  leaders' (no tool), the 7 statements not on the website, and the time the review takes (spec §8: 3 hours at most).

- **Built, waiting for the user's look: the Phase 0 close-out (21 Nov), on the branch `phase0-closeout`; merged, pushed
  and deployed the same day, when the user chose "Commit, push, deploy" (Vercel's build passed; the switch went to
  the server first, before the paid project's Monday check, then `digest.py`; the server's previous `app/` is kept
  as `app.bak-before-closeout`; live, `/health` lists ChatGPT alone and both projects' digests answer, the paid
  project's saying its first check was asked another way).** After the review of Phase 0 the user asked "what is next";
  of the plan they chose the close-out of the three gaps the review found before the demand test, then "Pause it in
  new checks" for Gemini and "Yes, build it" for the evidence cards. (1) Google's terms for Gemini with Google Search
  (Service Specific Terms 20(k); spec §9.3 question 2) allow its answers to be shown only to the person who asked
  and forbid storing, analysing or reselling them: `ANSWER_ENGINES` (new, default `chatgpt,gemini`) is `chatgpt` on
  the server since 21 Nov (deployed alone before the paid project's Monday check; `/health` lists `["chatgpt"]`; the
  previous `app/` kept as `app.bak-before-closeout`); with ChatGPT alone the free check asks it all 10 questions and
  both brand questions, and the competitor search goes to it; Gemini still reads and writes, without Google Search.
  The first check's screens show the assistants `/health` lists; the landing page (hero's pill now "questions asked
  from your customer's city", the sentence, the assistants with Gemini "soon", the steps, the FAQ, the closing
  band, the footer, the plans and their answer counts, the sample brand answers), the login panel, the plan pages
  and the snapshot's call to action name ChatGPT alone. (2) Every evidence card names its channel ("web search on",
  "Google Search on") and its place in the scope card's words, and the answers' CSV has both as columns. (3) The
  digest's biggest change is counted over the questions asked on the same assistant in both checks, and its
  visibility line says when the check before was asked another way. (4) The links prospects open wait for the user
  to turn off Vercel's login, then `FRONTEND_ORIGIN` on the server. Tests: `pytest` 55 pass (the switch, a first
  check on ChatGPT alone, the digest on hand-made checks), `-m page` 20 pass (every evidence card's channel and
  place); the type check and the linter are clean. Looked at in headless Chrome on the baseline: evidence cards in
  English and Russian on desktop and Uzbek at 390px, the landing's top and assistants in English on desktop and
  Uzbek at 390px; nothing wider than the screen, no console error. New variable `ANSWER_ENGINES` (`ENVIRONMENT.md`).
  No new table, no paid request.

- **Built, waiting for the user's look: Phase 0 item 0.9 of the report spec, the template clean-up (21 Nov), on the
  branch `phase0-template`; merged, pushed and deployed the same day, when the user chose "Ship 0.9": the last item
  of Phase 0 (Vercel's build passed; the server's previous `app/` is kept as `app.bak-before-template`; live, the
  paid project's 6 topics are ranked, 4 with enough answers, and its page action still qualifies; the baseline's 10
  are not).** The user: "Ship 0.8, then plan 0.9"; after
  the plan they chose, when asked, the same rule for page actions as for topics. Spec §6.3's topic ranking
  (`metrics.topic_ranking`): a topic gets a standing only with 3 answers, and the topics are counted and ordered worst
  first only when 3 of them qualify, else a line says why (the baseline: 10 topics of 1 or 2 answers, unranked, and
  its "never named in a topic" risk from one answer gone, defect 11); a page about a topic only for a topic of 3
  answers with competitors named and the client never (the baseline's stored one no longer shows). Explicit empty
  states: Sources says "No data: no answer in this check cited a site." in the place of an empty table, and drops the
  sites to get onto (defect 13's other half). The test reader learned the parts React streams inside tables (a row
  of the competitors' table read empty without them). Tests: `pytest` 53 pass, `-m page` 19 pass with two new ones (a
  made-up check with nothing to show says why in each place, and the printed PDF numbers its sections 1 to 14 without
  a gap); no expected failure left; the type check and the linter are clean. Looked at in headless Chrome: Topics and
  the risks register on the baseline in English on desktop and Uzbek at 390px, the empty check's competitors, Sources
  and Topics. New on this computer only: `pypdf` (`requirements-dev.txt`). No new variable, no new table, no paid request.

- **Built, waiting for the user's look: Phase 0 item 0.8 of the report spec, the Free Snapshot and the Telegram
  digest (21 Nov), on the branch `phase0-snapshot`; merged, pushed and deployed the same day, when the user chose
  "Ship 0.8, then plan 0.9" (Vercel's build passed; the server's previous `app/` is kept as `app.bak-before-snapshot`;
  `demo_requests.about` added at start; both live projects' digests and snapshots answer).** The user: "Ship 0.7, then plan 0.8"; after the
  plan they chose, when asked, a request button with no price, today's free check as it is asked, and the digest in
  Hisobotlar, on the snapshot and in the report's email. The snapshot, `/<lang>/snapshot/<first check's id>` (no
  login): what was asked ("10 buyer questions · ChatGPT 5 + Gemini 10 · 1 run") and the single-run note, who holds
  each question (`metrics.shelf`: on the baseline competitors 1, nobody 9), who appeared (`metrics.providers`: every
  tracked brand with its count, then the most named others, "unverified"), the top finding, the First Audit's parts
  locked, and "Ask for the First Audit" (a name and phone, emailed to the team as a demo request with `about`, a new
  nullable column). One A4 page in print. The digest (`app/digest.py`): six lines in the client's language, every
  number from the data object, the check before for the change, the plan's first open action with its owner; in
  Hisobotlar with Copy, under the snapshot, and opening the report's email. Found and fixed on the way: `main.py`
  already had a function called `digest` (a hash), which hid the new module. Tests: `pytest` 51 pass, `-m page` 17
  pass: no expected failure is left. Looked at in headless Chrome on the baseline: the snapshot in English and
  Russian on desktop, in Uzbek at 390px and printed (one page), Hisobotlar in Uzbek on desktop and Russian at 390px;
  nothing wider than the screen, no console error. No new variable; one new column, no paid request.

- **Built, waiting for the user's look: Phase 0 item 0.7 of the report spec, the customer's location on every
  assistant call (21 Nov), on the branch `phase0-location`; merged, pushed and deployed the same day, when the user
  chose "Ship 0.7, then plan 0.8" (the server's previous `app/` is kept as `app.bak-before-location`; the paid
  project's next weekly check is the first asked this way).** The user: "Ship 0.6, then plan 0.7";
  after the plan they chose, when asked, the market's main city for a project without one, and one test call to
  Gemini. `app/places.py`: every call is told a city (the project's, else Tashkent, Almaty or Bishkek) and the
  time zone; ChatGPT as its `user_location`, Gemini on Vertex as its grounding's latitude and longitude besides the
  sentence it had. The test call, from a copy on the server away from the live service: accepted, 12 cited pages,
  searches about Tashkent, $0.035. The slot log records how each call was located (`lat_lng` for Gemini now); a
  check made before keeps what it was told. Tests: `pytest` 46 pass and 1 expected failure (0.8); `-m page` 16
  pass and 1 expected failure (0.8). Not looked at in a browser: no check has been made with it yet, and the scope
  card's wording for it is the one ChatGPT's location already used ("asked as from Tashkent, Uzbekistan"). No new
  variable, no new table; one paid request ($0.035).

- **Built, waiting for the user's look: Phase 0 item 0.6 of the report spec, several runs of each question
  (21 Nov), on the branch `phase0-runs`; merged, pushed and deployed the same day, when the user chose "Ship 0.6,
  then plan 0.7" (Vercel redeploys on the push; the server's previous `app/` is kept as `app.bak-before-runs`; the
  daily timer still runs one run a question).** The user: "Ship 0.5, then plan 0.6"; after the plan they
  chose, when asked, three runs for the First Audit only, by hand, and on paper the key questions in full when a
  check has several runs. `python -m app.weekly --project <id> --runs 3` asks each question 3 times on each
  assistant (1 to 5), after printing the planned answers and their likely cost at the last check's price an answer;
  each run is planned and closed in its own slot, and the report counts over every run (the scope card's "× 3 runs",
  the headline, coverage from one run, the top finding's answers across runs, "run 2 of 3" on each answer). Weekly
  checks stay at `RUN_SAMPLES` (1). Tests: `pytest` 42 pass and 1 expected failure (0.8), with a 3-run check made by
  stand-in assistants (12 slots, every count over them); `-m page` 16 pass and 1 expected failure (0.8); the type
  check and the linter are clean. Looked at in headless Chrome on the baseline copied as three runs in the look's own
  database: the scope card, the summary with its top finding of 6 answers, the evidence section in Uzbek at 390px and
  as print (the competitors' question in full for every run, the others by their beginning); the PDF stays at 26
  pages with 45 answers. Not done: a real 3-run check (about $5 on the paid project, the user's choice). No new
  variable (`RUN_SAMPLES` now says how runs are asked for a First Audit), no new table, no paid request.

- **Built, waiting for the user's look: Phase 0 item 0.5 of the report spec, evidence for every finding and the
  answers as a CSV (21 Nov), on the branch `phase0-evidence`; merged, pushed and deployed the same day, when the
  user chose "Ship 0.5, then plan 0.6" (Vercel's build passed; the server's previous `app/` is kept as
  `app.bak-before-evidence`; both live projects' reports open with a top finding of 2 answers where competitors
  appear and the client doesn't).** The user: "Ship 0.4, then plan 0.5";
  after the plan they chose, when asked, every answer in full in the PDF too. `metrics.top_finding` picks the
  report's top finding (spec §4.1, §4.14): the buyer question where tracked competitors are named in the most
  answers and the client in none (else beside it, else the client alone, else the open shelf). On the baseline:
  one Russian question with 2 answers, the two tied rivals named, the client absent. Every
  buyer answer is numbered (A1…); the summary's top finding shows each answer's passage and opens the whole answers;
  each entry of the risks register names its answers as links; a new section 14, "Evidence", has every answer in
  full, word for word, with its cited pages and the assistant, model, date and web search, and "Answers as CSV".
  Paper: the answers print in a smaller type and two columns; the PDF of the baseline is 26 pages (17 after 0.2;
  41 with the answers in the screen's type, more than the 5 extra pages first estimated). The test harness learned
  two things (`backend/tests/README.md`): it places the parts React streams late, as a browser does, and its
  percentage check leaves out quoted answers. Tests: `pytest` 40 pass and 1 expected failure (0.8); `-m page` 16
  pass and 1 expected failure (0.8); the report's own 49 percentages stand beside their count (3 more are inside
  quoted answers); the type check and the linter are clean. Looked at in headless Chrome on the baseline: the
  summary in English and Russian on desktop, opened and closed, and as print; the risks register; the evidence
  section in English on desktop and as print, in Uzbek and Russian at 390px; two printed PDF pages; nothing wider
  than the screen, no console error. No new variable, no new table, no paid request.

- **Built, waiting for the user's look: Phase 0 item 0.4 of the report spec, a type for every cited site and
  the actions a type allows (21 Nov), on the branch `phase0-domain-types`; merged, pushed and deployed the same day,
  when the user chose "Ship 0.4, then plan 0.5" (Vercel redeploys on the push; the server's previous `app/` is kept
  as `app.bak-before-domains`).** The user: "commit, push,
  then plan 0.4"; after the plan they chose, when asked, the AI's typing in every new check plus once now on the two
  live projects, and routes only from our checked list or their review. `app/domains.py` (a new table
  `domain_types`) gives each cited site the spec's type (§4.6), its control, the route onto it and who typed it:
  the project's own sites, a review by hand (`python -m app.admin domain`), the seed list (spec §9's sites, the
  platforms' help pages, social networks, Telegram, search engines; every route opened and its page read: 2GIS's
  forms for Uzbekistan and Kazakhstan, Golden Pages, Uzum, Kaspi, lalafo, Google's business profile, two editors'
  contacts), the AI's answer (`automated`, once a site and project at the end of a live check, never a route),
  else `unclassified`. Actions follow §7: "get listed" only on a directory, media, UGC or Telegram site with a
  route, a competitor beside it and the client not there; an untouched one that no longer qualifies stops showing
  at once. The report's Sources: the sites by type, "Sites you can get onto" with each route, every cited site
  with its type, control and the competitors beside it; the risks register's listings read the targets at their
  action's impact (defect 4's other half); the method and the glossary explain the types; the other pages keep six
  kinds worked out from the types, so support.google.com is no longer a directory anywhere. On the baseline
  without the AI: the two help pages are platform docs, the two tracked rivals' sites competitors' sites, 22
  unclassified, no site to get onto, and its support.google.com action gone. Found on the way and fixed: on a
  phone the sources table's last column ran off its card (it did in 0.3 too); its columns are fixed now. Tests:
  `pytest` 37 pass and 1 expected failure (0.8); `-m page` 15 pass and 2 expected failures (0.5, 0.8); all 49
  percentages on the baseline report stand beside their count; the type check and the linter are clean. Looked at
  in headless Chrome on the baseline (with one site typed by hand and one by a stand-in AI, in the look's own
  database): the Sources in English on desktop and as print, Russian on desktop and phone, Uzbek on phone, and
  Hisobotlar's copy in Uzbek on desktop and phone; nothing wider than the screen, no console error. Deployed: the
  server made `domain_types` at start, locked like the others; then the AI typed the two live projects' latest
  checks once, as approved ($0.018 in all, more than the "under a cent" first said: $0.0135 for the paid project's
  48 unknown sites, $0.0046 for the baseline's 22). The paid project: 45 competitors' sites (its category's other
  preparation platforms and the test administrators' portals), 2 media, 3 reference, 2 platform docs, 1 social, 1
  unclassified, its own site; the baseline: 24 competitors' sites and 2 platform docs. Neither has a site to get
  onto (the AI's media sites have no checked route). No new variable; one new table.

- **Finished, confirmed by the user on 21 Nov: Phase 0 item 0.3 of the report spec, every percentage beside its
  count (21 Nov); merged, pushed and deployed with step 1, 0.1 and 0.2 (the branch `phase0-wave-object`) the same
  day, when the user chose "commit, push" and then to deploy the backend with it, since a push to `main` redeploys
  the site on Vercel (its build passed; the server's previous `app/` is kept as `app.bak-before-phase0`).** The user: "start 0.3";
  after the plan they chose, when asked, to move the sections it touches to the data object. One rounding rule,
  `metrics.share` (a whole percent, half up), mirrored by the frontend's `shareOf`; every percentage in the report
  goes through `Share` ("2/7 · 29%", with its count marked). The data object now carries each cited site's kind
  (`domains`, today's typing until 0.4), and the metrics count each assistant, each topic and question language
  (the competitors named most with ties), each cited site (once an answer, over the answers that cite any site,
  spec §6.3: the most cited site is 2 of 7, it read 13% of all 15) with the sites split in sites (24 of 26 don't list the
  client, 92%: it read "24 sites · 91%", a share of citations beside a count of sites, defect 7), and the
  brand-question check's verdicts. Each AI assistant, Topics, Sources and the risks register read them (the register
  speaks in counts, never a percentage); a done action's "what it changed" shows its counts (`proof.counts`).
  Accuracy's part B is the brand facts block, labelled as a separate check not counted among the buyers' answers,
  with verified 10, contradicted 0, unverified 8 (defect 8); "outdated" is said not to be checked yet. Defect 10
  went with 0.2. Tests: `pytest` 31 pass and 1 expected failure (0.8); `-m page` 14 pass and 3 expected failures
  (0.4, 0.5, 0.8); every one of the baseline report's 30 percentages stands beside its count; the type check and
  the linter are clean. Looked at in headless Chrome on the baseline: the changed sections in English on desktop
  and as print, in Russian on desktop and in Uzbek at 390px (nothing wider than the screen, no console error).
  Seen and left: a topic counts as lost when a competitor is in half its answers, so a topic of 2 answers with one
  rival mention is a high risk from one answer; the topic rules are 0.9's. Not changed: the visibility chart over checks (from a second
  check; Phase 1's change log), the app pages outside the report. No new variable, no new table.

- **Finished, confirmed by the user on 21 Nov: Phase 0 item 0.2 of the report spec, counts in the place of the
  0–100 score (21 Nov); merged, pushed and deployed with step 1, 0.1 and 0.3 (`phase0-wave-object`).** The user: "start 0.2";
  after the plan they chose, when asked, counts with no status for the five areas, and the client's citation rate
  over the answers that cite a site (spec §6.3). `app/metrics.py` adds `visibility` (the headline: 0 of 15 buyer
  answers on the baseline, "small sample" under 20, 0 of 10 questions, 0 of 7 answers citing a site) and `brands`
  (every tracked brand's count; ties share a rank, so the two rivals named once are "tied 1st" and nobody leads; tone
  per mention, a word only from 3 mentions, N/A at none; a place only from a numbered list, so both rivals, named in
  a bulleted list of 30, have none; share of voice only from 10 mentions, 2 on the baseline). The score is gone
  from the report's API (`conditionHistory`), the report (the gauge, the area bars and statuses, the section tags,
  the contents' dots), Hisobotlar ("Why 40?", the register's score and marks), the project cards, the landing page's
  sample report and the email. The summary is now `HeadlineSummary` (the count beside the five areas by their
  counts), the key figures and the competitors' table read the metrics, tone is never a number, the risks follow
  the tie and tone rules, the method states the thresholds, the definitions were rewritten without the score.
  The report's `history` carries each check's answers and those naming the client (the register, the cards).
  Tests: `pytest` 25 pass and 2 expected failures (0.3, 0.8); `-m page` 12 pass and 5 expected failures (0.3, 0.4,
  0.5, 0.8); 0.3's "every brand with its count" and 0.9's glossary test now pass too and lost their marks; the type
  check and the linter are clean. Looked at in headless Chrome on the baseline: the report in the three languages on
  desktop and at 390px (nothing wider than the screen), the PDF's first two pages (17 pages; the summary opens page
  2 whole), Hisobotlar and a report's page in Uzbek on desktop and phone, the dashboard's card, the landing page's
  sample report; no console error. Found and fixed: Chrome has no Uzbek list rules, so names joined in the browser
  read "и" and broke hydration; names are joined with our own "va", "и", "and". Found, not fixed: the landing
  page's top bar in Russian is 429px wide on a 390px phone (before this work). Not changed: the Overview and the
  other pages keep share of voice, tone out of 100 and place until they move to the object; "what changed" from a
  second check (the change log, Phase 1); the topic ranking rule (0.9); the platform-docs action (0.4). No new
  variable, no new table.

- **Finished, confirmed by the user on 21 Nov: Phase 0 item 0.1 of the report spec, the slot log, the data object
  and the scope card (21 Nov); merged, pushed and deployed with step 1, 0.2 and 0.3 (`phase0-wave-object`).** Built in a session
  that ran out before writing it up; looked at and recorded the same day, when the user chose "Finish 0.1". The
  slot log (`app/slots.py`, a new table `slots`) writes every call a check plans to an assistant before anything
  is asked and closes it as completed, failed or excluded with why; a check made before the log has its slots
  rebuilt when read (`reconstructed`), so the baseline shows 20 slots, 15 completed and 5 excluded with no write
  to the live database. The data object (`app/wave.py`) and its metrics (`app/metrics.py`) are served by
  `GET /projects/{id}/waves/{runId}` (`backend/README.md`, "The slot log and the data object"). Under the
  report's title the scope card (`scope-card.tsx`, spec §4.0) takes the place of the four-fact table: the check,
  each assistant with its model, its surface, the place it was told and how many answers searched the web, what
  isn't checked yet, the questions, the answers planned against completed, excluded and failed with why, the
  answers by language, the brand questions apart, the brands; the method section reads the same numbers. It
  names each model, as spec §4.0 asks (point 14 of 17 Nov had taken model names out of the report). Tests:
  `pytest` 17 pass and 2 expected failures (0.3, 0.8); `-m page` 6 pass and 11 expected failures (0.2–0.9);
  the type check and the linter are clean. Looked at in headless Chrome on the baseline (the tests' own servers
  and database): the shared report in Uzbek, Russian and English on desktop and at a true 390px (nothing wider
  than the screen), the PDF's first page (16 pages), the method section, and Hisobotlar's copy in Uzbek on
  desktop and at 390px. The rest of the report still has the 0–100 score and the 50s: item 0.2. Deployed on
  21 Nov: the server made the `slots` table at start, locked on Supabase like the others (row level security on,
  no rights for `anon` and `authenticated`), and both live projects' checks read as rebuilt slots (the paid
  project's weekly check 20 of 20 completed, the baseline 15 completed and 5 excluded). No new variable.

- **Built, waiting for the user's look: Phase 0 step 1 of the report spec, the test harness (21 Nov); merged,
  pushed and deployed with items 0.1–0.3 (`phase0-wave-object`; the branch `phase0-harness` holds no commit of its own).** The user: "start step 1", after the plan for spec §2's Phase 0 (ten
  steps, this one without a product change). `backend/tests/` (`backend/tests/README.md`): the baseline client's
  first check exported read-only from the server into `backend/tests/fixtures/` (ignored by git, as are the spec
  and its go-to-market companion: they name a client), loaded into a fresh SQLite database with every key
  blanked, so no test reaches the server, an assistant or an inbox. `.venv/bin/python -m pytest` checks the data
  and the backend (12 pass: the fixture is the panel of spec §3.3, and today's code still shows what the audit
  found; 3 of §11.1 are expected to fail); `-m page` starts a backend and a frontend dev server of its own on the
  fixture and reads the English report (1 passes: the page shows the audited defects; 13 of §11.1 are expected
  to fail; 2 pass and stay as guards, since today's page numbers its sections without gaps and has no empty
  heading, so the audit's defect 13 doesn't come from it). Each expected failure names the Phase 0 item that
  makes it pass. Found on the way: the audit's failed ChatGPT slots were never planned (the free check asks
  ChatGPT half the questions), most of the baseline's Gemini answers ran no web search, and a project without a
  city was asked from its country alone. New: pytest (`backend/requirements-dev.txt`, this computer only). No new
  variable.

- **Built, waiting for the user's look: Savollar made simple (18 Nov), on the branch `savollar-simple`; merged,
  pushed and deployed on 19 Nov with `full-screens`, when the user said "commit, push and deploy" (Vercel's
  build passed).** The user, with a screenshot of the page on a real project: "is somehow messy and UI design is not
  structurally correct". What was wrong: three rows of tools and a notice before the first question, a topics
  column for seven topics of one or two questions, and a table of fourteen columns that scrolled sideways, mostly
  dashes and "0%", the businesses named as initials ("B", "I") and the leader cut ("British Coun…"), "Archive
  all" always at the foot. Asked with two pictures, the user chose "simple, like Harakatlar". Now: one row of tabs
  and buttons (the rare ones in a ⋯), one row of tools with the topic as a filter, one sentence on where the
  client stands, and four columns (the question with its language, topic, wrong facts and tags under it; "Sizni
  tilga oldi" as "0 / 1"; "Kimni tilga oldi" with the names written out; a ⋯ for edit, tags, fact-checking and
  archive); the rest is on the question's page and in the CSV; the footer only with rows picked
  (`frontend/CLAUDE.md`, prompts). The page's tour follows the new order. The topics column
  (`topics-column.tsx`) and its cookie are removed. Looked at in a browser on this computer in Uzbek on desktop
  and phone width and in Russian on desktop, with both menus opened. Not tried: the Suggested and Archive tabs on
  a project that has some, adding a tag from the ⋯, English. No new variable.

- **Built, waiting for the user's look: full-height screens for the first check and the login, and the
  dashboard's buttons filled (18 Nov), on the branch `full-screens`; merged, pushed and deployed on 19 Nov, when the
  user said "commit, push and deploy" (Vercel's build passed).** The user: "The page must
  be made full page not scrolling" (the setup's step 2 and a check's page, `?run=`), "login all of them must be
  done full page so buttons must be always visible", and "Inside of Dashboard the buttons must be background
  colored, green chosen or black … cancel buttons must be appropriately colored background". Asked, they chose
  black, in the dashboard only. Now every screen of the first check and the login is exactly the window's
  height, with its buttons in a bar at the foot that never leaves the view and only the content scrolling;
  the statistics' two save buttons became one in that bar. In the workspace the main buttons are black and
  Cancel, Back, Decline and the other secondary ones a filled warm gray, its windows included; the public pages,
  the login and the first check keep navy (`frontend/CLAUDE.md`, "Our look", "Buttons"). Looked at in a browser
  in Uzbek on this computer: the login on desktop, a 620px-high window and a phone; the first step and the
  statistics on desktop and phone; Harakatlar and Savollar. Not looked at: the live results (no check running),
  a setup step past the first, Russian and English. No new variable.

- **Built, waiting for the user's look: the landing page's indicator and the sentence with chips (18 Nov), on
  the branch `hero-indicator`; merged, pushed and deployed the same day, when the user said "commit, push and
  deploy" (Vercel's build passed), after the docs brought up to date (`docs-current`).** The user, with two other products' heroes and an indicator as
  the pictures: "Put the Indicator for the top of main text", "Sub text make as in the screenshot, but
  appropriately of our, but not many text, and style make the same". Over the headline, in the place of the
  small mono label, a pill: a dark badge "Jonli" (ru "Новое", en "New") with the live green dot (it rings four
  times and rests), a sparkle, "Gemini kuzatuvi qoʻshildi" and an arrow; it opens the assistants' section. The
  picture's text, Google AI Overviews tracking added, would be untrue: Google's AI answers are "tez orada". The
  sentence is now one short line with three chips (our own icon and the app's name: Tilga olinish, Oʻrni,
  Manbalar), in the three languages (`frontend/CLAUDE.md`, "Our look"). Looked at in a browser in Uzbek and
  Russian on desktop and in Uzbek and English at 390px. Then ("main text make it less"): the headline is
  smaller, 64px on a wide screen (was 84), 48 from `sm` (was 60), 32 on a phone (was 36). No new variable.

- **Built, waiting for the user's look: a real PDF download for reports (18 Nov), on the branch `report-pdf`;
  merged, pushed and deployed the same day, when the user said "push deploy everything in main branch" (Vercel's
  build passed; the server's previous `app/` is kept as `app.bak-before-pdf`; its `/health` says `"pdf": false`
  until Chromium is installed).** The user: "pdf download is not working, there are no pdf download button". Every PDF button
  opened the browser's print dialog, which phones and Telegram's browser often can't use. Now "PDF yuklab olish"
  on the shared report, Hisobotlar's latest report, a report's page and each row of the register downloads a PDF
  file the backend makes (Chrome prints the report page; by the report's link; kept until the project changes),
  and falls back to the print dialog wherever the backend can't (`/health` `pdf`). Tried on this computer: the
  file downloads (8 A4 pages, 6.5 s the first time), the fallback shows when the server can't. **On the live site
  it can't work yet**: the server has no Chrome, its `FRONTEND_ORIGIN` is `localhost`, and every Vercel address
  of the site asks for a Vercel login, so the server can't open the report page (nor can a client who gets a
  report's link). Asked, the user chose: turn off Vercel's login (theirs to do in Vercel), and not yet to
  Chromium on the server; until it is installed the buttons open the print dialog. No new variable.
- **Built, waiting for the user's look: the report without the reader's signature (18 Nov), on the branch
  `report-pdf` (it was `report-no-signature`); merged, pushed and deployed with the PDF download.** The user: "from report need to remove the signature for bosses
  part". The sign-off keeps who prepared the report and when; the lines for the reader to sign (signature,
  name and date) are gone, in the shared report, a report's page in Hisobotlar and the PDF alike.

- **Built, waiting for the user's look: Notoʻgʻri faktlar rebuilt (18 Nov), on the branch `wrong-facts-rebuild`;
  merged, pushed and deployed the same day, when the user said "commit, push and deploy" (Vercel's build passed).** After "what is next" the user chose it of four (their list of 17 Nov: "wrong facts … must be
  analyzed carefully"). Analyzed on the live paid project: its latest check held about 70 statements from the
  brand answers (about 49 matching the website, 20 not on it, 1 against it), and the page showed the one wrong
  fact as a table under three numbers, and "not checked yet" for any project without typed facts though its
  brand answers had been checked against the website. Now: a summary (one sentence, the three as a bar, how
  each assistant knows the business, what it was checked against), the wrong ones as cards with the truth, the
  assistant, the question and "How to fix" opening their action, then what AI says that the site doesn't, by
  topic, and what it gets right, folded (`frontend/CLAUDE.md`, wrong-facts). Looked at in a browser in Uzbek on
  desktop and phone width with made-up brand answers on the local sample project, removed after. Not tried:
  Russian and English, the live project's own data in the page. No new variable.

- **Built, waiting for the user's look: the logo as two rounds (18 Nov), on the branch `logo-rounds`; merged,
  pushed and deployed the same day, when the user said "commit, push and deploy" (Vercel's build passed; the
  server's previous `app/` is kept as `app.bak-before-rounds`).** The user: "I don't like the brand logo, eye, I need the same as in the screenshot but rounds
  instead", with Peec's mark (two stacked bars and "Peec AI") as the picture. The mark is now two solid rounds,
  a small one rising above and to the right of a large one, flat, in the text's color; the name beside it in
  one color, semibold (it had "AI" in blue). Our own shape and colors: the project's rule is never to copy
  Peec's logo. The favicon, `icon.svg` and the phone's icon are the rounds in white on the navy tile; the
  login panel draws them huge and faint; the emails' header writes the name in one color. No new variable.

- **Built, waiting for the user's look: Harakatlar made simple (17 Nov), on the branch `actions-simpler`;
  merged, pushed and deployed the same day, when the user said "commit, push and deploy" (Vercel's build passed).** After "what is next" the user chose Harakatlar of four ("logic is good, but UI is not very
  understandable"). Same logic, a plainer screen: the statuses as tabs with their counts, how far the plan has
  come, the three most effective actions to do first as cards with the evidence behind each and Start, then
  the rest as a flat list narrowed by goal; every row carries its one next step (start, done, reopen, restore)
  and a done one what it changed; the opened action is as before, without the line that said "ChatGPT" (an
  action serves every assistant). Gone: the status, filter and grouping menus, the goal tiles, the tree and the
  boxes to pick rows. Looked at in a browser in Uzbek on desktop and phone width on this computer, Start tried
  (the toast, the tab, the action opened beside the list). Not tried: Russian and English. Also that day, asked:
  the paid project's six brand questions on the server rewritten in the one-question style (the trial project
  on the server keeps the old ones). Then, the user: "make a prompt for the user that can be collapsed or copied and
  put into their Claude or coding AI … or the post can be just recommended": every opened action has "AI bilan
  bajaring", the task for the owner's own AI written for its kind of work (a site fix for a coding AI or a
  developer, a page, a correction, a listing's profile, letter or post), with the business's facts and its
  customers' questions, folded with Copy; the top "Copy for AI" copies the same. Written by the frontend from
  the data, no paid request; the post itself is written by the owner's AI, not by us. Looked at in a browser in
  Uzbek for a post and a page. No new variable.

- **Built, waiting for the user's look: the name Seenova AI and its logo (17 Nov), on the branch
  `feedback-17-nov`; merged, pushed and deployed the same day, when the user said "commit, push and deploy".** The user: "change the logo, Seenova AI the branding, and make the logo
  appropriately". Every text that named the product says Seenova AI in the three languages (titles, the
  report's letterhead and sign-off, the assistant panel, support, the footer, the emails' sender, subjects and
  headers); "GEO" stays as the practice's name ("What is GEO?", "Managed GEO"). The mark is an eye whose pupil
  is a gold star (`frontend/CLAUDE.md`, "Our look"), in the app's header, sidebar, login, first check, report
  and pilot report, and as the favicon (Next's default one until now), `icon.svg` and the phone's home-screen
  icon. The login panel became the brand's navy with the eye drawn faint behind it, and its claims were made
  true (ChatGPT and Gemini, a report after every check by email; it said ChatGPT alone, three answers a
  question and reports in Telegram). Two other directions were drawn for the user to compare (the answer's
  lines with a star; a star rising over an arc). No new variable: emails come from "Seenova AI <SMTP_USER>".

- **Built, waiting for the user's look: the first part of the user's list of 17 Nov (sixteen points), on the
  branch `feedback-17-nov`; merged, pushed and deployed the same day, when the user said "commit, push and
  deploy" (a production build passed first; the server's previous `app/` is kept as `app.bak-before-speed`;
  measured on the live service after: the report 2.06 s the first time, then 0.13 s; the actions and the
  session check 0.13 s).** Done from the list: (6) the login page no longer stands empty
  for seconds: with a session cookie `proxy.ts` sends `/login` straight on, an ended session comes back as
  `/login?expired=1` with a line saying so, and without a cookie the backend isn't asked; (8) speed: measured
  on the server, one database statement costs 0.12 s (Supabase is in Mumbai, the server in Germany) and
  opening a connection 2 s; the backend now skips BEGIN/ROLLBACK on reads, checks a pooled connection only
  after it rested two minutes, keeps a session a minute and a report or the actions until the project
  changes (`app/cache.py`): the report 3.4 s → 0.14 s, actions 2.0 s → 0.14 s, the session check 0.56 s → 0.14 s
  (tried on the server as a second instance, the live service untouched); the workspace layout asks for the
  user and the projects together; `frontend/vercel.json` puts Vercel's server in Frankfurt (it was
  Washington); (13) one field style (`ui/field-style`) for inputs, text areas, the filter chips and a new
  `Select` (Base UI) in the place of all eight browser selects; there is no date field in the app; (14) no
  model name in the method line, the report or the pilot report, and no "API"; (9) the general brand
  question is one plain question ("… haqida nima bilasiz?") and the writing rules ask for one thing per
  question, short, naming businesses, with good and bad examples (not tried: a paid request); (1) loading:
  skeletons shaped like a data page with a light passing over, a bar across the panel from a click until
  the page is there, the check's navy screen in motion (an orbit, questions running to the assistants,
  ripples, the stage under way turning), the live results with a bar, the website's reading with outlines
  of what comes; (7) in the chart's large window (Dinamika), the client's dot and line are drawn on top,
  dots of equal value side by side, each end number with its color, and "since last week" became "since the
  previous check" (two checks a day were called a week); (2) Hisobotlar has "Why 40?": the five areas as
  points out of 20, then what costs points, the costliest first, each with its fact and the open actions
  that raise it; the project cards name the two lowest areas; report (1–2): a new section 4 "Each AI
  assistant": each assistant's share over its own answers beside whom it names most, a line that Google's
  AI Overview isn't checked yet, and what each says about the business, every statement against the
  website. Then, asked with three choices, the user chose: the database to a Supabase project in Frankfurt
  (theirs to create), Manbalar first, and one paid request. The request: the new rules on the user's own
  site, $0.009, 27 seconds: ten customers' questions and four brand questions, each asking one thing. (10)
  Manbalar now opens on where the client is missing ("AI keltirgan havolalarning 82% qismi — siz yoʻq
  saytlar"), the citations as one bar by whom they work for, and the three sites to get onto first with the
  way onto each; the table has "are you there?" as a filter and a column with "Qoʻshilish"; the chart and
  what changed come last, from the second week and the second check (`frontend/CLAUDE.md`, sources). Looked
  at in a browser in Uzbek on desktop and phone width on this computer. Not done, waiting for the user: report
  (3–4) and the pages Savollar (5), Notoʻgʻri faktlar (11), Harakatlar (12); the Supabase project in
  Frankfurt; deploying. No new variable.

- **Built, waiting for the user's look: the new screens gone through in Russian and English and at phone
  width (17 Nov), on the branch `languages-and-phone`; merged and pushed the same day, when the user said "commit, push and
  deploy" (no backend change to deploy).** After "what is next" the
  user chose "languages and phone" of four. The whole flow was walked in a browser twice on a replayed check:
  in Russian at phone width and in English on desktop, from the first step to the saved project's questions
  and plan pages, with every screen measured against the window (none is wider than it). Corrected: numbers
  now take their word's right form in Russian and English ("in 1 answer", "в 1 ответе", "2 ответа"); an
  assistant we ask that didn't answer a check no longer reads "soon" in the pages' switcher (it was Gemini
  on a project checked on ChatGPT alone); the plan page and the cancel message said "write to us in
  Telegram", which we have no account for, and now say email; "other spellings" spoke of ChatGPT alone.
  Seen and left: the business's own texts (description, services, topics) stay in the language of its
  country, so an English page shows Russian ones for a business in Uzbekistan; on a phone the statistics'
  businesses table scrolls sideways inside its card for its last column, and the questions page's foot
  button is cut ("archive all"); the old setup wizard, which only sample data opens, still says ChatGPT.
  Not walked: Uzbek at phone width past the questions step, a real check. No new variable.

- **Built, waiting for the user's look: results that fill in while the check runs (17 Nov), on the branch
  `live-results`; merged, pushed and deployed the same day, when the user said "commit, push and deploy".** After "what is next" the user chose "live results" of four:
  the one part of their pictures left unbuilt. A running check now publishes what it has after every answer
  (`firstrun.partial_of`, `GET /first-runs/{id}/partial`): who the answers in hand name, the cited sites and
  pages, the answers' beginnings. The page shows the navy screen until the first answer, then the headline,
  "still collecting · 4/15 answers" and the four tabs filling in; the finished statistics take its place
  (`frontend/CLAUDE.md`, "The first check's screens"). Looked at in a browser in Uzbek on desktop and phone
  width on a replayed check, which now hands its saved answers out one by one. Compared on a saved check:
  the live count and the final one agree for the client and the leader (6 and 6); a competitor the answers
  write another way than its name was 0 live and 4 at the end. Not tried: a real check, Russian and
  English. No new variable; the table gains a column (`first_runs.partial`), added at start.

- **Built, waiting for the user's look: the first check's screens laid out as the user's pictures (16 Nov),
  on the branch `setup-like-screens`; merged, pushed and deployed the same day, when the user said "commit,
  push and deploy".** The user sent the same pictures again:
  "why you have not made our first setup as attached images". The honest answer: the first time only their
  order was taken (confirm, then check) and our old two-column wizard was kept. Now each screen follows
  its picture, in our navy and words (`frontend/CLAUDE.md`, "The first check's screens"): the navy panel
  with our name at the left and the step at the right; step 1 with the company's name, website, country
  and the questions' language; step 2 short, the rest folded; the competitor rows; the questions as
  numbered cards with a pencil and a bin; the check on a navy screen with the assistants on a ring; the
  statistics under a headline with four tabs. The backend takes the company's name with the website
  (`POST /first-runs` `name`). Looked at in a browser in Uzbek on desktop, the questions step at phone
  width, in replay mode. Not tried: a real check through these screens, Russian and English, the tabs at
  phone width. Not built: results that fill in while the check runs (the pictures' "still collecting").
  No new variable.

- **Tried, waiting for the user's look: the first real weekly check (16 Nov); its corrections on the
  branch `first-weekly-check`; merged, pushed and deployed the same day, when the user said "commit, push and
  deploy".** After "what is next" the user chose "first paid weekly
  check" of four. The server had no project, so one was made the real way under the user's account: their
  own site through the new four-step flow on the live backend (the first time ChatGPT and Gemini answered
  together in it, and the first competitor search on Gemini), saved as a project, switched to paid Standard
  by hand (`app.admin`), then `python -m app.weekly --project`. It worked: 20 answers of 20, a second point
  on the charts, a wrong fact, two fixes, the next check's date. The numbers and what they do to the prices
  are in `backend/PLAN.md`, change log: $0.84 the first check, $1.63 the weekly one, about seven minutes.
  Corrected from it: the competitors' icons were lost between the check and the project (this one is on the
  server already, copied there before the weekly check); a site sharing one word with a competitor's name
  was counted as that competitor's, and the pages said "2–3 minutes" for a check that takes four to five
  (these two went out with the push). Not looked at: the project's pages in a browser on the live site (the
  user's to open). Found and not done: AI assistants named among the untracked brands; a paid project's
  report is emailed to nobody until an address is set in Hisobotlar, and has no PDF until the server has a
  browser. That project stays on the server, paid: the timer will check it every Monday at about $1.63
  until it is switched back (`python -m app.admin plan <id> start --trial`).

- **Built, waiting for the user's look: the review's four fixes (16 Nov), on the branch `searched-competitors`
  with the competitor search; merged, pushed and deployed the same day (the user said "yes" to "shall I do
  these four? The competitor search would go out with them in the same push and deploy").** The user asked
  for the whole flow reviewed: "login, projects, each project competitors, prompts used, gemini and chatgpt
  as initial responses then it is paid plan available". Walked in a browser on this computer; what was wrong
  and is now changed: (1) every new project got a free check, against the rule of 15 Nov: now one free check
  an account, a second website answers "your free check has been used" (not bound: an account paying for
  Enterprise, our own in the new variable `TEAM_EMAILS`, replay mode); (2) a plan request only reached the
  server's log: it is now emailed to us with the command that switches the plan on, and the page says we
  answer by email (it said Telegram or phone); (3) the plan page said one assistant and Savollar told a free
  project to add 20 questions: now two assistants, and a note that added questions are asked once a plan is
  on; (4) the first check's competitor step follows the user's screenshots: a row each with the site's icon,
  the name and website to correct, ✕ to remove. Tried: the free-check rule and the plan email by script (the
  email caught, not sent), the competitor step in a browser in Uzbek on desktop and phone width, the icon
  finder on real sites. Not tried: the icons in a browser (replay has none), a real plan request's email, a
  second website refused on the live site, Russian and English. Still true: there is no payment; a plan is
  switched on by hand (`python -m app.admin plan`). New variable: `TEAM_EMAILS` (`ENVIRONMENT.md`).

- **Built, waiting for the user's look: competitors found by a web search (16 Nov), on the branch
  `searched-competitors`; merged, pushed and deployed the same day with the review's fixes above.** After "what is next" the user chose "better
  competitors" of four. Step 3 of the first check listed what the writing model recalled, which could be
  wrong. Now, while the website is read, one assistant with web search (Gemini when it can be asked, else
  ChatGPT) is asked who the business competes with in its country; the answer is read into names and
  websites, a website is kept only when it opens, and the recalled list fills in only when the search finds
  fewer than three (`backend/README.md`). Tried once for real on this computer on ChatGPT with the user's
  own site: five local competitors, each with a website that opens, where the recalled list had been five
  international names; the reading took 66 seconds and cost $0.075 (it was about a cent). Not tried: on
  Gemini, in a browser, another country. The steps' texts say the search and "a minute or two". No new variable.

- **Built, waiting for the user's look: the first check confirms first and checks after (16 Nov), on the
  branch `landing-redesign` with the landing page's rebuild; merged, pushed and deployed the same day, when the
  user said "push, replay, and deploy".** The user typed their own site on
  this computer and got a school: "I don't understand the flow we have, it is not working correctly", with
  vizibleai.com's setup as "more structured". Two causes. This computer replayed a saved check for any
  website (`FIRST_RUN_REPLAY=true`): asked, the user chose real checks here too, and after the
  real try said "replay": the line is back in `backend/.env`, and the steps now say so in a banner. And our order checked first and asked after; asked, the user chose **confirm, then
  check**. Now `/onboarding/first-run` is four numbered steps: 1 website and country, 2 the business as we
  read it, 3 competitors (up to five suggested from the website's reading, each to untick, more to add),
  4 the questions (ten at most) and the brand questions; only then the check, on exactly what was confirmed;
  then the statistics, whose button saves the project and opens the dashboard, with no setup after
  (`backend/README.md`, `frontend/CLAUDE.md`). Found on the way: a website that sends "example.com" to
  "www.example.com" with a 308, as Vercel does, read as unreadable on Python before 3.11; fixed
  (`pilot/web.py`). Tried on this computer in a browser in Uzbek, desktop and the last step at phone width,
  with one real check of that site on ChatGPT alone ($0.47, about two minutes), saved as a project and
  opened; the test project and account's session removed after. Not tried: Russian and English, Gemini with
  ChatGPT, replay mode's banner, a failed check, on the server. Not built: the suggested competitors are the
  writing model's own knowledge, not a search, so a wrong one is possible and the step says to check them;
  editing the profile does not rewrite the questions. No new variable.

- **Built, waiting for the user's look: the landing page rebuilt (16 Nov), on the branch `landing-redesign`;
  merged and pushed the same day with the first check's new order ("push, replay, and deploy").** The user: "for landing page our is not accurate and not structured correctly", with vizibleai.com
  as the picture. Its structure, in our look and words (`frontend/CLAUDE.md`, "Landing page"): the website field
  in the hero; the assistants we ask with StatCounter's figures; how it works; then a section per thing the
  product shows, each with a real piece of the app on the sample clinic (the numbers, competitors and the cited
  sites, what AI says about the business against its website, the fixes and the site checks, the report's first
  page); why us; who it is for; prices; questions; the demo form; the closing band. Every claim was made true:
  ChatGPT and Gemini (not ChatGPT alone), one answer a question (not three), the free check after an email login
  (not "no sign-up"), the report by email with Telegram "tez orada", ten questions written from the site (not
  twenty suggested), no team members or agency logo claimed, the plan table as the product works (the free
  check is a whole project for one check), no placeholder contacts, no chart the app doesn't have. The demo form
  now reaches the backend (`POST /demo-requests`: kept, logged, emailed to the team's own inbox); it went nowhere
  before. Looked at in a browser in Uzbek on desktop and phone width, the Russian and English tops and the
  product menu; every text scanned in the three languages. Not looked at one by one: the Russian and English
  sections below the top. No new variable.

- **Built, waiting for the user's look: questions by country (16 Nov), on the branch `questions-by-country`;
  merged, pushed and the backend deployed the same day, when the user said "yes, commit, push and deploy".** The user chose it as the next step. The questions (customers' and brand
  ones), their topics and the profile's texts are written in the country's languages: Uzbek and Russian in
  Uzbekistan, Russian in Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, Russia and Belarus, English
  everywhere else (`firstrun.languages_for`; only these three, the ones the interface knows: no Kazakh,
  Turkish and so on). A question's language may be English through the pages (filters, labels, the add
  window, the report's method line and question chips); a typed question's language is guessed as Uzbek,
  Russian or English. Sozlamalar › Profil has the country, with the city typed for a country other than
  Uzbekistan (the list and the map are Uzbekistan's); changing it does not rewrite the questions a project
  has. Tried: the helpers by script, the profile page in a browser in Uzbek for a project abroad and one in
  Uzbekistan, the type check and the linter. **Not tried: the writing itself with a model (a paid request),
  so no English question has been generated yet.** No new variable.

- **Built, waiting for the user's look: fifteen corrections from the first real use (16 Nov), on the branch
  `fixes-from-first-real-use`; merged, pushed and the backend deployed to the server the same day, when the user
  said "yes" to "commit, push and deploy?".** The user tried the Vercel site with a chatbot
  company and sent fifteen points. The cause of six of them: Vercel had `NEXT_PUBLIC_LIVE=auth,first-run`, so
  projects were sample data (the server's log has no project request from the site): a saved project was the
  sample dental clinic, kept in one server instance's memory (clinic facts and sources, a project in the
  sidebar and not in the list, the report's link "not found", the old "asking ChatGPT" screen). Now a live
  first run implies live projects, the old setup without a first run and the landing page's free check both
  go to the real first check, and the setup ends on the project, not on the waiting screen. Also: a logged-in
  visitor of the login page goes to the dashboard; one website, one project, for all accounts (409
  `domain_taken`, asked before the check is paid for); the country is asked with the website; the project
  cards have edit and delete (`DELETE /projects/{id}`) and a colored score with the condition beside it; the
  language is a dropdown on every page; the report has every question right after Topics and the definitions
  last, Topics and Accuracy rebuilt to explain themselves, and every answer's beginning printed in the PDF;
  the app's texts no longer say "clinic". Tried on this computer in a browser (Uzbek; the report also at
  phone width in Russian and as a 13-page PDF) and by request (the domain rule, delete). Not tried: on
  Vercel; English. Not done: the server's own PDF (no Chrome there, and `FRONTEND_ORIGIN` on the server is
  still `http://localhost:3000`: it needs the site's public address), which the emailed report needs; the
  landing page's sample texts still speak of a clinic (a labelled sample). No new variable.

- **Built, waiting for the user's look: the pages show every assistant, or one (16 Nov), on the branch
  `both-assistants`; merged, pushed and deployed the same day, when the user said "yes".** The user said "yes" to it as the next step. On a real project the
  switcher at a page's top offers "Barchasi" and each assistant that answered (ChatGPT, Gemini; Yandex stays
  "tez orada"); the choice is in the address (`?engine=`), follows the links like the language and topic
  filters, and the report is counted over that assistant's answers alone (`GET /projects/{id}/report?engine=`,
  `Report.engines`). Overview, Savollar, Javoblar, Raqobatchilar, Manbalar, a site's page and Notoʻgʻri
  faktlar follow it; Harakatlar, Hisobotlar and a question's page show the whole check and have no switcher
  on a real project. The Overview's sentence names the assistant chosen ("AI" for all), and the dashboard's
  texts say "AI" where they said "ChatGPT" (about 178 a language; the landing page, the free check and the
  login keep ChatGPT). Looked at in a browser in Uzbek on desktop and phone width with a made-up sample
  project answered by both, removed after: the numbers change with the assistant. Not read one by one: the
  reworded texts in Russian and English. Sample data keeps the old switcher. No new variable.

- **Built, waiting for the user's look: Notoʻgʻri faktlar fed from the brand answers (16 Nov), on the branch
  `wrong-facts-from-brand-answers`; merged, pushed and deployed the same day, when the user said "yes".** The user: "do what is next"; this was the piece named as
  missing after the brand questions. A statement of a brand answer that the website contradicts becomes a
  wrong fact from the first check on, with no facts typed in: the page lists it with what the website says,
  the assistant and the brand question, in the interface's language; the Overview's alert counts it; Harakatlar
  gets its fix. The page's and the alert's texts say "AI" where they said "ChatGPT". Looked at in a browser
  in Uzbek (desktop and phone width) and Russian with a made-up sample project, removed after. Not tried: with
  real assistants; English. No new variable.

- **Built, waiting for the user's look: a project's brand answers on the Overview, and Sozlamalar › Brend
  savollari (16 Nov), on the branch `brand-answers-and-settings`; merged, pushed and deployed the same day, when the
  user said "yes" to "commit, push and deploy?".** The user: "yes, build the
  dashboard block and Sozlamalar editing". The Overview shows "AI <brand> haqida nima deydi" over the latest
  answers (the first check's block, now `shared/components/brand-view.tsx`, texts under `BrandView`), with a
  link to edit the questions. The settings' menu has "Brend savollari" after Faktlar: the questions one a
  row, each with its language, editable and removable, a new one typed under the list, six at most, saved
  with the page's Save. Looked at in a browser in Uzbek on desktop and phone width with a made-up sample
  project (removed after): the Overview's block, the settings page, the setup's brand questions. Saving was
  tried through the API, not by clicking Save. Found on the way and fixed: the setup's profile step failed to
  hydrate in Uzbek, because the server and the browser sorted the countries differently. Not tried: Russian
  and English. Not built: Notoʻgʻri faktlar fed from the brand answers; a tour for the new settings page.
  No new variable.

- **Built, waiting for the user's look: brand questions in the setup (15 Nov), on the branch
  `brand-questions-in-setup`; merged, pushed and deployed on 16 Nov, when the user said "yes, commit, push and
  deploy".** The user: "project setup, everything brand questions must be
  generated, brand prompts must be generated, but it must given option to add for the user manually". The
  customers' questions and competitors were already generated with a way to add by hand. New: the first check
  writes four brand questions for the business; the setup's last step shows them with the two general ones
  under the customers' questions, all ticked, with a field for one's own (six at most); the project keeps them
  and every weekly check asks them (`backend/README.md`). Tried offline with stand-in answers, the generation
  once for real, the type check and the linter; not looked at in a browser. Not built: showing a project's
  brand answers in the dashboard, editing the list in Sozlamalar. No new variable.

- **Built, waiting for the user's look: the brand questions in the first check (15 Nov), on the branch
  `brand-questions`; merged, pushed and deployed the same day, when the user said "yes, start brand questions,
  then push and deploy".** The user asked whether our checks show how an AI really knows a brand; they did
  not: no question named the business. A first check now asks each assistant about the business by name and
  shows, under the conclusion, "AI <brand> haqida nima deydi": whether the assistant knows it, and its
  statements, each marked against the website (the same, against it with what the website says, not on the
  website). Not counted in any score. Tried on the server on Gemini alone (`backend/README.md`); the page's
  block passed the type check and the linter and was not looked at in a browser. Not built: the same in the
  weekly check, feeding Notoʻgʻri faktlar. No new variable.

- **Built, waiting for the user's look: Gemini reads and writes, and the first check has a conclusion (15 Nov),
  on the branch `setup-any-business`; merged, pushed and deployed to the server the same day, when the user said
  "push and deploy everything".** The user asked for Gemini 4 Hydrogen "or better model" for the first
  check's own work (competitors, questions, the website, the first data), to "check whether it fits", and for
  the questions and a conclusion from the better-fitting Gemini model. Measured on the server (the user's
  words allowed these Gemini requests; about $1.50 in all): Hydrogen, Argon and 3.6 Flash read ten saved
  answers as OpenAI's model had, but the Gemini 4 models sometimes hold a call for 70 to 130 seconds. So
  reading is on `gemini-3.6-flash` (`READ_MODEL`) and writing (profile, questions, conclusion, briefs) on
  `gemini-4-hydrogen` (`WRITE_MODEL`, new), each with a time limit and a stand-in (`backend/README.md`). Gemini
  answered customers' questions from GEO for the first time: a first check on Gemini alone took 153 seconds
  and cost $0.53. The result page shows the conclusion ("Xulosa") under the numbers. Not tried: the
  conclusion on the page with a live run from the site, and ChatGPT with Gemini in one check. Then ("use the
  flash 3.8 latest"): `gemini-3.8-flash` answers the questions, reads the answers and stands in; an answer
  that came without a Google search is asked once more. Merged, pushed and deployed (`gemini-38-flash`). Then
  ("yes, do 1 and 2, then push and deploy"): Gemini is told the customer's city and country, and ChatGPT's
  search is mandatory (`location-and-forced-search`, merged, pushed, deployed). Asked by the user and not
  built: Google's AI answers in Search as a third assistant, which needs a provider that reads the real page.

- **Built, waiting for the user's look: the setup fits any business (15 Nov), on the branch
  `setup-any-business`; merged and pushed the same day ("push and deploy everything").** The user tried a new account with a chatbot company and found the
  old "new project" form: six fields of business, six Uzbek cities, a competitor required. Their correction:
  the field must fit any business; every country, chosen as a country, with the city optional; competitors
  optional, more addable. Built: "new project" (`/projects/new`, the dashboard's and the switcher's buttons)
  now starts the first check, and the old form is deleted; in the setup the field is typed freely with our
  list offered under it, the country is picked from all countries (names written out in the three languages,
  `shared/constants/country-names.ts`: browsers have no Uzbek ones), the city is optional, and competitors
  can be none or several typed in by hand. A project has a `country` (the first check reads it from the
  website; Uzbekistan where none), which is told to the assistants with the city when there is one; where a
  project has no city the pages show its country. From a first run the setup keeps the run's own competitors
  and questions when the profile is edited (it asked the sample data again). Tried in a browser in Uzbek
  through to a saved project with a free field, another country, no city and no competitor. Not done:
  Sozlamalar › Profil still picks a city from the list and the map of Uzbekistan and has no country; the
  questions are still written in Uzbek and Russian whatever the country. No paid request, no new variable.

- **Built, waiting for the user's look: prices, free then paid, Gemini through Vertex, a full profile at
  setup (15 Nov), on the branch `plans-and-gemini`; merged and pushed the same day, when the user said "push
  everything".** The user: the first check on Gemini (as
  their IELTS project on the server reaches it, through Vertex) and ChatGPT with fewer questions; the first
  check free and every next one only on a paid account; Standard $39.99 weekly, Pro $89.99 "every 2 or 3
  days", Enterprise by contact for several projects; "if I'm going wrong, correct"; every piece of
  information filled in at setup. Built as the table in `PLAN.md` ("Prices and the free first check"), with
  one correction, which the user confirmed the same day ("yes agree with your questions count"): Pro twice
  a week with 50 questions. The pages show dollars and
  the names Standard, Pro, Enterprise; a trial project says so on the Overview and on Tarif; the setup's
  profile step requires the name, description, field, services and city. Gemini has never answered a question from GEO. Since
  15 Nov ("do it") the server has Google credentials for it: the IELTS project's Google Cloud project and a
  copy of its credentials file in GEO's own folder, for now; a login token is made and `/health` lists
  `gemini`. The IELTS project itself was not changed. A Google Cloud project of GEO's own is still owed.
  Tried in a browser in Uzbek: the Overview's notice, Tarif, the landing page's prices. No paid request.

- **Built, waiting for the user's look (not yet "done"): fixes and wrong facts, stage 4 of `PLAN.md` (15 Nov),
  on the branch `real-projects`, not committed.** The user said "yes, start stage 4" (whether "yes" also
  confirmed stages 1–3 was asked and not answered: they stay "waiting"). `backend/app/fixes.py`: the most
  cited pages are read, the actions are made by rule (listings, pages to write, site fixes, wrong facts) and
  keep the client's status from check to check, a done action gets its proof after the next check, and
  Harakatlar works on a real project. Wrong facts and the briefs of pages use a model inside a live check:
  written, never run. `Report.factsChecked` tells the pages when wrong facts were not checked. No paid request.
  Tried by script and in a browser (Harakatlar, Notoʻgʻri faktlar) in Uzbek. No new variable.

- **Built, waiting for the user's look (not yet "done"): the report's delivery, stage 3 of `PLAN.md` (15 Nov),
  on the branch `real-projects`, not committed.** The user said "start stage 3". A real project's report opens
  by its link without login; the backend prints that page as a PDF with a headless Chrome and, after a weekly
  check, emails the summary, the link and the PDF to the address set in Hisobotlar (`backend/app/delivery.py`).
  On a real project the report and the pages say "not checked yet" where they said no wrong fact was found.
  Tried on this computer: the link, a 10-page PDF in Russian, the email into a local test mail server. No
  paid request, no real email. New variable `CHROME_PATH`; `FRONTEND_ORIGIN` must become the site's public
  address. Not done: Chrome on the server, an email to a real inbox, the report in Telegram.

- **Built, waiting for the user's look (not yet "done"): the pages' buttons and the weekly check, stage 2 of
  `PLAN.md` (15 Nov), on the branch `real-projects`, not committed.** The user said "do next stage". On a real
  project the buttons now reach the backend: questions (add, edit, archive, topics, tags, fact-checking),
  competitors (add from the untracked brands, edit, stop tracking, hide), the brand profile, facts, where the
  report goes, a plan request. `backend/app/weekly.py` is the weekly check; it has never asked an assistant
  and was tried as a replay, which gave the charts their second point. No paid request was made. New
  variables: `RUN_SAMPLES`, `WEEKLY_RUNS` (`ENVIRONMENT.md`). Not built: suggested questions, connecting
  Telegram, inviting members, the timer on the server. Tried by script and, for adding a question, in a browser.

- **Built, waiting for the user's look (not yet "done"): real projects, stage 1 of `PLAN.md` (15 Nov), on the
  branch `real-projects`, not committed.** The user asked "so what is next" after the plan; stage 1 needs
  nothing from them and no paid request. The setup's last button saves a real project from the first run
  (`POST /projects` with `firstRunId`), and the project list, Overview, Savollar, Javoblar, Raqobatchilar,
  Manbalar, Hisobotlar and Sozlamalar read it from the backend (`backend/app/projects.py`; the slice
  `projects` in `NEXT_PUBLIC_LIVE`). Harakatlar and Notoʻgʻri faktlar say "not checked yet" on a real project.
  Read only: the pages' buttons fail until stage 2. Tried in a browser in Uzbek on desktop and phone width, on
  the replayed run. Not tried: Russian and English, the buttons, a second account. Not deployed. On the same
  branch, the user's two rules (6 and 7 below), `ENVIRONMENT.md` and `PLAN.md`.

- **The backend is on the Contabo server (15 Nov), reachable only from the server itself.** The user gave the
  server and chose, when asked: deploy now beside the other projects, log in by an SSH key. The server already
  runs two other projects of the user's (nginx on 80/443, a Docker container); nothing of theirs was changed.
  GEO has its own folder, user, service and local port (`backend/README.md`, "On the server"). Deployed from
  the working folder of the branch `first-run-page`, not from `main`. Login was tried on the server; no key is
  there, so no first run can be made. Not done: an nginx site and HTTPS (waiting for a subdomain), Supabase,
  the keys. The server's address and access are kept out of the repository (it is public).

- **The first-run page (15 Nov), on the branch `first-run-page`; merged and pushed the same day, when the user
  said "commit, push".** The user asked "what is next"
  three times after the proposal, so it was built with the proposal's default: no paid request.
  `/onboarding/first-run` (`features/projects`: FirstRunFlow, FirstRunForm, FirstRunProgress, FirstRunResultView):
  the website; then the run's three stages with the answers counted as the backend reports them, asked for
  every second (`?run=` keeps the run in the address); then the first statistics, numbers first: one sentence,
  three figures (named, recommended, place), every business side by side, each assistant apart when two were
  asked, the questions without the client, the site checks, and "Continue to setup". Counts of answers, never
  percentages ("3 / 10"): a first run has ten. After login an account that has never run one lands there.
  `NEXT_PUBLIC_LIVE=auth,first-run` sends its calls to the backend; the mocks have a version too. Backend:
  `FIRST_RUN_REPLAY=true` (in `backend/.env`, this computer only) replays the latest saved run at a watchable
  pace and asks nobody, marking the result `replayed`, which the page says in a banner; `GET /first-runs` lists
  the account's runs. Tried in a browser in Uzbek on desktop: form, progress, result. Not tried: Russian and
  English, phone width, a failed run, a live run. "Continue to setup" opens the old wizard, which doesn't yet
  take the first run's data: that is the next step (saving a first run as a project). `SiteAudit` moved to
  `shared/components`. Then, the same day ("what you recommend"): "Continue to setup" opens the wizard on its
  second step with everything filled in from the run (`draftsFromFirstRun`: the profile, the businesses named
  beside the client as competitors, the ten questions with their topics; `?firstRun=`); the field and the city
  show as the run wrote them. Tried in a browser through to the last step, not submitted. The project the
  wizard then creates is still a mock one: real projects in the backend are the next step.

- **Login by email, wired to the backend (14 Nov), on the branch `email-login`; merged and pushed the same day,
  when the user said "commit, push".** The first page
  that talks to the real backend. The login page asks for an email, then the six-digit code sent to it
  (`features/auth`: EmailLogin, EmailForm, CodeForm); the phone form and the Telegram button are gone. The
  account's settings show the email in the place of phone and Telegram. `NEXT_PUBLIC_LIVE=auth` sends the login
  calls (`sendCode`, `verifyCode`, `getMe`, `logout`, `updateMe`) to the backend while the other calls stay on
  mocks; the mocks then ask the backend who a session belongs to, and give every such account the sample
  project. The backend gained `PATCH /auth/me` (the user's name). Tried in a browser against the local backend:
  email, the code from the log, the dashboard, the account page; a wrong code and a bad address are refused. No
  paid request was made. Left for later: Sozlamalar › Aʼzolar still invites by phone and SMS (mocks); the login
  page's dark panel still has the old magnifier drawing.

- **A look of our own, step 1: colors, typeface and the landing page (14 Nov), on the branch `restyle`; merged and
  pushed the same day, when the user said "everything is good, commit and push".** The user: "refactoring of UI, landing page, dashboard styles,
  icons make as ours, do not make huge changes, just styling … so it does not look like 100% as Peec AI". Asked
  with three choices, they chose: **navy and paper** (the pilot report's look), **our own key icons plus another
  ready-made set** for the rest (Phosphor, in the place of Lucide), and **the landing page first**. Done so far:
  the app's colors (navy ink and navy buttons, warm grays, white cards; the charts' colors untouched), the
  typeface (Onest, JetBrains Mono for small labels), a smaller corner radius, a new logo mark, and the landing
  page's own signatures (numbered section labels in the place of pills, no dotted texture, glows or side
  hairlines, flat cards, a navy closing band). The user's first correction the same day, with another product's
  page as the picture: the headline as a heavy sans line with its last words in a serif italic; the sentence
  under it rewritten for AI in general and without "Koʻrinish, Oʻrin, Ohang", which the user finds hard to
  understand even in Uzbek (the terms are still used across the app: to decide); a taller header; the languages
  as a dropdown with their full names; icons in filled colored tiles. The structure is unchanged. Then, the same day ("any recommendation? what is
  next"): the Uzbek metric names became **Tilga olinish, Oʻrni, Baho** (the user's choice of three), and the
  icons were replaced everywhere: our own for the sidebar's pages, the metrics and the action goals, Phosphor for
  the rest; `lucide-react` is removed. The user looked and confirmed it. Still to do: the
  landing's claims that run ahead of the product (the Telegram report, "no sign-up needed").
  The rules are in `frontend/CLAUDE.md`, "Our look".

- **The pilot report as a product, and its generator (14 Nov), on the branch `pilot-report`; merged and pushed the same day, when
  the user said "commit, push" and then "merge".** The
  user sent a report made by hand for a first client (a private school: five questions, ten pages) and asked
  for honest feedback and the next move. The feedback, which the user accepted ("yes"): the hand-made report
  is a better product than the Peec-style app, so the next move is to make that report repeatable before any
  backend for the dashboard. Built: `/pilots/<slug>` in the frontend draws the report from one file
  (`frontend/pilots/<slug>.json`; that client's report is the sample and prints as the same ten pages. Clients'
  files stay on this computer: the GitHub repository is public, so `frontend/pilots/*.json` is not in git), and
  `backend/pilot/` is a Python script that makes that file from a brief (ask ChatGPT with web search, read who
  is named and who is **recommended**, check the cited pages and the client's site, draft the analysis, print
  the cost). The script's counting is tested offline; **it has not been run against OpenAI** (no key on this
  computer), so the first real run is also step 0 of `backend/PLAN.md`. What the report has that the app's
  data doesn't yet: recommended apart from named, what ChatGPT states about each business, the facts check,
  decisions with options and risk. The rules are in `frontend/CLAUDE.md`, "The pilot report", and
  `backend/pilot/README.md`. Then ("start 4", the same day): a client's second report compares with the one
  before. A brief names the earlier report (`previous`), the script counts what changed (`steps.compare`) and
  the report opens with a "what changed" section; looked at with a temporary made-up file, since no second
  measurement exists yet.
- **The first real run (14 Nov), with the user's OpenAI key; not committed.** `backend/pilot` ran end to end
  for the first client: 27 answers, a 15-page draft report at `/ru/pilots/<its slug>` (the file,
  the brief and the key stay on this computer: `backend/pilot/.env` and `briefs/*` are ignored by git). An
  answer costs about $0.077, far above the plan's budget, and the API's answers differ from the ChatGPT
  app's: both are in `backend/PLAN.md`, change log. The prompts were corrected twice from what the run showed
  (what counts as a recommendation, values in the report's language, short names, competitors' own sites,
  short sentences). The draft still needs a person's read before it is sent.
- **Cheaper models, the client's real site, and the same questions on several models (14 Nov), on the branch
  `models-and-site`; merged and pushed the same day, when the user said "commit, push".** The same nine
  questions on two cheaper models: about $0.044 and $0.024 an answer against $0.077, with the same leaders
  and the client as absent, so the default asking model is now `gpt-6.1-terra`. The user asked whether
  answers differ between models: they do, and between two runs of one model too (about half the businesses
  in common), while the pattern over many answers holds. So a report may ask the same questions to other
  models (`--also-model`) and shows the client's place on each in a table under the questions. The site
  reader follows redirects and reads the inner pages; the first client's school turned out to live on another
  domain than the one given, and to share its abbreviation with a leading competitor. Details in
  `backend/PLAN.md`, change log.

- **Every page exists on mock data:** landing page, free check, login (phone and code, Telegram; by email since
  14 Nov),
  onboarding in five steps, the first check's progress screen, project list, Overview, Savollar (questions),
  Javoblar (answers), Raqobatchilar (competitors), Manbalar (sources), Notoʻgʻri faktlar (wrong facts),
  Harakatlar (actions), Hisobotlar (reports), Sozlamalar (settings), and the public report.
- **Overview, finished with the user's corrections (5–6 Oct).** In order: one sentence on where the client
  stands, five numbers with their weekly change, the chart card laid out like Peec's (four metrics, a day /
  week / month switch), brand ranking, cited sites and their kinds, visibility by topic and by question
  language, recommended actions, latest answers. Each card of numbers opens large with a takeaway sentence
  and how to read it.
- **Savollar, built from Peec's Prompts screenshots, with the user's first correction (6 Oct).** The list: the
  question limit from the project's plan (25, 75, 300); Tracked, Suggested and Archive tabs (an archived
  question isn't asked, keeps its answers and frees a place in the plan); search, a "named / not named"
  filter and sorting, with the client's numbers following the rows shown. A page per question, opened from
  the list: its facts, a sentence on its latest answers counted in answers, the Overview's charts for that
  question alone, the fixes that list it, its answers. The correction: every heading, figure and mark
  explains itself on hover. Left out of Peec's page on purpose: volume (no data), branded and intent
  tags (need the backend), free tags, location, bulk select.
- **Savollar, second correction (7 Oct).** After the user sent
  Peec's full table and prompt page again: a click anywhere on a row opens the question's page; the table
  scrolls sideways under the pinned question, like Peec's, and gained share of voice, web search, wrong
  facts and date added; the question's page gained "what ChatGPT searched for" (Peec's query fanouts), fed
  by the new `Answer.searches`.
- **Savollar in Peec's layout with all of its features (8 Oct; merged on 10 Oct, when the user chose
  "commit, push").** The user sent Peec's Prompts screenshots again ("not all
  features are available, add prompt is a modal … suggest more and add prompt, design and logic the same")
  and chose all four extra features when asked. The page now spans the whole panel like Peec's: the topics
  column ("New topic +", a ⋯ on each topic to rename or delete it; deleting archives its questions), the
  tabs with the plan's ring and the page's buttons, and a footer that stays in view. Add is a window (one
  question per line, or a CSV/TXT file; the language guessed from the letters); boxes pick rows to move to a
  topic, archive, track or reject, plus "Archive all", "Track all" and "Reject all"; the Suggested tab is
  Peec's table with why and when each was suggested, ✕ / ✓ per row, "Suggest more" (for the topic picked or
  for all), "Import keywords" and the topics only the suggestions have; "Find questions" opens Discovery
  (`/prompts/discovery`: services, customer types, extra context, languages → new suggestions with new
  topics). New for the backend: batches, topics, three ways to suggest, `SuggestedPrompt.source`,
  `Project.customers` (see `backend/PLAN.md`, change log).
- **Harakatlar in Peec's layout with all of its Actions page (10 Oct), with the user's first correction the
  same day; merged and pushed that day, when the user said "push everything".** The user's correction, with Peec's opened action as the
  picture: "text clearly seen and color more visible, only design". The opened action now has Peec's type
  sizes (a 22px title, 15px body text in the body's color, gray labels at the same size), the topic and the
  assistant one under the other, steps in full-gray rows with larger boxes that stay clearly ticked once done,
  and larger cards. The user also asked not to make test builds: a change is checked with the type check
  and the linter, and a look on the running dev server. The user sent 18 screenshots of Peec's Actions ("every element
  and page"). The page now spans the whole panel: a strip of tools (statuses; all filters: topic, where the
  work is, kind of site, kind of work; group by goal, kind of work, impact, where, topic; a guided tour of
  seven steps that starts by itself once per browser; export as CSV or JSON; "Add a page"; "Accept all"), a
  heading, the four goal tiles with a ring and the open count, then the list by status, goal and kind of work
  (sub-groups when a goal has two or more), five rows and "Show all", boxes to pick rows and a footer with the
  open count and "Decline all" (or what to do with the rows picked). An action opens beside the list (over
  the screen on a phone): "Copy for ChatGPT", summary, topic, assistant, why it matters, the brief for a page
  (headlines, meta title and description against their length, what it must prove, evidence, "Write with GEO
  AI"), the steps to tick, the pages ChatGPT reads, the questions it should move with how the client does on
  each, the expected effect or fix → proof; Decline / Accept, then Cancel / Done, and a toast with a link to
  the group it went to. "Add a page" takes a page's address or a Markdown file, its type and topic, and makes
  an action with a brief to rework it. Left out of Peec's: models, platforms and page types as filters, XLSX
  export, Peec Agent (GEO AI takes its place). Also fixed for every page: a hint's bubble no longer blocks
  clicks on what is under it. New for the backend: briefs, `PATCH` and `POST /projects/{id}/actions` (see
  `backend/PLAN.md`, change log).
- **Guided tours on every page, Harakatlar's second correction (10 Oct); merged and pushed that day, with
  the Savollar corrections below, when the user chose "commit, push".** The user sent Peec's tour again: "it must show with border the section, and every page must
  have the tour … with pointer as in screenshot". Our frame did not show (the shadow that fades the page
  covered its ring). Now each step frames a whole section in a dark border while the rest of the page
  fades, and a dark bubble with a pointer sits under, over or beside it, as on Peec. Every workspace page
  has its own tour: Overview, Savollar, a question's page, Find questions, Javoblar, Raqobatchilar,
  Manbalar, a site's page, Notoʻgʻri faktlar, Harakatlar and Sozlamalar. It starts by itself on the first
  visit, and the book button in the page's top bar shows it again. Harakatlar's tour gained Peec's
  status-filter step and frames the heading with the goals. Also: "In progress" is now Peec's amber ring
  with its right half filled, and the "Add a page" window has a close cross. The rule is in
  `frontend/CLAUDE.md`, "Guided tours".
- **Savollar's topics column in Peec's design (10 Oct), on the branch `guided-tours`; merged and pushed that day.**
  The user sent Peec's topics column ("make the same UI design"). The title has Peec's ⌃⌄, which sorts the
  topics as added, by name or by number of questions (Peec's switches to tags, which we leave out). "New
  topic +" and "All topics" with its count sit in rows of their own. The topics are compact rows with
  their counts in gray, and the one picked sits on a gray rounded ground. « at the column's foot, level
  with the list's footer, folds it to a rail. The page remembers that in a cookie, and the topics are then
  a button in the tools row. Then, with Peec's "Edit topic" window as the picture ("will open a modal, not
  Enter and Esc"): a topic's pencil opens it in a window with its name, its tracked questions and "Delete
  topic" in red at the foot, with Cancel and Save; "New topic" opens the same window empty. Nothing is
  typed in place any more. Peec's location and language per topic are left out: the city is the
  project's, and each question keeps its own language. Then Peec's closed column and full table ("closed version of prompts
  and full table design"): folded, the column is Peec's rail (⌃⌄, the count of all, +, each topic as its
  count with its name on hover, » at the foot). The table has Peec's look: gray headings in the body's
  size, the numbers at the right under theirs, the question sorting A to Z, tone as a dot and a score out
  of 100, web search in percent, and the question's edge shadowed once the table scrolls sideways. It
  gained Peec's "Branding" (worked out from whether the question names the client's brand) and the
  question's language in the place of Peec's "Location" (UZ / RU). Then, when the user asked for
  "tag adding, fact checking, location": each question has its own tags ("+ Add tags" in the row opens a
  small window to find or type a tag; a "Tag" filter over the list), Peec's fact-checking switch (on by
  default; the wrong facts found show beside it) and a location, the city it is asked from (a round flag
  and the city; picked in the question's window, the project's city by default). Volume and intent stay
  out of the table: the user chose that when asked.
- **Hisobotlar built (10 Oct) and reworked the same day for the first look; merged and pushed that day,
  when the user chose "commit, push".** The user asked for a "professional, sections separated accurately,
  and advanced reports page, and inside detail, that must be easy for project to make a decisions" (no Peec
  screens: Peec has no such page). The page has three parts: this week's report (the five numbers with their
  change, where the client stands, the findings and the three things to do first, then its page, its
  link, Telegram and PDF), every weekly report as a table of how the numbers moved (each row opens that
  week's report; CSV), and where the report goes (Telegram through our bot, email, the report's language,
  the agency's name on the Agency plan). A report's own page has numbered contents beside it that mark
  the section being read, and the report's sections, the same as the shared report's. Both gained "what
  changed since the report before": the client's place and who passed whom, competitors that moved a lot,
  sites cited for the first time, more or less, new wrong facts, actions done that week. The shared report
  opens a past week (`?run=`) and goes straight to the print window for the PDF (`?print=1`). Also fixed
  for every page: a new page opens at its top (the panel kept the last page's scroll). New for the backend:
  a report per run, the report settings, the Telegram bot (see `backend/PLAN.md`, change log). Then the
  user asked to review it for the first look ("make it first look impressive ... data structure
  attractive"): it now opens with a dark cover (the week's message as a headline, visibility large with its
  change and an eight-week line, "Open the full report", link, Telegram, PDF); the summary became three
  cards (what went well, what needs attention, what to do first) in every report; the history's rows say
  what happened that week; the delivery settings moved into a window behind one line; the five numbers
  that repeated the Overview are gone from the page. The report's own page opens with the same cover.
- **Hisobotlar and the report rebuilt as a status report (10 Oct), with the user's three corrections the
  same day; merged and pushed that day, when the user chose "commit and push".** The user's correction after the merge:
  "Reports page and detail page … is not what I expected to see, I want professional business report about
  condition, and advanced report structure". What was wrong: the pages never rated the client's condition,
  looked like an app screen under a banner, and ran as tables one after another. Asked with two pictures,
  the user chose a status document with an overall score, and for the list the latest condition first, then
  every report. The report now opens with a **condition score** out of 100 (the mean of five areas:
  visibility, competitive position, question coverage, presence in sources, accuracy and tone; good from 70,
  fair from 40, weak under), and runs in four parts and twelve numbered sections: the
  condition (summary, key figures with their lines over the checks, what changed), the analysis (a section
  per area, each opening with its status and conclusion and closing with the action that answers it), the
  decisions (a register of risks and opportunities, the action plan with its progress and the area each
  action improves), the reference (method, definitions, every question). Hisobotlar opens with the latest
  report's condition (the gauge and the five areas), then every report as a register with its score, the
  areas as marks, the week's events and its PDF. A report's page has its contents beside it by part, with
  each area's status. The dark cover is gone. Checked as a PDF, on a phone and in the three
  languages. The user's first correction to it, the same day ("Mundarija must be somehow designed, too many
  spacing, and no separation"): the contents are now a white panel of their own, with the report's overall
  status in its heading, a line between the parts, tight rows and a bar on the section being read. The
  second ("overall reports page is too many spacing"): both pages were tightened to the app's own density
  (narrower margins around the sheets, less padding in them, closer blocks and table rows, the title block
  as one band). The third ("inside of report make as official report page"): the report is now one
  official paper, not app cards: a letterhead over a double rule, the title in capitals in the middle, a
  ruled table of its facts, each part on a gray band, section headings in capitals over a rule, ruled
  square tables, a sign-off (who prepared it, lines to sign that it was read) and page numbers in the PDF
  (13 pages, the first holding the letterhead and the whole condition). After the merge, a fourth with a
  screenshot of the user's wide screen ("Report detail page make little bit fuller for the page, too many
  spacing"): the contents and the paper now take the panel's whole width (the paper had stood in the middle
  at the width of a sheet, with gray beside it and between it and the contents); merged and pushed the
  same day, when the user chose "commit and push". New for the backend: `Report.conditionHistory` and the score's formula (see `backend/PLAN.md`,
  "The condition score"). The rules are in `frontend/CLAUDE.md`, "The report" and "Scores".
- **Sozlamalar in Peec's layout, and the Overview tightened (10 Oct), on the branch `settings-and-overview`;
  merged and pushed that day with the entry below, when the user chose "commit and push".** The user sent Peec's Settings screenshots (Profile,
  Brands, Tags, Company, Projects, API keys, Members, Billing) with "take what we need, and for overview make the
  full page, not too many spacing", and chose, when asked, our Overview page and Peec's own settings menu. On a
  settings page the sidebar becomes the settings' menu ("‹ Umumiy koʻrinish" back; Loyiha: Profil, Faktlar,
  Brendlar, Teglar; Hisob: Umumiy, Aʼzolar, Tarif), and every section is editable: the brand profile in rows
  across the page with a save bar at the foot; brand facts, one a row, against the plan (Biznes 20, Agentlik 50;
  Start checks no wrong facts, so it keeps none), filled from the website; Peec's brands table (edit, stop tracking, add a brand) with the brand suggestions beside it; the
  questions' tags (create, rename, delete; a row opens Savollar on that tag); the account's name and logins with
  the interface language; members (invite by phone, remove); the plan with what the project uses of it and every
  plan to switch to (a request reaches us; payment and invoices "tez orada"). Left out of Peec's: social channels,
  brand colors to pick, source tags, Projects, API keys, early access. The
  Overview: every page's padding is a step smaller, the chart stands over the kinds of sites and the brands table
  over the sites, two columns that end level, the topics card runs in two columns on a wide screen with its
  sentence under the languages, and the lists under it show a row more. Also fixed for every page: a click in a
  row's ⋯ menu no longer opens the row's page. New for the backend: see `backend/PLAN.md`, change log.
  The user's first correction, with Peec's Billing and Profile pages ("Billing make the same, and Profile page
  make the same as screenshot"): Profil is now Peec's brand profile in the middle of the page (a gray banner with
  the brand's initial, its name, site and other spellings with a button to edit them; description, field, brand
  identity, services and customer types, each with its ⓘ; "Target market": the city picked from a list or on a
  map of Uzbekistan with its neighbours, which opens large). Tarif is Peec's Plans: the plan with "Joriy", its
  price, how it is paid, when it renews, what the project uses, and the assistants it asks (Gemini and Yandex
  "tez orada"); then "Base plan" with Monthly / Yearly and the four cards side by side (price, numbers with
  their marks, the button: the current plan's cancels it, the others switch, Managed GEO talks to us; the
  assistants; what each includes, ✓ or a dash); then payment and invoices, "tez orada". A year paid ahead costs
  10 months, "2 months free" (`YEARLY_MONTHS_PAID`; the user's decision, 10 Oct). After the merge, a second
  correction with Peec's Plans & Billing again ("pricing, design must be the same"), on the branch
  `plan-billing-correction`, merged and pushed the same day when the user said "push everything": the plans stand four in a row and level with each other, as Peec's (they
  were two by two on a laptop); the plan's card keeps Peec's two facts (how it is paid, when it renews) and the
  number of assistants; each card has Peec's three limits (questions, brands, competitors; the facts limit stays
  on Faktlar), no line on whom it is for, Peec's chips and smaller assistant tiles; Managed GEO reads
  "3 000 000+ soʻm / oy"; the payment and invoice cards are Peec's size.
- **Savollar and a question's page in Peec's design, and brands' logos (10 Oct), on the same branch; merged
  and pushed that day; corrections may still come.** The user sent Peec's prompts list, a prompt's page and its chart's tooltip ("make the prompts
  design the same, spacing, and colors … inside Prompt make the design the same, and add some filters that do
  not exist in ours, and hover of statistics show the companies' logos"). Every tracked brand has a logo
  (`Brand.logo`; the initial where there is none): in the chart's tooltip with the brand's full name, the brands
  table, Savollar's "named" and "leader" columns. Savollar: the language filter moved into the tools' row, which
  holds the search, the filters and the client's numbers in one line on a wide screen; the table in the body's
  size and weight. A question's page: its filters in the strip under the title, as Peec's (the checks shown: all,
  the last 8 or 4 weeks; "Barcha filtrlar": the competitors to compare with and the kinds of sites to count; kept
  in the address), its facts in a strip across the panel (the city with its flag, the status as a green chip),
  then "Umumiy koʻrinish" (the sentence, the chart, the brands) and "Manbalar taqsimoti" (the sites and their
  kinds) as headed sections. Also fixed: an answer's brands wrap on a phone (they ran past the card's edge).
- **Javoblar (7 Oct), built from Peec's Chats screenshots of 4 Oct; the user has not sent corrections for
  it yet.** Added to the page that existed: CSV export of the answers with their full text, a filter by
  cited site (`?source=` lets other pages link to "the answers citing this site"), hover explanations on the
  table and in the opened answer, and the searches behind each answer in its details. Left out: Peec's
  web-search share, "most common feature" and features filter.
- **Raqobatchilar (8 Oct), built from Peec's Ranking and Settings › Brands screenshots of 4 Oct; the user has
  not sent corrections for it yet.** Added to the page that existed: a row of five numbers (your place, the
  leader, topics you lead, questions without you, new brands); the brands ChatGPT names that aren't tracked
  can be tracked (while the plan has room) or hidden, like Peec's brand suggestions; a competitor's card
  stops tracking it and its questions open the question's page; a topic opens its questions; hover
  explanations.
- **Review for repeats and three smaller corrections (8 Oct).** The user found some information repetitive and chose all four fixes offered: on Javoblar
  each question is written once over its three answers and the date column is gone; Javoblar's top row
  keeps numbers about the answers only; Raqobatchilar's top row lost "leader" and "new brands" (the blocks
  below say them) and gained the gap to the leader; Manbalar lost the kinds chart and the "your site as a
  source" card added the same day. The rule is in `frontend/CLAUDE.md`, "One place for each number". Also:
  clickable things show the hand cursor and whole rows open on a click ("Clickable rows"), and the up and
  down changes are colored for every brand.
- **Manbalar rebuilt after Peec's Sources › Domains screenshots (8 Oct); the user has not sent corrections
  for it yet.** The page: four numbers, the five most cited sites over the checks beside
  "what changed" (sites used more, less, for the first time), then the Sites / Pages / Gaps card. A site
  anywhere (a table row, the chart's legend, a change, the Overview's and a question's list of sites) opens
  the site's own page, `/sources/[domain]`: its facts, a sentence on what it means for the client with a
  link to the fix that gets it listed, the site and its pages over the checks beside who ChatGPT names when
  it cites the site, then Pages and Answers tabs. An answer opens the chat window, which now follows Peec's
  (two cards in a frame, the assistant's name as a chip on top, sources by page title over address), and
  its bar links to the question's page. Left out of Peec's pages on purpose: "Top" among the movers and the
  kinds chart (the table and the Overview already are those), "retrieved" apart from "cited", hosts, tags,
  URL movers and URL types, and the "Links" list of the chat window (our answers carry citations only). New
  for the backend: page titles on citations and `sourceHistory` in the report.
- **The report rewritten as a standard business report (8 Oct); the user has not sent corrections for it
  yet.** They asked for "a standard, internationally accepted format, very clear, that helps a
  business decide". The public report is now a numbered document: title block, executive summary (where
  the client stands, four findings, three things to do first), key figures against the previous check and
  the strongest competitor, position among the brands, topics won and lost, sources, wrong facts,
  recommendations in order of effect with what is done, method with its limits, definitions, and every
  question as an appendix. It is laid out for A4: "Print or save as PDF" is the browser's print dialog. The
  format's rules are in `frontend/CLAUDE.md`, "The report". Since 10 Oct Hisobotlar lists every week's
  report (see the Hisobotlar entry above).
- **Manbalar laid out like Peec's, with the breadcrumb on every page (8 Oct); the user confirmed it
  ("manbalar is correct").** The user sent Peec's Sources › Domains and a domain's page again:
  "it does not look like ours … page top breadcrumb must also be the same". Every workspace page's top is now
  Peec's: a breadcrumb in plain weight ("Manbalar › Saytlar › 2gis.uz"), the filters in a strip under it, the
  views as tabs in a strip of their own (the rules are in `frontend/CLAUDE.md`, "Page layout"). Manbalar has
  Sites and Pages as its tabs, each with "Overview" (the chart, its legend in a strip), "What changed" (new,
  rising, falling as tabs beside "are you on them?", how the citations split by whether they work for the
  client) and the table with Peec's gap switch; its four numbers are gone (they were on the Overview or belong
  on a site's page). A site's page: Pages and Answers tabs, the facts in a strip across the panel, the chart,
  its pages' movers beside who ChatGPT names there, its pages. In the place of Peec's domain types stands "are
  you on them?": the kinds of sites stay on the Overview (the user chose to keep it that way when asked).
- **Decisions the user made (6 Oct):** visibility is shown in percent, as Peec shows it; a change is green
  when better and red when worse; daily checks are not offered for now, so the day and week views of the
  chart show the same points. Changed on 8 Oct: the up and down changes are colored for every brand, not
  only for the client (competitors' used to stay gray).
- **Landing page speed (6 Oct).** The page went from 501 KB to 347 KB, from 62 graphics layers to 8, and from
  redrawing 60 times a second while idle to resting. The rules that keep it that way are in
  `frontend/CLAUDE.md`, "Keeping the landing page fast". The user looked at the page and confirmed it is fast.
- **Peec pages we leave out for now (6 Oct).**
  - "My website" gets no menu item (the user left the decision to Claude). Most of it (bot visits, sessions,
    conversions, the traffic chart, why bots visit, the responses they got) needs server logs or Google
    Analytics: all of it said "not connected" in our own trial, and a local business can't set that up. The
    rest we already show: "used as a source" on the Overview and Manbalar, the client's cited pages on
    Manbalar, the site checks in the free check and as fixes in Harakatlar. It becomes a page ("Saytim") when
    the full site audit exists.
  - "Brand" (Insights, Perception) is skipped. Insights is already our Overview (the sentence, the numbers,
    the chart, by topic), and what remains compares AI engines, of which we have one. Perception (how ChatGPT
    describes the brand) is on the "Later" list.
- **Backend plan (5–6 Oct):** `backend/PLAN.md`, with the build order, tables, the weekly check step by step,
  how each number is calculated, cost per plan and the open questions.
- **Git:** `main` is on GitHub (Baxa1997/geo-uz) and holds everything above: the Overview branch was merged
  and pushed on 6 Oct, Savollar on 7 Oct, and on 8 Oct Javoblar with the second Savollar correction, then
  Raqobatchilar, then `manbalar-page` (the review for repeats, Manbalar with a page per cited site, the
  report), then `manbalar-correction` (Manbalar and every page's top in Peec's layout); on 10 Oct
  `savollar-correction` (Savollar with all of Peec's Prompts features), then `harakatlar-page` (Harakatlar
  in Peec's Actions layout with its first correction), then `guided-tours` (a tour on every page,
  Harakatlar's second correction, and Savollar's topics column, folded rail and table in Peec's design with
  tags, fact-checking and location), then `hisobotlar-page` (Hisobotlar: this week's report as a cover with
  three decision cards, every week's report with a page of its own and what changed, where the report goes),
  then `hisobotlar-correction` (the report as an official status document with a condition score, Hisobotlar
  opening on the latest condition), then `report-detail-width` (the report fills the panel's width), then
  `settings-and-overview` (Sozlamalar in Peec's layout, the Overview tightened, Savollar and a question's page in
  Peec's design, brands' logos), then `plan-billing-correction` (Tarif's plans four in a row, as Peec's); on 14 Nov `pilot-report`, `pilot-first-run`, `models-and-site`, `backend-first-slice`, then `restyle` (the look of our own, the Uzbek metric names, the icons), then `email-login` (the login by email, wired to the backend); on 15 Nov `own-login-email` (the backend sends the login code itself; Supabase's tables locked) after `first-run-page` (the first run's page, the setup filled in from it, the backend on the server, API calls through the frontend); on 17 Nov `feedback-17-nov` (the user's list of 17 Nov, Manbalar rebuilt, the name Seenova AI and its logo), then `actions-simpler` (Harakatlar made simple, a task for the owner's own AI on every action); on 18 Nov `logo-rounds` (the logo as two rounds), then `wrong-facts-rebuild` (Notoʻgʻri faktlar rebuilt), then `report-pdf` (a real PDF download, no signature lines), then `docs-current` (the docs brought up to date with each other and the code), then `hero-indicator` (the landing page's indicator, the sentence with chips, a smaller headline); on 19 Nov `full-screens` (full-height screens for the first check and the login, the dashboard's buttons filled), then `savollar-simple` (Savollar made simple); on 21 Nov `phase0-wave-object` (Phase 0 of the report spec: the test harness, items 0.1–0.3). Each time the user chose "commit, push" when asked (for Harakatlar: "push everything"). Each page gets its
  own branch, merged when the user says so.

## To do, in order

0. **The platform's first flow (the user's decision, 14 Nov).** It works end to end on the live server since
   16 Nov: login → the website → the business, competitors and questions confirmed → the check on ChatGPT and
   Gemini → the statistics → the project, then checks by plan, the report and the fixes (stages 1–4 of
   `PLAN.md`: built, waiting for the user's look). What is left of the MVP: stage 5 of `PLAN.md`, and on the
   live site the report's PDF and links (Vercel's login, `FRONTEND_ORIGIN`, Chromium on the server).

1. **Pilots (the user's decision of 14 Nov, put after the platform's flow the same day).** The first real run
   is done, and the prices were set against the measured cost on 15 Nov. Before the first client's report is
   sent: read and correct its draft and fill the contacts. Still unmeasured: the ChatGPT app against the API
   on the same day (the user pastes three answers from the app). Whether to sell 5–10 pilots by hand while the
   platform is built is the user's to decide (`PLAN.md`). Ideas agreed as direction, not built: the app opening
   on "how AI sees you" beside the leader, counts instead of percentages while samples are small, the report's
   look in the app, a category ranking (one measurement serves every business in it), Kazakhstan by hand-made
   Russian pilots.

2. **The other pages, the same way, in the sidebar's order.** Each also gets hover explanations on its table
   headings, figures and marks (`Hint`; done on most data pages, `frontend/CLAUDE.md`, "Explanations on hover"):
   - Javoblar: built and merged (see "Done"); corrections may still come.
   - Raqobatchilar: built and merged (see "Done"); corrections may still come.
   - Manbalar: rebuilt after Peec's Domains screenshots, laid out like Peec's on 8 Oct, confirmed by the
     user and merged (see "Done"). Peec's URLs page was not among the screenshots; our Pages tab stands in.
   - The report: rewritten and merged (see "Done"); corrections may still come.
   - Savollar: laid out like Peec's with all of its Prompts features on 8 Oct and merged on 10 Oct, then its
     topics column, folded rail and table in Peec's design with tags, fact-checking and location, merged the
     same day (see "Done"), then made simple on 18 Nov (see "Done"); corrections may still come.
   - Harakatlar: laid out like Peec's Actions on 10 Oct, corrected twice and merged the same day, then made
     simple on 17 Nov (see "Done"); more corrections may still come. Still to come on it: marks on the chart
     where a fix started and was done (Peec's Impact as a block), once Impact's screenshots arrive.
   - Asked for on 10 Oct, before the Peec trial ends about 11 Oct, in one go: Impact, Settings › Facts (the
     other Settings tabs came the same day and are built). Settings › Company showed Peec's email report: a
     switch per project and "every 2 weeks"; ours stays in Hisobotlar's delivery window. The Fanouts screenshots of 8 Oct need nothing: the question's page already lists the
     searches (decided 6 Oct).
   - Hisobotlar: built and merged on 10 Oct, then rebuilt the same day as a status report with a condition
     score and an official document's look, corrected four times and merged (see "Done"); corrections may
     still come. Peec's Settings › Company (its email report) may still come and change the delivery part.
   - Sozlamalar: built from Peec's Settings screenshots on 10 Oct, on the branch `settings-and-overview`, with the
     Overview tightened, Profil and Tarif then made Peec's, and Savollar with a question's page in Peec's design;
     merged and pushed on 10 Oct (see "Done"); corrections may still come.
   - Notoʻgʻri faktlar: rebuilt on 18 Nov from what AI says about the business, each wrong claim beside the
     truth (see "Done"); corrections may still come. Peec's Settings › Facts screens never came; ours is built
     from the teardown.

   Peec pages that get no page of ours (the user agreed on 6 Oct; Discovery left this list on 8 Oct, when the
   user asked for all of Peec's Prompts features: it is "Find questions" on Savollar):
   - Impact: not a page, a block on Harakatlar (the chart with marks, above).
   - Fanouts: no page of its own; since 7 Oct each question's page lists the searches behind its answers.
   - Ads: no. ChatGPT ads aren't sold here, and Peec has paused the page itself.

3. **Parts that are design only:** the Seenova AI side panel answers every question with a demo reply; Yandex
   and Google's AI answers are marked "tez orada" (Gemini is real since 15 Nov). There is no Telegram bot: the
   backend answers 501 to connecting one, and only the mocks tie a chat at once. No payment: a plan is switched
   on by hand (`python -m app.admin plan`), and a new project is a trial with Standard's limits. The backend
   doesn't serve suggested questions, Discovery, keywords or members yet (empty answers). On sample data only:
   a past week's report shows the latest answers (the mocks keep one run), and every mock project is on Biznes.
4. **Backend.** Step 0 of `backend/PLAN.md` is done (14 Nov), and stages 1–4 of `PLAN.md` are built (15–16 Nov,
   see "Done"); stage 5 is next. `backend/PLAN.md` keeps nineteen open questions; the cost of an answer (1),
   daily checks (14) and the searches (16) are decided, plan limits (8) mostly, and wrong facts before the
   owner's facts (13) answered by the build of 16 Nov.
5. **Noted during the dashboard review, not scheduled:** saving a chart as a picture (owners forward
   pictures in Telegram), a date-range filter once a client has four or more weeks, an export menu on each
   card, and a "write to us in Telegram" banner for new clients. Also a "Saytim" (my website) page once the
   full site audit exists: every site check with passed and failed (a client sees only the failed ones today,
   as fixes in Harakatlar) and the client's own pages that ChatGPT cites.

## Commands

All from `frontend/`: `npm run dev` (development), `npm run build` then `npm run start` (the real build),
`npm run lint`, `npx tsc --noEmit` (type check).

## Seenova report: source of truth

- The report is built from `seenova-report-spec.md` (at the repository's root; it names a client, so git ignores it and it stays on this computer). If code, old docs or comments conflict with it, the spec wins.
- Current scope is **Phase 0 only** (spec §2). Do not build Phase 1 or Phase 2 features unless I ask.
- Every number shown in the UI, PDF or Telegram digest must be computed in code from the single data object (spec §10). The LLM must never write a number.
- Never default a missing score to 50. Use N/A (spec §6.3).
- Use the baseline client's first check (spec §3.3) as the test fixture. Acceptance tests are in spec §11.1; they run in `backend/tests/` on that check's data, which stays on this computer (`backend/tests/README.md`). Never write the client's name, its competitors' names or its project's id into a committed file.
- Work on one Phase 0 item at a time. Show me a plan before writing code.
- Decided with the user on 21 Nov 2026, while planning Phase 0: the baseline's scope card shows 20 slots, 15 completed and 5 excluded, with the reason that the free check asks ChatGPT 5 of the 10 questions (nothing failed: only 15 were planned); a Gemini answer that ran no web search counts as completed and says so ("Gemini searched in k of n"); the report surfaces (the report, its Hisobotlar copy, the PDF, the snapshot, the digest, the email) read the single data object in Phase 0, and the 0–100 score goes from everywhere (Hisobotlar's register, the dashboard's project cards, the landing page's sample report, the email too), while the other pages move to the object later.
- Decided with the user on 21 Nov 2026, for item 0.9: a page about a topic is suggested only for a topic with at least 3 answers where competitors are named and the client never (the same 3 answers as spec §6.3's topic ranking).
- Decided with the user on 21 Nov 2026, after the Phase 0 review (spec §9.3 question 2, the Google Search grounding terms): Google Cloud's Service Specific Terms 20(k) say Grounded Results are shown "only … to the End User who submitted the prompt" and may not be cached, syndicated, resold or analysed (the Gemini API's own terms say the same), so Gemini is paused as an assistant that answers in new checks (`ANSWER_ENGINES=chatgpt` on the server; the free check then asks ChatGPT all 10 questions); past checks stay as they are; the landing page and the plans say Gemini is coming. Spec §9.3 question 1: Vertex takes the city's coordinates (`latLng`), but its effect was never measured. Also for the close-out: each evidence card says its channel and its place (spec rule 3, §4.13, in the scope card's words, never the word "API"), and the digest's biggest change is counted over the questions asked on the same assistant in both checks, its visibility line saying when the check before was asked another way (spec §4.15, §9.2).
- Decided with the user on 21 Nov 2026, for item 0.8: the Free Snapshot reports today's free check as it is asked (10 questions, Gemini 10 and ChatGPT 5); its call to action is a request button with no price (the price and contacts when the user gives them); the digest is copied by hand from Hisobotlar and the snapshot, and opens the report's email.
- Decided with the user on 21 Nov 2026, for item 0.7: a project without a city is asked from its market's main city (Uzbekistan Tashkent, Kazakhstan Almaty, Kyrgyzstan Bishkek); a project's own city wins; other countries are told the country alone. Gemini on Vertex gets the city's coordinates as its grounding's location (one test call approved and made).
- Decided with the user on 21 Nov 2026, for item 0.6: three runs of each question only for the paid First Audit, started by hand (`--runs 3`); weekly checks stay at one run until prices are set for more (three would cost Standard more than its $39.99). With several runs the PDF prints in full only the questions where the client or a tracked competitor is named, the others by their beginning.
- Decided with the user on 21 Nov 2026, for item 0.5: every buyer answer is printed in full, word for word, in the report's PDF too (its evidence section), not by its beginning.
- Decided with the user on 21 Nov 2026, for item 0.4: a cited site our list, the project and a review don't type is typed by the AI (`automated`) at the end of every live check, and once on the two live projects' latest checks; a route onto a site (which a "get listed" action needs) comes only from our checked seed list or a review by hand, never from the AI.
- Decided with the user on 21 Nov 2026, for item 0.2: with the score gone, each of the report's five areas shows its count and no status (no Weak/Fair/Good, no coloured dot); the client's "used as a source" is spec §6.3's, answers citing its site over answers that cite any site (0 of 7 on the baseline), not over every answer.
