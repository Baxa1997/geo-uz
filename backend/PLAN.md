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
| `projects` | owner, category, city, languages, description, services, customer types, plan | The API sends the plan and what it allows: `limits.prompts`, `limits.competitors`. Discovery saves the services and customer types |
| `brands` | project, role (own or competitor), name, spellings, domain, order | The order of competitors fixes each brand's chart color, so it must be stable. A competitor added later goes last |
| `dismissed_brands` | project, name | Untracked brands the client hid from the suggestions (`untrackedBrands[].dismissed`) |
| `prompts` | project, text, language (uz, ru), topic, location (a city), fact-check on or off, tags, created at, archived at | Archived = not asked any more; its answers stay. Location: the project's city unless the client picks another; it is the city the search tool is told the user is in. Fact-check on (the default): its answers are checked for wrong facts. Tags: the client's own labels, a list of short names. See open question 5 on edits |
| `topics` | project, name, order | Also topics without a question yet. A question's topic is its name; renaming a topic renames it in its questions and suggestions. Deleting one archives its tracked questions |
| `prompt_suggestions` | project, text, language, topic, source (profile, searches, discovery, keywords), created at, status (offered, accepted, rejected) | A rejected one is never offered again, nor one the project asks or archived (same text, case and spaces aside). Its topic may be one the project doesn't have yet: a suggested topic |
| `runs` | project, kind (first, weekly, snapshot), status, model, web search, samples, started, finished, total, answered | Status: queued, running, analyzing, done, failed |
| `answers` | run, prompt, sample number, text, the web searches it ran, raw response | Keep the raw response: extraction rules will change. The searches come from the search tool's own report of each call |
| `mentions` | answer, brand (empty when not tracked), name as written, position, tone | Untracked names are kept too: they are the "new competitor" list |
| `citations` | answer, URL, domain, page title | URL without `utm_source`, domain without `www.`; the title as the search tool gives it with the link (`Citation.title`, null when it gives none) |
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

1. **Ask.** Every tracked question (not the archived ones), three samples, through OpenAI with web search on. The request must say where the user is (Uzbekistan and the question's city, `Prompt.location`, as the search tool's approximate user location), so the answer is the one a local customer gets. Count `answered` as the answers come in: the progress screen shows it against `total` (questions × samples).
2. **Cut out the citations and the searches.** Unique URLs per answer, without the `utm_source=openai` tag the search tool adds, each with the page title the tool reports beside it; and the search queries the tool ran for the answer, in order (`Answer.searches`, empty when it answered without searching).
3. **Read the answer** (status `analyzing`). List every business the answer names, in order. Position counts all of them: a tracked brand named after two untracked ones is at position 3. Give each mention a tone: positive, neutral or negative. Match names to tracked brands through their spellings, Latin and Cyrillic. Any model may do this step.
4. **Keep the untracked names** with the number of answers naming each.
5. **Sort the cited sites into kinds**: the client's own domain, a tracked competitor's domain, then our list (maps, catalogs and review sites; news; social networks and Telegram channels), otherwise "other".
6. **Read the cited pages** that are new or old, and record which tracked brands each names. A page that can't be read gets no result (the frontend shows "not read" and leaves it out of the gap list).
7. **Check listings**: for each cited site, whether the client is on it.
8. **Find wrong facts** about the client in the answers of the questions whose fact-check is on (`Prompt.factCheck`).
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
- **Plan limit.** Adding questions, tracking suggestions and tracking archived questions again answer 409 when they don't all fit: the project may track `limits.prompts` questions. Batches are all or none.
- **History.** One point per finished run, oldest first, ending with the latest. A first run gives one point, which the chart shows as dots; lines start with the second run.
- **Day, week, month.** The chart's switch groups the runs in the frontend: a period with several runs becomes one point with the plain mean of the runs' numbers. Nothing is needed from the API. Two things follow. If the mean has to be exact (weighted by the number of answers in each run), the backend should send the grouped points itself, for which the report's `period` parameter is the natural place. And "day" only differs from "week" when a project is checked more than once a week: see open question 14.
- **Cited sites over time.** `sourceHistory` is the sites' twin of `history`: one point per finished run, oldest first, ending with the latest, under the same language and topic filters. A point has the run's number of answers and, for every site cited in it, the site's kind, the number of answers citing the site and the same for each of its pages; a site the run didn't cite is left out of that point. The last point's counts are `topSources`. From it the frontend draws the sites chart and a site's own chart (share of answers, in whole percent), and works out what changed since the previous run: a site is "new" when no earlier point has it, otherwise it rose or fell by the difference of the two rounded shares, down to 0% when the latest run didn't cite it. Day, week and month are grouped in the frontend by adding up the counts and the answers of a period's runs.
- **Order of `topSources`**: most cited first. **Order of `untrackedBrands`**: most named first. **Order of actions**: see "Rules".

