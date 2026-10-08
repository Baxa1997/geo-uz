# Backend plan

The frontend is built first, on mock data. This file collects what the backend has to do so that every page keeps working when the mocks are switched off (`NEXT_PUBLIC_USE_MOCKS=false`).

It does not repeat the API contract. The endpoints and types are in `frontend/CLAUDE.md` ("API contract") and `frontend/src/shared/types/api.ts`. This file says what is behind them: the tables, the weekly run, how each number is calculated, what each page needs, what it may cost, and what is still undecided.

Keep it current: when a page of the frontend is finished and corrected, add what it needs to "What each page needs" and a line to the change log at the end.

Status: first version, written from the pages built by 5 October 2026. Nothing here is implemented.

## What the backend does

1. Logs people in by phone (SMS code) or Telegram and keeps their projects.
2. Reads a website and suggests the brand profile, competitors and questions (onboarding, free check).
3. Every week asks ChatGPT each project's questions, three times each, with web search on.
4. Reads the answers: which businesses are named, in what order, in what tone, and which pages are cited.
5. Reads the cited pages: which tracked brands each page names.
6. Calculates the scores, finds wrong facts, and makes the list of recommended actions.
7. Serves all of that as one report per project, and later sends it to Telegram.

The frontend never calls an AI provider and holds no keys.

## Build order

| Step | What | Why first |
| --- | --- | --- |
| 0 | A script with no API and no database: 20 questions, 3 samples each, for two real Tashkent businesses | It answers the three questions everything else depends on: what one answer costs, whether the answers are the ones a person in Tashkent gets, and how well brands, order and tone can be read from them |
| 1 | Database, the run pipeline, `GET /projects/{id}/report` for one project entered by hand | The report feeds eight of the app's pages |
| 2 | Login, projects, questions, run progress | The app works end to end without mocks |
| 3 | Onboarding endpoints and the free check | New clients can start by themselves |
| 4 | Reading cited pages, "is the brand listed", wrong facts | Sources, gaps and the wrong-facts page become real |
| 5 | Actions and their proof | The "what to do" part |
| 6 | Weekly Telegram report, PDF | Needs everything above |

## Data model

One row per line. Columns are the ones the frontend already depends on; add what the implementation needs.

| Table | Holds | Notes |
| --- | --- | --- |
| `users` | name, phone, Telegram id and username | Phone or Telegram, either may be empty |
| `sessions` | session token, user, expiry | The `geo_session` httpOnly cookie |
| `login_codes` | phone, code hash, expiry, attempts | Six digits; `resendIn` seconds between sends |
| `projects` | owner, category, city, languages, description, services, plan | The API sends the plan and what it allows: `limits.prompts`, `limits.competitors` |
| `brands` | project, role (own or competitor), name, spellings, domain, order | The order of competitors fixes each brand's chart color, so it must be stable. A competitor added later goes last |
| `dismissed_brands` | project, name | Untracked brands the client hid from the suggestions (`untrackedBrands[].dismissed`) |
| `prompts` | project, text, language (uz, ru), topic, created at, archived at | Archived = not asked any more; its answers stay. See open question 5 on edits |
| `prompt_suggestions` | project, text, language, topic, status (offered, accepted, rejected) | A rejected one is never offered again |
| `runs` | project, kind (first, weekly, snapshot), status, model, web search, samples, started, finished, total, answered | Status: queued, running, analyzing, done, failed |
| `answers` | run, prompt, sample number, text, the web searches it ran, raw response | Keep the raw response: extraction rules will change. The searches come from the search tool's own report of each call |
| `mentions` | answer, brand (empty when not tracked), name as written, position, tone | Untracked names are kept too: they are the "new competitor" list |
| `citations` | answer, URL, domain | URL without `utm_source`, domain without `www.` |
| `source_types` | domain, kind (directory, news, social, other) | Our own list for Uzbekistan; "own" and "competitor" come from the project's domains |
| `pages` | URL, domain, last read, readable or not | Shared by all projects, read once |
| `page_mentions` | page, project, brand | Which tracked brands the page names |
| `listings` | project, domain, listed or not, checked at | `Source.brandListed`; see open question 4 |
| `wrong_facts` | project, claim, correct value, prompt, run that first found it, run that last saw it | `foundAt` is the first run's date |
| `brand_facts` | project, statement | Not built in the frontend yet ("Next") |
| `site_checks` | domain, check, passed, checked at | Four checks, listed under "Rules" |
| `actions` | project, stable key, kind, details, impact, prompt ids, status, steps done, created, done at, proof | The key must not change between runs, or the client's status is lost |
| `scores` | run, brand, the four numbers | A cache over all questions; filtered views are calculated from `mentions` |
| `snapshots` | id, domain, category, city, the result | The free check |
| `demo_requests`, `support_messages` | as sent | Forward both to our own Telegram |

