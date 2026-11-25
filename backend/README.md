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
unless the `SMTP_*` lines below are set (this computer's `.env` has them since 16 Nov, so its codes are emailed).

```
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
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

**Tests** (since 21 Nov 2026, for Phase 0 of the report spec; `tests/README.md`): once
`.venv/bin/pip install -r requirements-dev.txt`, then `.venv/bin/python -m pytest` for the data and the backend,
or `-m page` for the report as a real frontend renders it. They run on the baseline client's check, exported
read-only from the server into `tests/fixtures/`, which stays on this computer; nothing they do reaches the
server, an assistant or an inbox.

## What is built

| Endpoint | What it does |
| --- | --- |
| `POST /auth/code` `{email}` | Sends a six-digit code: by this service's own email when `SMTP_HOST` is set, else by Supabase's, else (development) into the server's log |
| `POST /auth/code/verify` `{email, code}` | Logs in, makes the account on the first login, sets the cookie |
| `GET /auth/me`, `PATCH /auth/me` `{name}`, `POST /auth/logout` | The account; its name; logging out |
| `POST /first-runs` `{domain, country?, category?, city?}` | Starts a new account's first run and returns at once (202). Since 16 Nov it only **reads the website** (`firstrun.prepare`: the profile, the questions, and up to five competitors found by one web search, `search_competitors`: Gemini when it can be asked, else ChatGPT, each competitor's website kept unless its address doesn't exist, with the icon its home page names as the competitor's logo (`site_icon`, kept on the project's brand); the writing model's own list fills in when the search finds fewer than three. Measured on ChatGPT, 16 Nov: 66 seconds and $0.075 for the whole reading) and stops at `ready`: nobody is asked until the owner confirms the draft. `country` (two letters) is the owner's pick and wins; since 25 Nov 2026 step 1 sends none unless the owner picks one (its list started on Uzbekistan, and a website for US truckers was checked as Uzbek), and the market is the country the website's own text shows (`countryFrom` `site`), else Uzbekistan (`default`); the website's own view is kept beside the owner's pick (`siteCountry`). A reading of fewer than `THIN_WORDS` (150) words, a website that shows its text only with JavaScript, is said so (`thin`, `siteWords`): the profile is told to write only what the name shows, the audit leaves out the checks on the words and fails `js_only` in their place, and the research compares nothing (`site_unreadable`). 409 `domain_taken` when a project, anyone's, already follows the website: one website, one project |
| (free check) | One free check an account (16 Nov): `POST /first-runs` and `/start` answer 402 `free_check_used` when the account has a project or a check that asked the assistants. Not bound: an account paying for Enterprise, the emails in `TEAM_EMAILS`, replay mode |
| `GET /first-runs` | The account's first runs, newest first |
| `POST /demo-requests` `{name, phone, sector}` | The landing page's "Book a demo" (since 16 Nov; it went nowhere before): no login; an Uzbek number; kept in `demo_requests`, written to the log as `DEMO REQUEST`, and emailed to the team's own inbox (`SMTP_FROM` or `SMTP_USER`) when `SMTP_HOST` is set. The same phone again within ten minutes is kept once (204 either way) |
| (languages) | The questions are written in the country's languages (`firstrun.languages_for`, 16 Nov): `ru` and `uz` in Uzbekistan, `ru` in KZ, KG, TJ, TM, RU, BY, `en` elsewhere. A question's `language` is one of `uz`, `ru`, `en` |
| `GET /first-runs/{id}` | Its progress: `status` (queued, reading_site, ready, asking, reading_answers, done, failed), `answered`, `total` |
| `GET /first-runs/{id}/draft` | Once `ready`: what the website gave, for the owner to correct (`name`, `aliases`, `category`, `country`, `city`, `description`, `services`, `competitors`, `questions`, `brandQuestions`, `maxQuestions`), and since 25 Nov 2026 where the market came from (`countryFrom`: `owner`, `site`, `default`), the website's own country (`siteCountry`) and how much was read (`siteWords`, `thin`). 409 before |
| `POST /first-runs/{id}/market` `{country}` | Another market for a `ready` draft (25 Nov 2026): the website is read again for customers in that country, its questions in that country's languages and its competitors searched there; the run goes back to `reading_site` and its old draft is dropped. Counted as a website read (429 past the day's). 422 for a code that isn't a country, 409 unless `ready` |
| `POST /first-runs/{id}/start` `{name, aliases, category, country, city, description, services, competitors, prompts, brandQuestions}` | The draft as the owner left it: the check starts on exactly this (`firstrun.check`). The confirmed competitors are followed whether the answers name them or not, and the places left of five go to the businesses the answers name most; of the brand questions the first in each language is asked now and all are kept for the weekly checks. 422 without a name or a question, or with more than `FIRST_RUN_QUESTIONS`; 429 at the day's limit, which counts checks that asked, not websites read. Pressed twice, it returns the check that runs |
| `GET /first-runs/{id}/partial` | While the check runs: what the answers in hand say (`firstrun.partial_of`: who they name, by the names' standing in the text, the cited sites and pages, the latest answers' beginnings); null before the first answer. The page shows it as the check fills in |
| `GET /first-runs/{id}/result` | The first statistics, in the frontend's `Snapshot` shape and a little more |
| `POST /projects` `{name, aliases, domain, category, city, competitors, prompts, firstRunId?}` | The setup's last button: a project. With `firstRunId`, the first run's answers become its first check, for the questions that were kept. 409 `domain_taken` as above (also from `PATCH /projects/{id}` for a new website) |
| `DELETE /projects/{id}` | Removes the project with its checks, answers, questions, brands and fixes (204); its website is then free. The first run it came from stays |
| `GET /projects`, `GET /projects/{id}`, `GET /projects/{id}/prompts` | The account's projects; one; its questions |
| `GET /projects/{id}/report` `?language=&topic=&engine=` | The `Report` the dashboard's pages read, counted from the answers. `engine` (`chatgpt`, `gemini`): one assistant's answers alone, in every check; an assistant that didn't answer is ignored. `engines` lists the assistants of the latest check with their answers |
| `GET /projects/{id}/prompts/{promptId}/report`, `GET /projects/{id}/reports/{runId}` | The report over one question; the report as it stood at a run |
| `GET /projects/{id}/topics`, `/tags` | Counted from the questions |
| `POST`, `PATCH /projects/{id}/prompts`, `PUT`, `PATCH /projects/{id}/prompts/{promptId}` | Questions: add several (all or none; 409 at the plan's limit, 422 for a repeat), edit one, archive or track again, and for several at once a topic, tags, fact-checking |
| `POST /projects/{id}/topics`, `PATCH`, `DELETE /projects/{id}/topics/{topic}`; the same for `/tags` | Topics and tags; deleting a topic archives its questions |
| `POST /projects/{id}/competitors`, `PATCH`, `DELETE /projects/{id}/competitors/{brandId}`, `PATCH /projects/{id}/untracked-brands` | Competitors: one added gets the mentions the answers already hold under its name, one removed leaves them as an untracked name; hiding an untracked brand |
| `PATCH /projects/{id}` | The brand profile, and the brand questions (`brandQuestions`, replaced as a whole) |
| `GET`, `PUT /projects/{id}/facts`; `GET`, `PATCH /projects/{id}/report-settings`; `POST /projects/{id}/plan-requests` | The brand's facts against the plan's limit; where the report goes (connecting Telegram answers 501: no bot yet); a plan request, written to the log and emailed to the team's inbox with the account, the project and the command that switches the plan on (16 Nov) |
| `GET /projects/{id}/reports/{runId}/pdf` `?lang=` | The run's report as a PDF (503 when no browser is installed) |
| `GET /projects/{id}/waves/{runId}` | A check's data object and its metrics (report spec §10; `runId` `latest` is the newest finished check), read by the report's link like the report: `{wave, metrics}`. Since 21 Nov 2026 the report's scope card and its counts read it (no 0–100 score); see "The slot log and the data object" |
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

**Plans, and free then paid (the user's decision, 15 Nov 2026).** A new account's first check is free: ten
questions to Gemini and five of them to ChatGPT too (`FIRST_RUN_CHATGPT_QUESTIONS`; an assistant asked alone
gets all ten). The project saved from it is a trial (`billing.status` "trial", `projects.paid` empty): it
keeps its first check and is not checked again. We switch a plan on by hand, `python -m app.admin plan
<project id> start|business|agency` (`list` shows the projects), and from then the timer checks it:
**Standard** (`start`, $34.99 a month) on Mondays with 25 questions, **Pro** (`business`, $79.99) on Mondays
and Thursdays with 50 questions and the facts check, **Enterprise** (`agency`, custom price) for several
projects. `python -m app.weekly` run every day picks the projects due that day. Gemini is reached through
Vertex AI when `GOOGLE_CLOUD_PROJECT` is set (a credentials file, a plain POST, Google Search grounding; the
cited pages come as Google's redirect links and are followed to their real addresses). Gemini first answered
from this service on 15 Nov 2026: two first checks of ten questions on the server, about $0.52 each.

**The models that work for us (15 Nov 2026).** With `GOOGLE_CLOUD_PROJECT` set, Gemini on Vertex reads and
writes, not OpenAI: `READ_MODEL` (default `gemini-3.8-flash`) reads who each answer names, gathers the
spellings of one business and checks facts; `WRITE_MODEL` (default `gemini-4-hydrogen`) writes the website's
profile and questions, the first check's conclusion and the briefs. Measured on a saved run's ten answers:
Gemini 4 Hydrogen, Gemini 4 Argon and Gemini 3.6 Flash each read them as `gpt-6.1-terra` had (Hydrogen
differed on one answer's recommendations), but both Gemini 4 models sometimes held a call for 70 to 130
seconds, and 3.6 Flash never did: so reading, which is many calls at once, is on Flash. A reading call has 30
seconds and a writing call 60; after that `gemini-3.8-flash` does it, then `gpt-6.1-terra` when an OpenAI key
exists. An answer with Google Search has 75 seconds, then is asked again (ten answers once took 348 seconds
without that limit, and 54 with it). The first check's result carries `conclusion` (`uz`, `ru`, `en`): three
sentences worded from the counts, or null when the model failed. Later the same day the user chose
`gemini-3.8-flash` for the Flash roles: it answers the customers' questions (`GEMINI_MODEL`), reads and stands
in. It read the same ten answers as `gpt-6.1-terra` had, in 13 seconds. Google Search is on for every
question asked, but Gemini decides itself whether to search: one answer in five came without a search, so such
an answer is asked once more. The reading and writing models have no search: they work on text they are given. Also that day: Gemini is
told where the customer is (the city and the country's code, as a system instruction; it had been told
nothing, and answered about Tashkent whatever the project's city), and ChatGPT's search is mandatory
(`tool_choice: required`), so no answer comes from memory alone.

**The brand questions (15 Nov 2026).** Beside the customers' questions a first check asks each assistant about
the business by its name, in Russian and in Uzbek (ChatGPT in Russian only when Gemini is asked too): what it
does, its prices, where it is, what people say. These answers are never counted in the scores. The writing
model turns each into up to six short statements in the three languages, by topic, and checks each against
the website's text: `confirmed`, `contradicted` (with what the website says) or `unverified`; and says whether
the assistant `knows` the business, `confuses` it with another, or finds nothing (`unknown`). The result
carries them as `brandView`, the conclusion is told of them, and the raw answers are kept as `brandAnswers`.
A first check on Gemini alone with them: 256 seconds and $0.56 before the brand answers were read alongside
the others.

**Brand questions in the setup and in every check (15 Nov 2026).** The profile step also writes four brand
questions for the business (two Russian, two Uzbek: prices, opinions, a main service, how to find it), and
the result offers them as `brandQuestions` after the two general ones (`asked` marks those this check asked).
In the setup the client keeps, drops or adds to them, six at most; `POST /projects` takes `brandQuestions`
(left out: the general two; an empty list: none) and the project keeps them (`projects.brand_questions`,
`Project.brandQuestions`). The first check's brand answers to kept questions are saved on its run, and a
weekly check asks every brand question to every assistant, reads the website again and saves the statements
(`runs.brand_view`, `Report.brandView`). Tried offline with stand-in answers, and the profile step once for
real. Since 16 Nov the Overview shows `Report.brandView` and Sozlamalar › Brend savollari edits the list:
`PATCH /projects/{id}` takes `brandQuestions` and replaces them as a whole (the same cleaning and limit); they
are asked from the next check on. Also since 16 Nov the brand answers feed Notoʻgʻri faktlar
(`fixes.brand_facts`, at the start of `fixes.sync`, so after a project is made and after every check): each
statement of the latest check that the website contradicts is kept as a wrong fact without a question of the
project's (`prompt_id` empty), in the report's language with its three languages, its brand question and its
assistant in `details`; the run is then marked as checked for facts, and each such fact gets its action in
Harakatlar. No model is asked for it. A fact not stated again at the next check leaves the list.

**Projects** (`app/projects.py`, 15 Nov 2026: the reads, then the same day the writes). Tables: `projects`, `brands` (the client's own and
the competitors, in a fixed order), `prompts`, `runs`, `answers`, `mentions` (every business an answer names;
without a brand id when the project doesn't track it: the "new competitor" list) and `citations`. Saving a
first run matches its competitors and questions to what the client kept in the setup, by name and by text: a
competitor the client dropped becomes an untracked name, one the client added is looked for in the answers'
text, a question the client removed loses its answers, a new one waits for the next check. The report is
counted in plain code from those rows for any set of questions (with no condition score since 21 Nov 2026: the
report's counts are the data object's, below). A new project is a trial with Standard's limits (`DEFAULT_PLAN`,
`billing.status` "trial") until a plan is switched on by hand. The plan's limits on questions, competitors and
facts are enforced. Not built: suggested questions (they need a model), facts read from the website, inviting
members.

**The weekly check** (`app/weekly.py`, 15 Nov 2026; **first run against the assistants on 16 Nov**, on the
server: the user's own site on Standard, 20 answers of 20 on both assistants, the six brand questions and a
page's brief, 413 seconds, $1.63; `PLAN.md`, change log). `python -m app.weekly`
checks every project, `--project <id>` one. It asks each tracked question to every assistant with a key,
`RUN_SAMPLES` times (default 1), five at a time, a failed one twice more; reads the answers as a first run does;
gathers the spellings of each business with the tracked brands' names among them; keeps what earlier checks
found about each cited site and reads the five most cited new ones. With `FIRST_RUN_REPLAY=true` it asks
nobody and saves the project's latest check again as a new one: that is how it was first tried. On the server
the timer `geo-weekly` starts it every day at 01:00 UTC (installed 15 Nov; it checks only paid projects due that
day: one since 16 Nov, the user's own site, every Monday until it goes back to a trial), with `WEEKLY_RUNS=true`
so the report names the next check.

**Fixes** (`app/fixes.py`, 15 Nov 2026). After a project is made and after every check, the most cited pages
on sites a business can be listed on are opened (plain HTTP, up to 15, no model) and it is kept which tracked
brands each names: `Source.brandListed` and `CitedPage.mentions`. Then the actions are made by rule from the
latest check: a listing for each cited site without the client (news, directories and social pages; any other
site only when a page of it names two or more tracked competitors; at most eight), a page to write for each
topic whose questions name competitors and never the client, a fix for each failed site check, a correction
for each wrong fact. An action's `key` never changes, so the client's status survives the next check; an
untouched suggestion that is no longer called for goes. Proof: the client's visibility on the action's
questions in the last check before it was done and in the latest one. Two parts use a model and run only
inside a live weekly check: the briefs of content actions (also when a page is added by hand), which first ran
in the live check of 16 Nov, and wrong facts against the owner's facts (each answer that names the client, read
against the facts in Sozlamalar › Faktlar; `Report.factsChecked` says whether it happened), which **has never
run**: Standard keeps no facts, and no Pro project has been checked.

**The report's delivery** (`app/delivery.py`, 15 Nov 2026). `GET /projects/{id}/report`,
`/reports/{runId}` and `/actions` answer without login: the report's page is the link a client shares, and the
project's id (32 random characters) is what the link's holder knows. The PDF is that page
(`FRONTEND_ORIGIN/{lang}/projects/{id}/report?run=`) printed by a headless Chrome, so paper and page can't
differ. After a weekly check the report is emailed to the address in the project's report settings, in the
language chosen there: the answers naming the client of all of them, the questions naming it, who is named
most with every brand that ties (from the data object since 21 Nov 2026; it said the condition score and a place),
the link, the
PDF attached (sent without it when no browser is found). `python -m app.delivery <project id> [<run id>]`
sends one again. Tried on this computer: the page without login, a 10-page PDF, the email into a local test
mail server. On the server it needs Chrome or Chromium installed and `FRONTEND_ORIGIN` set to the public site.

**Without paying** (`FIRST_RUN_REPLAY=true` in `backend/.env`): a first run replays the latest saved one over
about ten seconds and asks no assistant; its result carries `replayed: true`. For building pages. Never on the
server.

## The slot log and the data object (21 Nov 2026, Phase 0 items 0.1 to 0.4 of the report spec)

**The slot log** (`app/slots.py`, table `slots`): every call a check plans to an assistant, written before
anything is asked, and closed with what came of it (report spec §6.1). A slot is one question (or brand
question) to one assistant for one run: its wording and language, `discovery` or `branded`, the engine, the
run, the location the call was told (`{country, city, timezone, set, how}`: ChatGPT's `user_location` is set;
Gemini on Vertex is told the place in one sentence of its instructions, which is no location setting), and
then its status: `completed` (with the model, the cost, whether it searched the web, the answer's row),
`failed` (with a reason code and the error) or `excluded` (left out, with why: the free first check asks
ChatGPT half the questions, `free_check_subset`). A retry fills its own slot. The first check writes its slots
against its first run (`first_run_id`), and `projects._save_first_run` hands those of the questions kept to the
project's first check; the weekly check writes them against its run, inside its own transaction. A check made
before the log has its slots rebuilt when it is read, each marked `reconstructed`, from what it saved: a first
check from its first run's plan and answers (nothing failed when every planned answer came back), a weekly
check from its answers. So the baseline's 20 slots, 15 completed and 5 excluded, come without a write to the
live database.

**The data object** (`app/wave.py`): one finished check as report spec §10 has it, the parts Phase 0 uses, as
a validated model: the project, the wave (its number among the checks, baseline or not, runs per question, a
hash of the settings two checks must share to be compared), the questions, the slots, the answers (each with
its run on its assistant, what it names and cites), and the brand-question check. **The metrics**
(`app/metrics.py`) are every number the report shows, computed from the object alone; since 0.1 the scope card
(spec §4.0): the assistants with their models, surface, location and how many answers searched the web, what
is not checked yet, the questions, the answers planned against completed, excluded and failed with why, the
answers by language, the brand questions apart, the brands. Since 0.2 (21 Nov 2026, in the place of the 0–100
condition score, which is gone from the report's API, `conditionHistory`) also `visibility`, the headline count:
the buyers' answers naming the client of all of them (`small_sample` under 20), the questions it was named in, and
the answers citing its site of the answers citing any site (spec §6.3); and `brands`: every tracked brand's count,
its rank (ties share it, a brand named nowhere has none, `leaders` holds more than one when they tie), its tone
per mention (a word only from 3 mentions, nothing at none: never a default), its place only where an answer names
it in a numbered list, the answers citing its site, and share of voice only from 10 mentions of the tracked
brands. Brand questions' answers are never counted in them. The report's `history` carries each check's
`answers` and `named` for Hisobotlar's register, and the report's email (`app/delivery.py`) tells the count, the
questions and who is named most, from the object. Since 0.3 (21 Nov 2026) one rounding rule, `metrics.share`
(a whole percent, half up), which the report shows beside its count, and the counts of the report's other
sections: `assistants` (each assistant's answers, those naming the client, who it names most), `topics` and
`languages` (each group's answers, the client's count, the competitors named most, ties together), `sources`
(each cited site once an answer, over the answers that cite any site, spec §6.3; the sites by type, in sites; the
placement targets), `top_finding` (0.5: the buyer question where tracked competitors are named in the most answers
and the client in none, else beside it, else the client alone, else the open shelf; ties to more answers, then the
questions' order; its answers' ids, the competitors named, the client's count) and `claims` (the brand-question check's verdicts, verified, unverified, contradicted, apart from
every count of the buyers' answers). A done action's proof carries its counts (`proof.counts`). Kept like the
report, until the project changes. Tested on the baseline client's check and with stand-in assistants:
`tests/test_wave.py`, `tests/test_metrics.py`, `tests/test_domains.py`.

**The cited sites' types** (0.4, 21 Nov 2026; `app/domains.py`, table `domain_types`): each cited site in the object
(`domains`) has the spec's type (§4.6: `client_owned`, `client_managed`, `competitor_site`, `directory`, `media`,
`ugc`, `telegram`, `reference`, `platform_docs`, `unclassified`), who controls it (`owned`, `managed`, `earned`,
`not_addressable`), the route onto it (`{how, url}`: a listing page, a form or the editors' contact), who typed it
(`seed`, `automated`, `founder-reviewed`), whether it lists the client and the tracked competitors beside it. The
type comes from the first that knows it: the project (the client's site, a tracked competitor's), a review by hand
(for one project or all), the seed list in `domains.py` (spec §9's sites for Uzbekistan, Kazakhstan and Kyrgyzstan,
the platforms' help pages, social networks, Telegram, search engines), the AI's answer, else `unclassified`. The AI
(`domains.classify`, the reading model) is asked once per site and project, at the end of a live check (`weekly.py`)
and when a first check becomes a project (`fixes.after_creation`): one call for the sites nothing else types, under a
cent, added to the check's cost; never in a replay or without a model. A route comes only from the seed list (each
opened and read on 21 Nov 2026) or a review, never from the AI (the user's decision, 21 Nov 2026). A "get listed"
action is made only for a placement target (spec §7, `domains.placeable`): a directory, media, UGC or Telegram site
with a route, a competitor beside it and the client not on it; an untouched one that no longer qualifies stops
showing at once (`fixes.listed`) and goes at the next check. The report's `topSources` keep the six kinds the other
pages show (`type`, from `domains.kind`) beside the new fields. By hand:

```bash
python -m app.admin domains                                    # each project's latest check: its unclassified sites
python -m app.admin domain <domain> <type> [--project <id>] [--route listing_page|form|editor_contact <url>]
python -m app.admin classify <project id>                      # the AI types the latest check's unknown sites (paid, under a cent)
```

**Runs** (0.6, 21 Nov 2026): `python -m app.weekly --project <id> --runs 3` makes one check that asks each question
3 times on each assistant (the paid First Audit, spec §6.2; 1 to 5), after printing the answers it plans and their
likely cost at the project's last check's price an answer. Each run is a slot of its own (`run_index`); every count is
over all the answers, a question counts as covered when the client is named in one run. Weekly checks stay at
`RUN_SAMPLES` (1), the user's decision of 21 Nov 2026: three runs would cost Standard more than its price.

The pages keep a report two minutes, so a site typed by hand shows within that.

**Location** (0.7, 21 Nov 2026; `app/places.py`): every call is told a city, the project's (or question's) own, else
its market's main city (Uzbekistan Tashkent, Kazakhstan Almaty, Kyrgyzstan Bishkek: spec §9.1, the user's decision),
with the country's time zone. ChatGPT takes them as its search tool's `user_location`. Gemini on Vertex takes the
city's latitude and longitude as its Google Search grounding's location (`toolConfig.retrievalConfig.latLng`, for
the cities in `places.COORDINATES`) besides the sentence in its instructions: tried once on the server on 21 Nov
2026 (accepted, 12 cited pages, $0.035), which answers spec §9.3's first question for Vertex. The slot log says
how each call was located (`user_location`, `lat_lng`, or `instruction` for a city without coordinates and for every
Gemini call before 0.7). A check made before keeps what it was told (the baseline: Uzbekistan, no city).

**The Free Snapshot and the Telegram digest** (0.8, 21 Nov 2026): `GET /snapshots/{firstRunId}?lang=` (no login, like a
report's link) is a free first check's one page once it was saved as a project: its data object, metrics and digest.
The metrics add `shelf` (each buyer question by who holds its answers: competitors, the client, both, nobody) and
`providers` (every business named, once an answer, untracked ones by their spelling). `app/digest.py` writes a
check's six lines in uz, ru or en from the data object only (the check before it for the change, the plan's first
open action for the action); `GET /projects/{id}/waves/{runId}/digest?lang=` serves them, and the report's email
opens with them. The snapshot's request for the First Audit goes through `POST /demo-requests` with `about` (a new
nullable column `demo_requests.about`, added at start), emailed to the team.

**Topics** (0.9, 21 Nov 2026): `metrics.topic_ranking` says which topics have at least 3 buyer answers (`eligible`) and
whether at least 3 do (`ranked`, spec §6.3). A page about a topic is suggested only for a topic of 3 answers or more
where competitors are named and the client never (`fixes.content_allowed`, the user's choice of 21 Nov 2026); an
untouched one that no longer qualifies stops showing at once and goes at the next check.

**Free Snapshots for prospects** (22 Nov 2026, for the demand test: report spec §2, §4.14, §8): `python -m
app.prospects <websites.txt> [--account <email>] [--lang uz|ru|en] [--out <file.csv>] [--dry-run]`, on the server.
For each website in the list (one a line, optionally `, <country code>`) it makes the free first check without its
screens: the site read, the profile, questions and competitors as the website gives them (no founder review, as spec
§8 sets for the snapshot; the user's choice), the assistants of `ANSWER_ENGINES` asked into the slot log, then the
check saved as a trial project on the team's account (`--account`, else the first of `TEAM_EMAILS`) as "Save" does
in the app, the sites typed and the cited pages read. It prints and writes to a CSV (beside the list) each site's
snapshot link (`FRONTEND_ORIGIN/<lang>/snapshot/<first check>`), the digest's lines and the whole digest, the cost,
the questions and the competitors. A website that has a project is skipped, so a list can be run again after a stop;
`--dry-run` prints what the list would cost and asks nobody. About $0.6 and five minutes a site on ChatGPT alone. It
refuses to run with `FIRST_RUN_REPLAY` on. Test: `tests/test_prospects.py` (stand-in assistants).

**Limits against abuse** (22 Nov 2026, the user's numbers; `app/limits.py`, the table `limit_hits`, kept two days):
a login code sent 5 an hour and 20 a day from one connection and 300 a day in all (the Gmail account's sending
limit); a free check asked 2 a day from one connection and `FREE_CHECKS_A_DAY` (20) in all; a website read for a first
check 6 a day from one connection; a request form (demo, First Audit) 3 a day from one connection and one a phone a
day, past which it is answered as sent and dropped. The team's accounts and a replayed check aren't counted. A limit
for everyone emails the team once that day. The connection is `x-vercel-forwarded-for`, else the first of
`X-Forwarded-For`, else `X-Real-IP`; the login-code route logs the three until a real login through the site has shown
which one Vercel sends. Refused: 429 `too_many_codes`, `first_run_limit` (one connection) or `free_checks_busy` (all).

**Guided tours seen** (23 Nov 2026): `users.seen_tours` (a list, added at start) holds the pages' tours an account has
seen; `GET /auth/me` returns it as `seenTours`, and `POST /auth/me/tours` `{"tour": "<id>"}` adds one (an id of
letters, digits, `-` or `_`, at most 60 kept), so a tour starts by itself once per account, on any device.

**Why AI names them, not you** (23 Nov 2026, report spec §4.5, brought forward from Phase 1 at the user's "Build research
+ decision page"; `app/research.py`). For each buyer question whose answers name some business and never the client
(`lost_questions`), the page an answer cited for that business (its own site, by name or tracked domain) is read
beside the client's site (the first check's `siteText`, else read again), and the reading model returns what that page
states and the client's doesn't (each fact in uz, ru and en with the page's words), the client's closest page and
passage, and a section to add. Checked in code before it is kept: a quote not word for word on its page is dropped, a
fact with a figure or a missing language is dropped, a number in the section not on the client's site becomes "[…]",
an address of the client's not read is dropped; the sentence about the business is cut from the answer by code. Each
finding is `automated`, with a status (`compared`, `no_page`, `unreadable`, `failed`). Kept on the run (`runs.research`:
at, model, cost, questions, items) and served as the report's `research`; run after a project is saved
(`fixes.after_creation`, before the actions) and after every weekly check, or by `python -m app.admin research
<project>`. Page actions carry their questions' facts (`fixes.missing_facts`, `details.missing`), and their briefs
read them. A new project gets a brief for every page to write (`write_briefs(limit=None)` in `fixes.after_creation`,
24 Nov 2026: the user's live test had 5 of 7, and a free project has no next check); a weekly check writes five;
`python -m app.admin briefs <project>` writes the missing ones. Measured on a 10-question free check: 62 s, $0.11 on Gemini (no Google Search). Tests: `tests/test_research.py`.

**The user's test of 23 Nov 2026.** A check that ends is saved as its account's project in the same transaction
(`main._finish_and_save`, `projects.first_run_body`), and its `GET /first-runs/{id}` says `projectId`, so the page opens
the dashboard; when it can't be saved (the website taken meanwhile, a plan's limit) it is only done, and "Save" on its
page works as before. The login code is stored and answered at once and emailed in the background; one that couldn't be
sent is dropped, so asking again isn't held back. The website audit (`firstrun.audit`, by rule) has ten checks: the
first four, then `no_prices`, `no_faq`, `no_sitemap`, `no_llms_txt`, `weak_meta` (the home page's title, description
and H1) and, for Uzbekistan, `one_language`; a check that can't be judged is left out. The actions (`fixes.suggested`):
a page about every topic whose answers name other businesses (tracked or not, `others` on each answer of the report)
and never the client; a "get listed" action for every directory, media, UGC or Telegram site the answers cite and the
client isn't on (`domains.placeable`: no route or competitor required, a route only from our list or a review); briefs
are written right after a project is saved (`after_creation`), with who the answers named and the pages they cited.
`python -m app.admin audit <project id>` reads and checks an existing project's website again and brings its actions in
line (no assistant asked; briefs on the writing model). Tests: `tests/test_recommendations.py`, `tests/test_queue.py`.

**The free checks' queue** (22 Nov 2026, the user's choice when the OpenAI balance was about $2: "Cap at 2 a day +
queue", run "by hand"; `app/queue.py`): past `FREE_CHECKS_A_DAY` for everyone a confirmed free check isn't refused, it
waits (`first_runs.status` `waiting`, what the owner confirmed and the page's language kept in its `draft`), 2 a day
from one connection; it is the account's one free check, so another website shows it. The draft says so before the
press (`queue: true`: step 4 reads "Join the queue"), and a website read past the limit skips the competitors' search
on ChatGPT, the profile's own list taking its place (`competitorsSearched: false`: step 3 says so). A waiting run's
`GET /first-runs/{id}` carries its `place` and the `email` its report goes to. Since 25 Nov 2026 (the user's "Run it by
itself") the server asks the queue every 15 minutes (`deploy/geo-queue.timer` and `.service`, `python -m app.queue
--auto`): the waiting checks in order, as many as the day's free checks have room for, each counted among them (a
`limit_hits` row `check`/`queue`) before it is asked and emailed when done; the server can't read the OpenAI balance, so
a request of a few tokens first tells whether OpenAI takes requests (`openai_ready`), and while it says the balance is
empty nothing is asked and the team gets the alert. By hand: `python -m app.queue` lists it in order with what it
would cost, and `python -m app.queue --run N` asks the first N one after another, whatever the day's limit, as the site
would, and emails each one done a link to its results in its language (it refuses while `FRONTEND_ORIGIN` is localhost). A check whose call found the balance
empty (OpenAI's `insufficient_quota`) goes back to its place, its slots dropped, whether from the queue (the run stops
there) or from the site (the visitor sees the queue, not a failure). Test: `tests/test_queue.py` (stand-in assistants,
emails kept in a list).

**Paying with Stripe** (22 Nov 2026, `app/billing.py`; the user has a Stripe account; its Standard and Pro monthly
prices were made by hand in Stripe's dashboard the same day and are taken by `setup --use start:month=price_…
--use business:month=price_…`, which gives each our lookup key and makes the yearly prices on the same products): Standard ($34.99 a month,
$349.90 a year) and Pro ($79.99, $799.90; the user's prices of 22 Nov, were $39.99 and $89.99) through Stripe's checkout (`POST /projects/{id}/checkout` → the page's
address) and Stripe's billing page (`POST /projects/{id}/billing-portal`: change plan, card, cancel at the period's
end, invoices). Stripe's webhook (`POST /stripe/webhook`, its signature checked) reads the subscription again from
Stripe on every event (they can come out of order) and keeps the project's plan, cycle, status (`billing_status`),
`paid` and `paid_until`; a failed payment ("past_due", "unpaid") sets `paid` false, so the checks pause until it goes
through (the user's choice). The weekly timer reads each Stripe subscription again before deciding. The trial (the
user's choice): a project's first check is free, for 7 days the pages say how many are left, then that it ended; its
report stays. Enterprise and Managed GEO stay by agreement (`app.admin plan`). Set up once, in test mode first:
`python -m app.billing setup --webhook-url https://geo-api.shopsready.com/stripe/webhook --env-file .env` on the
server makes the products and prices (lookup keys `seenova_<plan>_<cycle>`), the billing page's settings and the
webhook, and writes its secret into `.env`. Test: `tests/test_billing.py` (stand-ins for Stripe, events signed as
Stripe signs them).

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
- Its `.env` holds the OpenAI key and the Google credentials (15 Nov); since 21 Nov `ANSWER_ENGINES=chatgpt`, so `/health` lists `chatgpt` alone (Gemini with Google Search paused for Google's terms; Gemini still reads and writes).
- To update: copy `app/` and `requirements.txt` (rsync), `pip install -r requirements.txt` in its `.venv`,
  `systemctl restart geo-backend`.
- **Backups** (since 24 Nov 2026, the user's "Backups + failure alerts"; the free Supabase plan keeps no copy that can be
  restored): the timer `geo-backup` (`deploy/geo-backup.timer`, every night at 02:30 UTC, after `geo-weekly`) runs
  `deploy/geo-backup.sh` as root: `pg_dump` 17 from Docker (`postgres:17`; the server has no client, and the database's
  address answers over IPv6 alone, so on the host's network), the `public` schema in Postgres's custom format, into
  `/opt/geo-backend/backups/geo-<date>.dump` (readable by root alone), the last 7 kept. The password goes to Docker
  through a file, never the command line. A failure emails the team. Installed from `deploy/`: the script to
  `/opt/geo-backend/deploy/`, the two units to `/etc/systemd/system/`, `systemctl enable --now geo-backup.timer`. Run it
  now: `systemctl start geo-backup.service`; see it: `journalctl -u geo-backup`. The first copy (24 Nov, 460 KB in 15 s)
  was restored into a throwaway Postgres 17: all 17 tables and 513 rows as in the live database.
- **To restore a copy** (it replaces the tables' contents): stop the service (`systemctl stop geo-backend`), write the
  database's address (`DATABASE_URL` with `postgresql://` in the place of `postgresql+psycopg://`) as `PGURL=…` into a
  file only root reads, then `docker run --rm -i --network host --env-file <that file> postgres:17 sh -c 'pg_restore
  --clean --if-exists --no-owner --no-privileges --dbname "$PGURL"' < /opt/geo-backend/backups/geo-<date>.dump`, remove
  the file and start the service (`create_tables` locks the tables again at start).
- **Alerts** (`app/alerts.py`, since 24 Nov 2026): an email to the team's accounts (`TEAM_EMAILS`, else the sender's
  address) when a visitor's free check fails (at most one an hour), a project's check by its plan fails, the OpenAI
  balance is found empty (a check then goes back to the queue), or the night's copy fails (each at most once a day).
  Recorded beside the limits' hits (`limit_hits`, kind `alert:<kind>`); printed in the log either way; never emailed
  from this computer (replay). `python -m app.alerts test` sends one to see them arrive (sent on 24 Nov).
- **The admin page** (`app/superadmin.py`, 25 Nov 2026: the user asked for a super-admin login and a dashboard of the
  users, the brands registered and the waiting list, approving a waiting check there, and their reports to read): `/admin`
  on the site, behind its own login, apart from the accounts' email codes. A name and a password: `ADMIN_USERNAME` and
  `ADMIN_PASSWORD_HASH` in the server's `.env`; without both the routes answer 404. The password is kept only as a
  hash (PBKDF2-SHA256, 600,000 rounds, 0.65 s a try on the server); `python -m app.admin password` asks for one twice
  and prints the line, and a new one ends every admin session. A login is the `geo_admin` cookie (httpOnly, 12 hours),
  signed with the hash. Wrong logins are counted in `limit_hits` (kind `admin_fail`): 5 an hour from one connection
  shut it for that connection, 20 an hour from everyone shut it for everyone and email the team (`admin_locked`);
  `python -m app.admin unlock` opens it again. Routes, each needing the cookie: `GET /admin/me` (the name and how many
  checks wait), `/admin/overview` (accounts and projects with those of the last 7 days, the day's free checks, the
  free checks by state, what checks cost), `/admin/projects` (each project's owner, plan, checks, its latest check's
  buyer answers naming it of all of them, its report's and snapshot's link), `/admin/users` (each account's projects,
  free check and last login), `/admin/waiting` (the queue in order and the checks being asked), and
  `POST /admin/waiting/{id}/approve`: the check starts at once, counted among the day's free checks even past their
  limit, asked as the queue asks one and emailed to its account when done; 409 when it isn't waiting any more. A
  waiting check is taken in one statement (`queue.claim`), so the 15-minute timer and Approve never both ask it.
  Everything else on the page is read-only: the reports open by their own link.

## Not built yet

- The frontend calls this service for the login, the first check and every project's page
  (`NEXT_PUBLIC_LIVE=auth,first-run,projects`). Not served: the old free check (`POST /snapshot`), the old
  setup's suggestions (`/onboarding/*`), support messages; suggested questions and members answer empty.
- Gemini through a key (the Interactions API) has never run; through Vertex it has (15 Nov).
- Supabase's own login (its email with the code) is written and was set aside on 15 Nov: its emails kept the
  default sign-in link, so this service sends the code itself. Google login is not written.
- A browser on the server for the PDF; the report in Telegram; suggested questions; facts read from the
  website; leaving AI assistants ("ChatGPT", "Claude") out of the untracked brands; and everything else in
  `PLAN.md`.
- A first run is done in a thread of the web process: fine for a start, a queue when there is traffic.

## Speed (17 Nov 2026)

The server is in Germany and Supabase's database in Mumbai: a statement costs about 0.12 s and a new connection
2 s. So every request counts its round trips:

- Requests that only read use `ReadSession` (autocommit: no BEGIN and ROLLBACK), through `in_project(…, read=True)`.
- The pool keeps its connections open (TCP keepalives) and tries one only after it rested two minutes (`db.py`),
  not before every request.
- `app/cache.py` keeps a session's user for a minute (logging out and renaming drop it) and a project's report and
  actions until the project changes: a middleware marks a project changed after any request that writes to it,
  and a report is reused only for the same latest check, two minutes at most (the weekly check writes from its
  own process). One uvicorn process, so a dictionary is enough; with several workers this needs a shared store.

Measured on the server against Supabase: the report 3.4 s → 0.14 s when kept (2.2 s after a change), the actions
2.0 s → 0.14 s, the session check 0.56 s → 0.14 s and nothing while kept. A database next to the server would
make each statement a few milliseconds.

## The report as a PDF (18 Nov 2026)

`GET /projects/{id}/reports/{run_id}/pdf?lang=` prints the report's page with Chrome (`delivery.pdf`) and answers
the file (`seenova-<site>-<date>.pdf`). It is read by the report's link, like the report, and a made PDF is kept
until the project changes (`app/cache.py`). `/health` says `"pdf": true` when Chrome is found and the report's page
is at an address Chrome can open (`FRONTEND_ORIGIN`; on the server not `localhost`); the frontend's PDF buttons
download the file then, and open the print dialog otherwise. On the server it needs Chrome or Chromium installed
(`CHROME_PATH` if not in the usual places) and `FRONTEND_ORIGIN` set to the site's public address, which must open
without Vercel's login. On this computer: 6.5 s for a first PDF, then from memory.