The frontend calculates these itself from the report, so the backend does not: the share of answers citing the client's own site, the share of each kind of site, a brand's place among the brands, the numbers per question, visibility by topic and by language, the list of pages that name competitors and not the client, the questions where only competitors are named, the sentences that explain the cards, the status report's sentences on each area and its risks and opportunities, and every CSV file.

### The condition score

The status report (Hisobotlar) opens with one number from 0 to 100 for how the client stands with ChatGPT, made of five areas. The backend computes it for every run and sends it as `conditionHistory`, the twin of `history`: one `Condition { score, areas }` per finished run, oldest first, ending with the latest, under the same language and topic filters; empty for one question's report. The frontend never recomputes it; it writes each area's sentence from the same facts. Each area is a whole number from 0 to 100:

| Area | Formula |
| --- | --- |
| `visibility` | the client's visibility × 100 |
| `competition` | the client's visibility ÷ the most visible tracked brand's × 100 (100 when the client leads, 0 when no tracked brand is named) |
| `coverage` | tracked questions with at least one answer naming the client ÷ all tracked questions × 100 |
| `sources` | among the cited sites a business can be listed on (every kind but the client's own site and competitors' sites): answers citing sites that list the client ÷ answers citing any of them × 100, each site counted by the answers that cite it (100 when no such site is cited) |
| `accuracy` | the client's tone (50 when it is never named) minus 10 for every wrong fact found and not yet gone, not below 0 |

`score` is the mean of the five, rounded. The frontend reads a score as good from 70, fair from 40 and weak under 40 (the same for every area). The formula lives in `frontend/src/shared/helpers/condition.ts` (`rateCondition`), which the mocks use: port it as it is, and change both together. A past run's condition is rated from that run's own answers, sites and the wrong facts known then.

## What each page needs