## The weekly run

Runs start on Monday at 06:00 Tashkent time (01:00 UTC). A new project's first run starts as soon as it is created with questions. The report always shows the latest finished run; until the first one finishes it is empty and the progress screen polls `GET /runs/{id}/progress`.

1. **Ask.** Every tracked question (not the archived ones), three samples, through OpenAI with web search on. The request must say where the user is (Uzbekistan and the project's city), so the answer is the one a local customer gets. Count `answered` as the answers come in: the progress screen shows it against `total` (questions × samples).
2. **Cut out the citations and the searches.** Unique URLs per answer, without the `utm_source=openai` tag the search tool adds; and the search queries the tool ran for the answer, in order (`Answer.searches`, empty when it answered without searching).
3. **Read the answer** (status `analyzing`). List every business the answer names, in order. Position counts all of them: a tracked brand named after two untracked ones is at position 3. Give each mention a tone: positive, neutral or negative. Match names to tracked brands through their spellings, Latin and Cyrillic. Any model may do this step.
4. **Keep the untracked names** with the number of answers naming each.
5. **Sort the cited sites into kinds**: the client's own domain, a tracked competitor's domain, then our list (maps, catalogs and review sites; news; social networks and Telegram channels), otherwise "other".
6. **Read the cited pages** that are new or old, and record which tracked brands each names. A page that can't be read gets no result (the frontend shows "not read" and leaves it out of the gap list).
7. **Check listings**: for each cited site, whether the client is on it.
8. **Find wrong facts** about the client in the answers.
9. **Calculate the scores** for the run and store them.
10. **Rebuild the actions**, keeping the status and ticked steps the client set, and fill in the proof for actions marked done before this run.
11. **Mark the run done.** Later: send the Telegram report.

If some answers fail, retry them; a run with missing answers should still finish and report on what it has, with the real count as the base of every share.

## How each number is calculated

All of these are per brand, over the answers of one run.

| Number | Formula | Shown as |
| --- | --- | --- |
| Visibility | answers naming the brand ÷ all answers | Percent |
| Share of voice | mentions of the brand ÷ mentions of all tracked brands | Percent |
| Average position | mean position over the brand's mentions; empty if never named | "#1,8" |
| Tone | mean over the brand's mentions of positive 100, neutral 50, negative 0; empty if never named | 0–100 |
| Trend | visibility minus the previous run's visibility | Points |
| A site's "used" | answers citing the domain ÷ all answers | Percent |
| A page's count | answers citing that URL | Number |

Rules that follow from the frontend:

- **Filters.** `?language=` and `?topic=` narrow the report to those questions, and every number above, including every point of `history`, is then calculated over those questions only. So past runs need their answers and mentions kept, not only their totals.
- **Archived questions.** The report, the actions and the plan's limit count the tracked questions only. A question archived today leaves the report at once, from every point of `history` too, and comes back the same way when it is tracked again. Its own report (below) still shows it.
- **One question's report.** `GET /projects/{id}/prompts/{promptId}/report` is the report over that question alone: the answers of the last run that asked it, the scores, sites and wrong facts over them, and one history point per run that asked it. With three answers a run, visibility there moves in thirds; the page counts in answers for that reason.
- **Plan limit.** Adding a question, accepting a suggestion and tracking an archived question again answer 409 when the project already tracks `limits.prompts` questions.
- **History.** One point per finished run, oldest first, ending with the latest. A first run gives one point, which the chart shows as dots; lines start with the second run.
- **Day, week, month.** The chart's switch groups the runs in the frontend: a period with several runs becomes one point with the plain mean of the runs' numbers. Nothing is needed from the API. Two things follow. If the mean has to be exact (weighted by the number of answers in each run), the backend should send the grouped points itself, for which the report's `period` parameter is the natural place. And "day" only differs from "week" when a project is checked more than once a week: see open question 14.
- **Order of `topSources`**: most cited first. **Order of `untrackedBrands`**: most named first. **Order of actions**: see "Rules".

The frontend calculates these itself from the report, so the backend does not: the share of answers citing the client's own site, the share of each kind of site, a brand's place among the brands, the numbers per question, visibility by topic and by language, the list of pages that name competitors and not the client, the questions where only competitors are named, the sentences that explain the cards, and every CSV file.

## What each page needs

| Page | Endpoints | What must be in the data |
| --- | --- | --- |
| Login | `/auth/code`, `/auth/code/verify`, `/auth/telegram`, `/auth/me`, `/auth/logout` | Account made on first login; the session cookie |
| Project list | `/projects`, then report and questions for each | One summary call would be better once an agency has many projects |
| Onboarding | `/onboarding/analyze-site`, `/onboarding/suggest-competitors`, `/onboarding/suggest-prompts`, `POST /projects`, `/runs/{id}/progress`, `/snapshot/{id}` | Competitors come from the brands ChatGPT names for the category and city, never from a similar name; about 20 questions in Uzbek and Russian, each with a topic |
| Overview | report, actions | `history` (at least one point), scores, every answer with its mentions and citations, sites with kind, `brandListed` and pages, the number of wrong facts, `nextRunAt` |
| Questions | questions (list, add, edit, archive and track again), suggestions (list, accept, reject), report | A question added today has no result until the next run: the page shows "queued". The list needs each question's `createdAt` and `archivedAt`, and the project's `plan` and `limits.prompts`. The numbers over the list are calculated in the frontend from the rows shown |
| A question's page | one question's report, questions, actions | The report over that question with its own history; the actions whose `promptIds` include it. Works for an archived question (up to its last run) and for one not asked yet (empty report, `nextRunAt`) |
| Answers | report | The full text of every answer. The filter by cited site and the CSV of the answers are made in the frontend from the report |
| Competitors | report, add and remove a competitor, hide an untracked brand | Scores, history, `untrackedBrands` with `dismissed`, the project's `limits.competitors`. Tracking a brand must change the report at once: see "Tracking a brand" under Rules |
| Sources | report | `topSources` with `pages[].mentions` for the gap tab |
| Wrong facts | report | `wrongFacts` with the question and the date first found |
| Actions | `/actions` (list, change status and steps) | Stable ids, `proof` after the next run |
| Settings | project | Read-only today; editing comes later |
| Public report | report, without login | See open question 6 |
| Free check | `POST /snapshot`, without login | Ten questions; category and city detected from the site when not given; the four site checks |
| Help sheet, demo form | `/support-messages`, `/demo-requests` | Stored and forwarded to us |

## Rules

**Actions.** Made from the latest run over all questions. Four kinds:

| Kind | One action per | Impact | Questions it lists |
| --- | --- | --- | --- |
| Listing | Cited site of kind directory, news, social or other where the client is not listed | High when 10% of answers or more cite the site, medium from 5%, otherwise low | Those whose answers cite the site, the ones without the client first |
| Fact | Wrong fact | Always high | The question where it was found |
| Content | Topic that has questions where competitors are named and the client is not | High with two or more such questions, otherwise medium | Those questions |
| Technical | Failed site check | High for blocked AI bots and for prices shown as pictures, otherwise medium | Up to five: price questions for the price check, any questions for the others |

A listing action also carries the number of answers citing the site and the competitors named in those answers, most named first. Order of the list: impact, then kind (fact, listing, content, technical), then the more cited site. Titles and steps are written by the frontend; every action has three steps, ticked by index 0–2.

**Status.** New → in progress → done, or declined. The frontend sends "in progress" together with the first ticked step. Marking done sets `doneAt`; marking it done again starts the proof over.

**Proof.** The client's visibility on the action's questions in the last run before `doneAt`, the same in the latest run, and how many runs lie between. Empty until one run has finished since it was done.

**Tracking a brand.** The client can start tracking any brand the answers name (`POST /projects/{id}/competitors`) and stop again. Mentions are stored with the name as written, tracked or not, so adding a competitor means matching its spellings against the stored mentions of every past run: its scores, its history and every other brand's share of voice are then recalculated, without asking ChatGPT again. Removing one is the reverse: its mentions stay and count as untracked. A brand named only by a spelling the backend doesn't know yet stays untracked until the spelling is added.

**Site checks.** Four yes-or-no checks on the client's website: AI search bots blocked, prices only as pictures, no business markup, contacts missing as text.

**Question suggestions.** Questions buyers ask that the project doesn't track. Accepting adds the question, asked from the next run.

## Login and access

- Phone numbers are Uzbek for now: `+998` and nine digits. Codes go by SMS.
- Telegram login: check the widget's `hash` with the bot token.
- Every project endpoint checks the owner, except what the public report reads.
- `POST /snapshot` and `POST /demo-requests` are open to anyone. The free check costs us money on every call, so it needs a limit (per IP, per domain, per day) before launch.

## Cost per plan

The teardown document sets the rule: a plan must cost us less than a third of its price. With four runs a month and three samples per question:

| Plan | Price a month | Answers a month | Budget per answer |
| --- | --- | --- | --- |
| Start | 199,000 soʻm | 25 × 3 × 4 = 300 | about 220 soʻm |
| Biznes | 490,000 soʻm | 75 × 3 × 4 = 900 | about 180 soʻm |
| Agentlik | 1,490,000 soʻm | 300 × 3 × 4 = 3,600 | about 140 soʻm |

That is roughly one to two US cents per answer, and it has to cover the answer with web search, the call that reads it, a share of reading cited pages, SMS and hosting. Some months have five Mondays, which lowers the budget by a fifth. The first run of a new project and every free check come on top. Step 0 measures the real cost; if it is higher, the choices are fewer samples, fewer runs, or higher prices.

## Open questions

1. **Cost of one answer** with web search, and of reading it. Measured in step 0.
2. **Location.** How to get the answer a user in Tashkent would get, and proof that it differs from the default. The Peec trial collected US answers for an Uzbek brand; we must not.
3. **API against the app.** Whether answers through the API match what people see in ChatGPT. Every report already states the method (API with web search, model, date); the answer decides how loudly to say it.
4. **"Is the brand listed" on a site.** A cited page that names the client proves yes. When no cited page names it, the client may still be listed elsewhere on that site. A search limited to the site would settle it, at a cost per site.
5. **Editing a question.** Today an edit keeps the question's id. Its old answers were given to the old wording. Either an edit makes a new question, or each answer stores the wording it was asked with.
6. **The public report** is read by project id without login. Ids must be impossible to guess, or the link needs its own token; a password is on the roadmap.
7. **The free check**: how many samples (the app's three, or one to save cost), and the limits against abuse.
8. **Plan limits. Partly decided 6 Oct 2026:** the project carries `plan` and `limits` (questions 25, 75, 300; competitors 3, 5, 5), and the Questions page uses the question limit. The Competitors page uses the competitor limit since 8 Oct. Still open: which plan a new project gets before billing exists (the mocks give every project Biznes), how Agentlik's 300 questions are split between its brands (`limits.prompts` is meant to be what this brand may use), and onboarding, which runs before a plan exists and still allows 5 competitors.
9. **Where personal data is stored.** Phone numbers and Telegram accounts of Uzbek citizens may have to stay on servers in Uzbekistan. To confirm with a lawyer before choosing hosting.
10. **SMS provider** for Uzbek numbers.
11. **Size of the report.** It carries the full text of every answer: 75 questions × 3 answers already, 300 for an agency. If pages get slow, send the texts only to the Answers page.
12. **An action whose cause is gone** (the client is now listed, the fact is now right) but which the client never marked: close it automatically, or leave it.
13. **Wrong facts before brand facts exist.** What they are checked against: the client's website, or nothing until the client writes its facts.
14. **Daily checks. Decided 6 Oct 2026: not offered for now.** The chart has a day view, as Peec's does, and Peec checks daily. Daily checks mean about seven times the answers: Start would go from 300 to about 2,250 a month, which leaves about 30 soʻm per answer at today's price. To reopen only as a higher plan or an add-on.

15. **Three answers are few for one question.** A question's own chart moves in steps of a third, and one different answer looks like a big change. Enough for "named or not"; if clients read too much into it, the choices are more samples for chosen questions or showing a question's history over four weeks at a time.
16. **The searches behind an answer. Decided 7 Oct 2026:** each answer carries the searches ChatGPT ran (`Answer.searches`). A question's page lists them with the number of answers that ran each, and the Questions list shows in how many of a question's answers ChatGPT searched at all. Still open: whether the API reports every search (step 0 should look), and a page of all searches across questions, which stays on the "Later" list.

## Change log

- **5 Oct 2026, first version.** From the pages built so far: login, onboarding, Overview, Questions, Answers, Competitors, Sources, Wrong facts, Actions, Settings (read-only), public report, free check.
- **6 Oct 2026, chart.** The chart card follows Peec's layout and has a day / week / month switch, grouped in the frontend (see "How each number is calculated"). Question 14 on daily checks: not offered for now. Visibility is shown in percent everywhere; the API still sends it as 0–1.
- **5 Oct 2026, Overview finished.** Added a sentence above the numbers, visibility by topic and by question language, and large views of the cards. All of it is calculated in the frontend from the report. New for the backend: nothing, but the by-topic and by-language block needs every answer's mentions in the report (it already has them) and makes open question 11 matter sooner.
- **6 Oct 2026, Questions.** The list got an archive (a question stops being asked and keeps its answers), the plan's question limit from the project, and a page per question. New for the backend: `createdAt` and `archivedAt` on a question, `plan` and `limits` on a project, `PATCH /projects/{id}/prompts/{promptId}` (archive, track again), `GET /projects/{id}/prompts/{promptId}/report`, and 409 at the plan's limit. Open questions 15 and 16 added; 8 partly decided.
- **7 Oct 2026, Answers.** The page got a filter by cited site and a CSV of the answers with their full text. New for the backend: nothing; both are made from the report. The export is one more reader of every answer's full text, which matters for open question 11.
- **7 Oct 2026, Questions, second correction.** The list shows share of voice, web search, wrong facts and the date added per question (all calculated in the frontend from the report), and a question's page lists what ChatGPT searched for. New for the backend: `Answer.searches`. Open question 16 decided.
- **8 Oct 2026, Competitors.** The untracked brands can be tracked or hidden, and a competitor can be dropped. New for the backend: `POST` and `DELETE /projects/{id}/competitors`, `PATCH /projects/{id}/untracked-brands`, `untrackedBrands[].dismissed`, the rule "Tracking a brand" (recount the stored mentions, no new run), and the plan's competitor limit (409).