| Page | Endpoints | What must be in the data |
| --- | --- | --- |
| Login | `/auth/code`, `/auth/code/verify`, `/auth/telegram`, `/auth/me`, `/auth/logout` | Account made on first login; the session cookie |
| Project list | `/projects`, then report and questions for each | One summary call would be better once an agency has many projects |
| Onboarding | `/onboarding/analyze-site`, `/onboarding/suggest-competitors`, `/onboarding/suggest-prompts`, `POST /projects`, `/runs/{id}/progress`, `/snapshot/{id}` | Competitors come from the brands ChatGPT names for the category and city, never from a similar name; about 20 questions in Uzbek and Russian, each with a topic |
| Overview | report, actions | `history` (at least one point), scores, every answer with its mentions and citations, sites with kind, `brandListed` and pages, the number of wrong facts, `nextRunAt` |
| Questions | questions (list, add one or many, edit, archive, track again or move to a topic, several at once), topics (list, add, rename, delete), suggestions (list, track and reject several at once, suggest more, Discovery, keywords), report | A question added today has no result until the next run: the page shows "queued". The list needs each question's `createdAt` and `archivedAt`, and the project's `plan` and `limits.prompts`. The numbers over the list are calculated in the frontend from the rows shown. A file of questions or keywords is read in the browser: the API gets the lines |
| A question's page | one question's report, questions, actions | The report over that question with its own history; the actions whose `promptIds` include it. Works for an archived question (up to its last run) and for one not asked yet (empty report, `nextRunAt`) |
| Answers | report | The full text of every answer. The filter by cited site and the CSV of the answers are made in the frontend from the report |
| Competitors | report, add and remove a competitor, hide an untracked brand | Scores, history, `untrackedBrands` with `dismissed`, the project's `limits.competitors`. Tracking a brand must change the report at once: see "Tracking a brand" under Rules |
| Sources | report | `topSources` with `pages[].mentions` for the gap tab and `pages[].title`; `sourceHistory` for the chart and for what changed. "Cited without a mention" (answers that cite the client's site and don't name the client) and every filter are calculated in the frontend from the report |
| A cited site's page | report, actions | The same report: the site's entry in `topSources`, its points in `sourceHistory` (a site the latest run didn't cite still has its page from these), the answers that cite it with their mentions, and the "get listed" action whose `domain` is the site |
| Wrong facts | report | `wrongFacts` with the question and the date first found |
| Actions | `/actions` (list; change one's status and steps; several at once; "Add a page") | Stable ids, `proof` after the next run, a brief on every content action, a new action for a page the client adds |
| Settings | project (change), the project's facts (read, replace, suggest from the site), its tags (list, create, rename, delete), competitors (add, change, remove), untracked brands, members (list, invite, remove), plan requests, the user (change the name) | Profile, Facts, Brands, Tags, General, Members, Plan. A facts table (project, statement, position) counted against `limits.facts`; tags made without a question kept per project; members per account (the owner and the people invited by phone, with the projects they can open); plan requests reach us until billing exists |
| Reports (Hisobotlar) | report, a run's report (`/reports/{runId}`), actions, report settings (read, change) | `history` with each run's `runId`, `conditionHistory` (the list shows every week's score and areas), `sourceHistory`, the wrong facts' `foundAt` and the actions' `doneAt` for what happened each week. A report's page is the public report's document inside the workspace |
| Public report | report (the latest, or `?run=` a past run's) and actions (read), without login | A status report made in the frontend from these two: title page, the condition (`conditionHistory`), key figures, what changed, position, topics, sources, accuracy and tone, risks and opportunities, action plan, method, definitions, every question. The actions are read through the same link as the report (changing one needs the owner). See open question 6 |
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

**Briefs.** Every content action carries a brief (`ContentBrief`), written by a model when the action is made, from the topic's questions, the answers to them (which competitors are named, the sites and pages ChatGPT cites for them) and the project's profile: a short summary of the page, two or three possible headlines, a meta title of about 60 characters and a description of about 155 (the frontend shows each one's length against the limit, so a longer one is allowed but shows red), what the page must prove, and the evidence to put on it (prices, numbers, names, guarantees). In Uzbek, the interface's default; never naming a competitor as worse. The brief is kept with the action and rewritten only when the action is made again after a run.

**Add a page.** `POST /projects/{id}/actions` takes one of the client's pages, by address or as its text (a Markdown or text file the browser reads, at most 200 KB), with its kind (home, service, prices, article, about, other) and a topic of the project. The backend reads the page (fetches the address, or takes the text), compares it with that topic's questions and their answers, and returns a content action with `url` (null for a text), `pageType` and a brief for reworking it, impact medium, listing the topic's questions. It stays with the project across runs like any other action (stable key: the address, or a hash of the text).

**Several at once.** `PATCH /projects/{id}/actions` sets one status on several actions ("Accept all" and "Decline all" act on the new actions shown, after the page's filters; the boxes on the rows on any). Ticked steps stay as they were; `doneAt` follows the same rule as for one.

**Status.** New → in progress → done, or declined. The frontend sends "in progress" together with the first ticked step. Marking done sets `doneAt`; marking it done again starts the proof over.

**Proof.** The client's visibility on the action's questions in the last run before `doneAt`, the same in the latest run, and how many runs lie between. Empty until one run has finished since it was done.

**Tracking a brand.** The client can start tracking any brand the answers name (`POST /projects/{id}/competitors`) and stop again. Mentions are stored with the name as written, tracked or not, so adding a competitor means matching its spellings against the stored mentions of every past run: its scores, its history and every other brand's share of voice are then recalculated, without asking ChatGPT again. Removing one is the reverse: its mentions stay and count as untracked. A brand named only by a spelling the backend doesn't know yet stays untracked until the spelling is added.

**Site checks.** Four yes-or-no checks on the client's website: AI search bots blocked, prices only as pictures, no business markup, contacts missing as text.

**Question suggestions.** Questions buyers ask that the project doesn't track, newest first, each with where it came from (`source`). Tracking adds the question, asked from the next run. Four ways make them, all written by a model from the project's profile (category, city, languages, services, customer types) and never about the client by name:

- *The first ones and "Suggest more"* (`profile`): from the services and topics; "Suggest more" for one topic (the project's or a suggested one) or for all, a handful at a time, only questions not offered before.
- *ChatGPT's searches* (`searches`): the web searches the tracked questions' answers ran (`Answer.searches`) often hold a question of their own; worth offering after each run.
- *Discovery* (`discovery`): services, customer types, extra context and languages from the Discovery page; the services and customer types are saved to the project. New topics come with their questions.
- *Keywords* (`keywords`): an SEO tool's export, read in the browser (first column, at most 50): the questions customers ask about each.

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

17. **Retrieved against cited.** Peec counts the pages the model fetched ("retrieved") apart from the pages an answer shows as its sources ("cited"), with a rate for each. We keep what the answer cites, which is what a reader of the answer sees, and show one number, "used". OpenAI's search tool can also report every page it consulted; step 0 should look at how far the two lists differ. If they differ much, "retrieved" becomes a second number later.
18. **How far back `sourceHistory` goes.** Every run of a year-old project is 52 points, each with every cited site and page. Until the pages have a date range, sending the last 26 runs is enough for the charts; "new" then means new within those runs.
19. **Kinds of pages.** Peec sorts cited pages into product page, comparison, list article, how-to and so on. It would tell a client what kind of page to write; it needs a model to classify every cited page. Not planned yet.

## Change log

- **5 Oct 2026, first version.** From the pages built so far: login, onboarding, Overview, Questions, Answers, Competitors, Sources, Wrong facts, Actions, Settings (read-only), public report, free check.
- **6 Oct 2026, chart.** The chart card follows Peec's layout and has a day / week / month switch, grouped in the frontend (see "How each number is calculated"). Question 14 on daily checks: not offered for now. Visibility is shown in percent everywhere; the API still sends it as 0–1.
- **5 Oct 2026, Overview finished.** Added a sentence above the numbers, visibility by topic and by question language, and large views of the cards. All of it is calculated in the frontend from the report. New for the backend: nothing, but the by-topic and by-language block needs every answer's mentions in the report (it already has them) and makes open question 11 matter sooner.
- **6 Oct 2026, Questions.** The list got an archive (a question stops being asked and keeps its answers), the plan's question limit from the project, and a page per question. New for the backend: `createdAt` and `archivedAt` on a question, `plan` and `limits` on a project, `PATCH /projects/{id}/prompts/{promptId}` (archive, track again), `GET /projects/{id}/prompts/{promptId}/report`, and 409 at the plan's limit. Open questions 15 and 16 added; 8 partly decided.
- **7 Oct 2026, Answers.** The page got a filter by cited site and a CSV of the answers with their full text. New for the backend: nothing; both are made from the report. The export is one more reader of every answer's full text, which matters for open question 11.
- **7 Oct 2026, Questions, second correction.** The list shows share of voice, web search, wrong facts and the date added per question (all calculated in the frontend from the report), and a question's page lists what ChatGPT searched for. New for the backend: `Answer.searches`. Open question 16 decided.
- **8 Oct 2026, Competitors.** The untracked brands can be tracked or hidden, and a competitor can be dropped. New for the backend: `POST` and `DELETE /projects/{id}/competitors`, `PATCH /projects/{id}/untracked-brands`, `untrackedBrands[].dismissed`, the rule "Tracking a brand" (recount the stored mentions, no new run), and the plan's competitor limit (409).
- **8 Oct 2026, Sources.** The page got the number "cited without a mention" (answers that cite the client's site and don't name the client), filters by "are you on it" and by competitor named, and links from a site to the answers citing it. New for the backend: nothing; all of it comes from the report.
- **8 Oct 2026, Sources after Peec's Domains page.** The page got the most cited sites over the runs as a chart, what changed since the previous run (sites used more, less, for the first time), and a page per cited site: its facts, its use over time, who the answers citing it name, its pages and the answers citing it. An answer opened like a chat lists its sources by page title. New for the backend: `Citation.title` and `CitedPage.title`, and `sourceHistory` in the report (see "How each number is calculated"). Open questions 17 to 19 added.
- **8 Oct 2026, the report.** The public report was rewritten as a standard business report: title block, executive summary, key figures, the evidence, recommendations, method, definitions, appendix; it prints as A4, which is how it is saved as a PDF today. New for the backend: the report's link must also read `GET /projects/{id}/actions` without login (read only). Later, for Telegram: a PDF of this same page, printed by the backend with a headless browser, so the sent file and the page never differ; and a way to open an earlier check's report (`GET /projects/{id}/report?run=…`), which the list of past reports on Hisobotlar will need.
- **8 Oct 2026, Questions in Peec's layout.** The questions page got Peec's Add window (one question per line, or a CSV/TXT file), "Suggest more", keywords from a file, Discovery, boxes to pick rows with what to do with them, and topics of their own (new, rename, delete). New for the backend: `POST /projects/{id}/prompts` takes and returns a list (all or none); `PATCH /projects/{id}/prompts` for several at once (archive, track again, move to a topic); `GET`, `POST`, `PATCH`, `DELETE /projects/{id}/topics`; `POST /projects/{id}/prompt-suggestions/accept` and `/reject` with ids (in place of the single accept and reject); `/more`, `/discover` and `/keywords`; `SuggestedPrompt.source` and `createdAt`; `Project.customers`; the `topics` table; the four ways to make suggestions (see "Question suggestions").
- **10 Oct 2026, Actions in Peec's layout.** After the user's screenshots of Peec's Actions: a strip of tools (statuses, filters by topic, by where the work is, by kind of site and kind of work; grouping by goal, kind of work, impact, where, topic; a guided tour; CSV and JSON export; "Add a page"; "Accept all"), the list by status, goal and kind of work with boxes to pick rows ("Decline all" in its footer), and an action opened beside the list: "Copy for ChatGPT", why it matters, a brief for a page, the steps, the pages ChatGPT reads, the questions it should move, the expected effect; Accept, then Done. New for the backend: `brief`, `url` and `pageType` on content actions (see "Briefs"), `PATCH /projects/{id}/actions` (see "Several at once") and `POST /projects/{id}/actions` (see "Add a page"). The rest is made in the frontend from the report and the actions.
- **10 Oct 2026, Questions: Peec's last columns.** After the user's screenshots of Peec's table ("tag adding, fact checking, location"): each question has its own tags (added in the table, a filter by tag over the list), a fact-check switch, and a city it is asked from (in its window; the project's city by default). New for the backend: `Prompt.location`, `Prompt.factCheck` and `Prompt.tags`; `POST /projects/{id}/prompts` and `PUT …/prompts/{promptId}` take an optional `location`; `PATCH /projects/{id}/prompts` takes `tags` (replaces them) and `factCheck`. The weekly run tells the search tool the question's city, and looks for wrong facts only in the answers of questions whose fact-check is on. Volume and intent stay out (no source of search volumes; the user chose to leave intent out).
- **10 Oct 2026, Reports (Hisobotlar).** The workspace lists every weekly report, each with its own page, and says where the report goes after each run. New for the backend: `HistoryPoint.runId`; `GET /projects/{id}/reports/{runId}`, the report as it stood after that run (each run keeps its answers, mentions and citations, so a past report is rebuilt from its own run; readable without login, like the report); `GET` and `PATCH /projects/{id}/report-settings` (email, language, the agency's name on the Agency plan, else 403; `telegram: "connect"` and `"disconnect"`). The Telegram bot: "connect" gives the client a link to our bot with a one-time code; the chat that starts the bot with it is tied to the project, and after each run the bot sends the report's summary and its link there, in the chosen language; the email carries the same. A new `report_settings` table (project, Telegram chat, email, language, agency name). The report gained a "what changed since the report before" section, made in the frontend from the history, the cited sites over the runs, the wrong facts' dates and the actions' done dates.
- **10 Oct 2026, the report as a status report.** After the user's correction ("professional business report about condition, and advanced report structure"; they chose a status document with an overall score): the report opens with a condition score out of 100 made of five areas, and runs in four parts (condition, analysis, decisions, reference) and twelve sections, with a register of risks and opportunities and the plan read against the areas. New for the backend: `Report.conditionHistory` (see "The condition score" under "How each number is calculated"): one condition per run, so the list of reports shows every week's score. The area sentences, the risks and opportunities and the plan's grouping by area are made in the frontend from the report and the actions.
- **10 Oct 2026, Settings.** After the user's screenshots of Peec's Settings ("take what we need"): Profile, Facts, Brands, Tags, General, Members and Plan, each editable, with the settings' own menu. New for the backend: `PATCH /projects/{id}` (the brand profile), `PATCH /projects/{id}/competitors/{brandId}`, `GET` and `PUT /projects/{id}/facts` with `POST …/facts/suggest` (read from the website), `limits.facts` (0 / 20 / 50 by plan: Start checks no wrong facts, so it keeps none), `GET`, `POST`, `PATCH` and `DELETE /projects/{id}/tags`, `GET`, `POST` and `DELETE /members` (invite by phone, an SMS with a link), `POST /projects/{id}/plan-requests`, `PATCH /auth/me`. The facts are what the wrong facts are checked against: a claim in an answer that contradicts one of them is a wrong fact, with that fact as its correct value (open question: matching a claim to a fact needs a model).
- **10 Oct 2026, Settings: Profile and Plan as Peec's.** After the user's correction with Peec's Profile and Billing pages: the profile gained the brand's identity (a few words on what it stands for) and the city picked on a map; the plan page shows how it is paid and when it renews, a monthly / yearly switch, and the current plan's button cancels it. New for the backend: `Project.identity` (string[], in `PATCH /projects/{id}`), `Project.billing` (`cycle`: month or year, `renewsAt`), `POST /projects/{id}/plan-requests` takes `"cancel"` and a `cycle`. A year paid ahead costs 10 months (the user's decision, 10 Oct).
- **10 Oct 2026, a question's page and logos.** After the user's screenshots of Peec's prompt page and its chart: the page filters the checks shown (the last 4 or 8, or all), the competitors compared and the kinds of sites counted, all made in the frontend from the question's report. Every tracked brand shows its logo. New for the backend: `Brand.logo` (the logo's address or null): when a brand is tracked, read its website's icon (the `apple-touch-icon` or the largest `icon` link, else `/favicon.ico`), store a copy on our side at a fixed size, and serve it from our domain, so the page never loads a client's site. A brand without a website, or one whose icon can't be read, has none and shows its initial.
