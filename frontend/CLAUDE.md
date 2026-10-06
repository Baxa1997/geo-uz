# GEO Platform (working name) — project context for Claude Code

## What we are building
An AI-visibility (GEO) platform for brands in Uzbekistan and Central Asia.
It asks ChatGPT the questions customers ask ("best dental clinic in Tashkent?"),
in Uzbek and Russian, and measures how often a brand appears versus competitors,
which sources ChatGPT cites, and whether facts about the brand are wrong.

## Current phase: FRONTEND FIRST
The backend does not exist yet. Build the frontend against MOCK data that matches
the API contract below exactly, so it can later be switched to the real backend
by changing one setting (`NEXT_PUBLIC_USE_MOCKS=false`).

## MVP scope
1. Brand setup: name, aliases (Latin + Cyrillic spellings), domain, description, category, city, services,
   up to 5 competitors (onboarding pre-fills all of it from the website, then suggests competitors, the
   topics of the suggested questions, and the questions)
2. Prompt set: 20–50 buyer questions per brand, Uzbek and Russian, editable
3. Runner (backend): send each prompt to OpenAI with web search ON, 3 samples per prompt
4. Parser (backend): extract brands mentioned, order, tone, cited URLs
5. Scores: visibility %, share of voice, average position — per prompt and overall
6. Report: web page + PDF, delivered via Telegram bot

NOT in MVP: other engines (Yandex, Gemini), billing, self-serve signup, CMS plugins.

## Product roadmap
Two documents in the repository root hold the reasoning: "GEO Competitor Teardown & Our Feature List.md"
and "Peec AI Teardown & Our Plan for Central Asia.md" (every Peec feature, our status, our local version).
Read them before adding a feature or a pricing claim. `backend/PLAN.md` holds the backend plan made from the
pages built so far (tables, the weekly run, how each number is calculated, what each page needs, cost per plan,
open questions): add to it each time a page is finished.

- Built in the frontend (mock data), every page laid out like Peec's app: onboarding (5 steps: website, brand
  profile, competitors, topics, questions; the form on the left, a live picture of the app on the right); the
  Overview (one sentence on where the client stands, then the numbers and charts first: five numbers with
  their weekly change, every brand over time on four metrics by day, week or month, brands table, the sites cited and their kinds as
  bar lists, visibility by topic and by question language; then recommended actions and questions without
  the client, latest answers, a share menu with the public report's link and CSV; the cards of numbers open
  large with ⤢: a takeaway sentence, every row, the numbers as a table and how to read them); Questions (topics column, tracked and suggested tabs, plan usage, the client's numbers, CSV); Answers
  (the answers in numbers, a table of every answer that opens like a chat, Previous/Next); Competitors
  (brands table, who leads each topic, untracked brands, questions each competitor wins); Sources (numbers,
  then sites, pages and gaps: pages that name competitors and not the client); Wrong facts (numbers and a
  table); Harakatlar (four goal tiles, the list by status and goal, a side panel with steps to tick, fix →
  proof); Settings (sections: brand profile, tracked brands, interface language; editing later); sidebar
  sections with a start checklist; site checks in the free check; public report; language + topic filters as
  dropdown chips; the next weekly check date on the Overview and Questions.
- Next (after first paying clients): the backend (including the rules that make Harakatlar from real data and
  measure each fix's result, and reading cited pages and websites for real), Telegram reports and PDF, a full
  site audit, competitor suggestions from the answers (track / dismiss), brand facts for fact-checking, editing
  project settings, markers on the chart when a fix starts and is done, CSV import of questions and export of
  answers.
  For agencies: a pitch report (the free check under the agency's name), client reports under the agency's
  name, pausing a client.
- Later: Gemini and Yandex, a date-range filter, brand attributes and objections, personas, AI referrals and
  crawler visits, API, roles, prompts split between an agency's clients, mystery shopper, Kazakhstan.
- Not planned: AI shopping, prompt volumes, ads library, lift predictor, SSO, MCP, Looker Studio,
  a rearrangeable overview.

Plans (soʻm per month): Bepul tekshiruv 0 (10 prompts, one run) · Start 199,000 (25 prompts, 3 competitors) ·
Biznes 490,000 (75 prompts, 5 competitors) · Agentlik 1,490,000 (300 prompts, up to 5 brands) ·
Managed GEO from 3,000,000. Weekly runs, ChatGPT, 3 samples per prompt, unlimited users.

## Landing page
The home page follows the section order of peec.ai (hero with the dashboard preview, the three metrics,
key features, a statement, Telegram reports, reports, why local, pricing with a comparison table, FAQ,
demo form, dark call to action, dark footer). Structure only: the name, logo, colors, wording, numbers and
screens are ours. Never add customer quotes, logos or ratings we haven't earned, and mark features that
aren't built yet "tez orada" wherever they appear.

The hero's dashboard is the app's Overview built from the same shared components (`shared/components/scores`:
HeadlineKpis, TrendPanel, BrandTable, TopDomains, SourceTypesChart) with `mocks/demo.ts`, so the
two can't drift apart. It plays by itself (`autoplay`: the chart reads out week
after week and switches metric) and is labelled as sample data. All motion on the page is CSS or a small
client component, stops under `prefers-reduced-motion`, and pauses off screen. The headline is never animated.

## Key rules
- The frontend NEVER calls AI providers and never holds API keys. It only calls the Python backend.
- Measuring ChatGPT = backend calls OpenAI with web search. Analysis can use any model.
- All mock data lives in `frontend/src/mocks/` and uses the same TypeScript types as the real API.
  One exception runs in production too: `mocks/demo.ts` feeds the landing page's product preview (sample data).
- UI text in three languages: Uzbek (Latin), Russian, English. Default: Uzbek.
- Label the collection method (API + web search, model name, date) on every report.

## Stack
Two separate folders, one git repository:

- `frontend/`: Next.js (App Router) + TypeScript strict, Tailwind CSS, shadcn/ui,
  TanStack Query for data fetching, Recharts for charts, next-intl for uz/ru/en.
- `backend/` (later): Python 3.12, FastAPI, SQLAlchemy 2.0 + Alembic, PostgreSQL,
  Pydantic v2, pytest, managed with uv. Scheduled runs with Celery or RQ + Redis.
- API contract: once the backend exists, FastAPI generates OpenAPI and the frontend
  generates its types with `openapi-typescript` (`npm run gen:api`).
  Until then, types are hand-written in `frontend/src/shared/types/api.ts` from the contract below.

## Frontend folder structure
```
frontend/src/
  app/                    # ROUTES ONLY. Every page.tsx / layout.tsx is a one-line re-export:
    [locale]/             #   export { default, generateMetadata } from "@/features/<f>/pages/<page>";
      (marketing)/        # public, with site navbar + footer: / (landing), /check?site=…
      (auth)/             # /login?snapshot=…&next=… on its own: dark panel + form, no site navbar
      (app)/              # workspace, login required: /dashboard, /settings, /projects/new, /projects/[id]/…
                          #   (overview, prompts, answers, competitors, sources, wrong-facts, reports, settings)
      onboarding/         # first-login wizard, login required, no sidebar; runs/[id]: first run's progress
      projects/[id]/report/   # client-facing report, public, no sidebar
  features/               # one folder per product area
    marketing/            # landing (components/landing/: one file per section), free check,
                          #   components/layout/: navbar + footer of all public pages
    auth/                 # login screen (auth-layout + auth-panel): phone + SMS code, Telegram, where to go after login
    workspace/            # shell: sidebar by task in sections (collapsible) with a "start here" checklist at its foot
                          #   (progress kept in the browser), project card, account, help sheet, placeholder (Reports),
                          #   GEO AI panel (design only, opened from a page, e.g. "Analyze" in Answers)
    answers/              # Answers: numbers, then every answer as a table row (search, brand and status filters);
                          #   a row opens a chat window (question, answer, details, Previous/Next); ?prompt= opens one
    competitors/          # Competitors: brands table, who leads each topic, untracked brands, questions each wins
    sources/              # Sources: numbers, then one card with sites / pages / gaps tabs (?tab=): kind, share of
                          #   answers, who each page names, "are you listed?", pages naming competitors not you; CSV
    wrong-facts/          # Wrong facts: numbers, then claim, correct value, question, date found as a table
    actions/              # Harakatlar: recommended fixes (sites to get onto, wrong facts, pages to write, site fixes):
                          #   four goal tiles, the list by status then goal, a side panel (?action=) with steps to tick,
                          #   status new → in progress → done / declined, and fix → proof on each done one; CSV
    dashboard/            # project list
    projects/             # project setup: new project form, onboarding wizard (website → brand profile → competitors
                          #   → topics → questions; form left, live preview of the app right from lg) and the first
                          #   run's progress screen (the engines in a ring that fills with the answers)
    settings/             # Settings: sections (brand profile, tracked brands, interface language; more "coming soon")
    overview/             # project home: a sentence on where the client stands (Verdict), five numbers, weekly trend
                          #   beside the brands table, top sites beside their kinds, visibility by topic and by question
                          #   language (BreakdownCard; these five cards open large, ⤢), then recommended actions and
                          #   questions without you, latest answers; share menu (public link, CSV), next weekly check
                          #   date. Numbers and charts come right after the sentence (the user's order, Oct 5)
    prompts/              # Questions: topics column, tracked / suggested tabs, plan usage, the client's numbers over
                          #   the list, table with each question's visibility, tone, position, brands named, leader;
                          #   add/edit; accept / reject suggestions; CSV; footer with the weekly check
    report/               # client report: chart, sources, wrong facts, answers
  shared/                 # used by 2+ features
    api/                  # client.ts (switches mocks/backend), session.ts (requireUser), query-keys.ts, errors.ts,
                          #   load-report.ts (the report under the URL's filters, for every data page)
    components/           # ui/ (shadcn), scores/ (HeadlineKpis + KpiStrip, TrendPanel (the chart card: MetricTabs in
                          #   its header, MetricChart as its plot, its large view), BrandTable, TopDomains,
                          #   SourceTypesChart, BarRows: the Overview's parts, also the landing hero's; StandingLine
                          #   (where the client stands, in words);
                          #   HeadlineScore, SourcesList, WrongFacts, AnswerViewer, …), Panel (a data page's card: title,
                          #   ⓘ hint, tools, footer, and `expand` for ⤢), ExpandButton + ExpandWindow (a card opened in a
                          #   large window), InfoTip, FilterMenu (a dropdown filter chip), ReportFilterBar (language + topic
                          #   chips, kept in the URL: ?lang=&topic=),
                          #   Page (title bar + engine switcher + body of a workspace page), EmptyState, Logo, …
    hooks/                # use-assistant (open GEO AI from any page), use-logout, use-in-view, use-reduced-motion
    helpers/              # domain, dates, labels, phone, scores (pure functions), utils (cn)
    constants/            # app-wide constants (ENGINES, TIME_ZONE, SESSION_COOKIE, phone format, prompt limits)
    types/                # api.ts (API contract types), scores.ts
  i18n/                   # next-intl routing, navigation, request config, setPageLocale
  messages/               # uz.json, ru.json, en.json
  mocks/                  # realistic mock data (Tashkent dental clinics), test accounts, mock session
  proxy.ts                # locale routing + sends logged-out visitors of private pages to /login?next=…
```

## Folder rules
- Each feature has the same shape; create a subfolder when the feature needs it:
  `components/`, `hooks/`, `helpers/` (pure functions), `constants/`, `types/`, `pages/` (route entry components).
- Inside a feature, import with relative paths (`../constants`). Outside it, only `@/shared/...`, `@/i18n/...`.
- Features never import each other. Code needed by 2+ features moves to `src/shared/`.
- `shared/` never imports from `features/`; `features/` and `shared/` never import from `app/`.
  ESLint enforces these (`import/no-restricted-paths` in eslint.config.mjs).
- File names in kebab-case; one main component per file.
- Private pages call `requireUser()` (shared/api/session.ts); proxy.ts only checks that the cookie exists.

## API contract (backend will implement this)
Auth: the backend sets an httpOnly session cookie `geo_session` on login. The browser sends it with
`credentials: "include"`; server-rendered pages forward it (shared/api/client.ts).
- `POST /auth/code` → { resendIn } (body: phone, E.164 "+998…"; sends a 6-digit code by SMS)
- `POST /auth/code/verify` → User (body: phone, code; creates the account on first login)
- `POST /auth/telegram` → User (body: Telegram Login Widget fields; backend checks `hash` with the bot token)
- `GET  /auth/me` → User (401 when logged out)
- `POST /auth/logout` → 204
- `GET  /projects` → Project[] (the current user's)
- `POST /projects` → { project: Project, runId: string | null } (body: brand name, aliases[], domain, category,
  city, competitors[], optional description, services[] and prompts[] = first question set; with prompts, the
  first run starts at once and runId is its id, otherwise null)
- `GET  /projects/{id}` → Project
- `GET  /projects/{id}/prompts` → Prompt[]
- `POST /projects/{id}/prompts` → Prompt
- `PUT  /projects/{id}/prompts/{promptId}` → Prompt  (body: text, language, topic)
- `GET  /projects/{id}/prompt-suggestions` → SuggestedPrompt[] (questions buyers ask that the project doesn't
  track yet; rejected ones aren't offered again)
- `POST /projects/{id}/prompt-suggestions/{suggestionId}/accept` → Prompt (adds it; asked from the next run)
- `DELETE /projects/{id}/prompt-suggestions/{suggestionId}` → 204 (rejects it)
- `GET  /projects/{id}/report?period=week&language=uz&topic=implants` → Report (language and topic are optional
  filters: the report then covers only those prompts, and its scores are computed over them)
- `GET  /projects/{id}/actions` → Action[] (recommended fixes made from the latest run over all prompts, most
  important first; recomputed after every weekly run, keeping the statuses the client set)
- `PATCH /projects/{id}/actions/{actionId}` → Action (body: status and/or stepsDone; marking done sets doneAt,
  and the proof appears after the next run; the frontend sends status in_progress with the first ticked step)
- `POST /snapshot` → Snapshot (free analysis: domain → 10 prompts; category and city are optional,
  the backend detects them from the website when omitted and returns them in the Snapshot; it also reads the
  website: siteChecks)
- `GET  /snapshot/{id}` → Snapshot (to pre-fill onboarding after "Save and see full report")
- `POST /onboarding/analyze-site` → SiteAnalysis (body: domain; the backend reads the website)
- `POST /onboarding/suggest-competitors` → CompetitorSuggestion[] (body: domain, name, category, city;
  4–6 of them: the brands ChatGPT names most for that category and city, never brands picked by a similar name)
- `POST /onboarding/suggest-prompts` → PromptSuggestion[] (body: name, category, city, optional services[];
  ~20 questions, uz and ru, each with a topic; the wizard shows the topics first, then their questions)
- `GET  /runs/{id}/progress` → RunProgress (polled by the progress screen after onboarding)
- `POST /demo-requests` → 204 (body: name, phone E.164, sector: clinic|real_estate|education|retail|other)
- `POST /support-messages` → 204 (body: text; from the in-app help sheet, logged-in user)

Types:
- User { id, name | null, phone | null, telegramUsername | null }
- Project { id, brand: Brand, competitors: Brand[], category, city, languages: ("uz"|"ru")[], description ("" if none),
  services: string[] (as the client wrote them) }
- Brand { id, name, aliases: string[], domain }
- Prompt { id, text, language: "uz"|"ru", topic }
- Report { project, period, method: { engine, model, webSearch: boolean, samples, collectedAt },
  scores: BrandScore[], prompts: PromptResult[], topSources: Source[], wrongFacts: WrongFact[],
  history: HistoryPoint[] (past runs, oldest first, ending with this one),
  untrackedBrands: { name, answers }[] (brands the answers name that aren't tracked: new-competitor alerts),
  nextRunAt | null (next weekly run; runs start Monday 06:00 Tashkent; shown on the Overview as a date, not a countdown) }
- HistoryPoint { collectedAt, scores: BrandScore without trend [] }
- BrandScore { brandId, visibility (0–1), shareOfVoice (0–1), avgPosition | null, sentiment (0–100) | null,
  trend (visibility vs previous period) }
- PromptResult { prompt: Prompt, answers: Answer[] }
- Answer { sample, text, mentions: { brandId, position, tone: "positive"|"neutral"|"negative" }[], citations: { url, domain }[] }
- Source { domain, type: "own"|"competitor"|"news"|"directory"|"social"|"other", count, brandListed: boolean,
  pages: { url, count, mentions: brandId[] | null }[] }  (directory = maps, catalogs and review sites; social
  includes Telegram channels; mentions = tracked brands the page names, found by reading it, null if unreadable)
- Snapshot (shape in types/api.ts) includes siteChecks: { check: "ai_bots_blocked"|"prices_as_images"|
  "no_business_markup"|"contacts_missing", passed }[] | null (null when the website couldn't be read)
- SuggestedPrompt { id, text, language: "uz"|"ru", topic }
- WrongFact { claim, correct, promptId, foundAt }
- SiteAnalysis { domain (normalized), name, aliases: string[], category, city, description (a sentence or two from
  the website), services: string[] (most important first) }
- CompetitorSuggestion { name, aliases: string[], domain }
- PromptSuggestion { text, language: "uz"|"ru", topic }
- Action { id, kind: "listing"|"fact"|"content"|"technical", status: "new"|"in_progress"|"done"|"declined",
  impact: "high"|"medium"|"low", promptIds[] (questions it should move), createdAt, doneAt | null,
  stepsDone: number[] (how-to steps ticked off, by index below ACTION_STEP_COUNT = 3),
  proof: { before, after (visibility 0–1 on promptIds), runs } | null, and by kind:
  listing { domain, sourceType, answers (citing it), competitorIds[] (named in those answers) } ·
  fact { claim, correct } · content { topic } · technical { check: "ai_bots_blocked"|"prices_as_images"|
  "no_business_markup"|"contacts_missing" } }. Titles and steps are written by the frontend in the interface language.
- RunProgress { id, projectId, status: "queued"|"running"|"analyzing"|"done"|"failed",
  answered (answers collected so far), total (prompts × samples) }

## Scores
Four numbers per brand, shown side by side (the Overview's numbers, its chart tabs, the brands table):
- Visibility = answers naming the brand / all answers; shown in percent, as Peec shows it (the user's choice, Oct 6)
- Share of voice = mentions of the brand / mentions of all tracked brands; shown in percent
- Average position = mean position, only over answers where the brand appears (1 = first)
- Sentiment ("Ohang") = mean tone of the brand's mentions, 0–100 (positive 100, neutral 50, negative 0)
- A source's "used" = answers citing it / all answers; its average citations = citations of its pages / answers citing it
- "Used as a source" (the client) = answers citing the client's own domain / all answers

## Charts
- Where every tracked brand is drawn (the Overview's chart and table), each has its own color: `--series-1`
  is always the client, competitors take `--series-2…6` in the project's order, so a brand keeps its color
  whatever its rank. The order of the colors is what keeps neighbours apart for color-blind readers:
  don't reorder or add hues without re-running the palette check.
- Where one brand is the story (headline score, share of voice, the public report), the client is `--you`
  and competitors are gray.
- Kinds of cited sites have fixed colors too (`SOURCE_TYPE_COLORS`). Good/bad uses `--positive`/`--negative`
  with an arrow or icon, never color alone. A change since last week is an arrow with its number, both green
  (`--better`) when the number got better and red (`--worse`) when it got worse; for position, better means a
  smaller number, and the arrow still points up. Only the client's own change is colored; competitors' stay gray.
- The chart card (TrendPanel) follows Peec's: title and metric tabs in the header, the plot, a footer line that
  explains the metric and switches lines and bars. The plot has dashed gridlines, straight lines with a dot on
  every run (no curves: they would suggest values between two weekly checks), each brand's latest number at its
  line's end, and a y-axis from zero to a round number just above the largest value (position: 1 at the top).
  One run shows as dots with their numbers; lines appear from the second run.
- The chart's K / H / O switch (day, week, month; Peec's "D W M") groups the checks into points in the frontend
  (`helpers/history.ts`): a period with several checks becomes one point with the mean of their numbers, and the
  footer then says so. Checks are weekly, so day and week both give a point per check and month gives each
  month's average; day only differs once checks run more than once a week, and daily checks are not offered
  for now (the user's decision, Oct 6; `backend/PLAN.md`). The numbers above the chart and the takeaway always compare the latest check with the one before.
- Every chart has a text twin for screen readers and shows its values on hover and on keyboard focus.
- Rankings of sites and kinds are bar lists (`BarRows`): light bars behind the labels, the number at the end
  of each row carries the value. One y-axis per chart; Peec's two-axis "own source impact" is left out.
- A table with a minimum width scrolls inside its card: give the scroll box `relative` and `min-w-0`, or its
  positioned screen-reader labels and the flex parent stretch the page sideways.
- A card that opens large (`expand` on Panel; `expandable` on BrandTable, TopDomains, SourceTypesChart; TrendPanel
  for the chart) shows three things in its window: a takeaway written from the data (who leads, where the client
  stands, what is missing), the block with everything in it (all rows, the chart's numbers as a table), and how to
  read it. A card and its window share their state (metric, chart type, sorting, sites or pages). ExpandWindow
  loads on the first click, so the landing page's preview, which never opens a card, stays free of the dialog library.
- Places among brands are compared on the numbers as shown (one decimal): two brands at "#1,8" share a place.
- Visibility, share of voice and "used as a source" are percentages ("42%"); tone is a score out of 100 and says so
  beside the number ("78 /100"); an axis in percent shows the sign on its ticks.
- A bar that shows visibility (by topic or language) is drawn against the whole scale, 0–100%, not against the
  longest row: 20% must not look like a full bar. Bars that rank sites or kinds stay relative to the largest.
- Peec's topics × tags heat map is replaced by two bar lists (by topic, by question language), each row with the
  brand that leads there. No heat maps: a cell's shade can't be read as a number.

## Commands (frontend, from `frontend/`)
- `npm run dev`
- `npm run build`
- `npm run lint`

## Working style
- TypeScript strict mode, no `any`
- Server components by default; client components only where interaction is needed
- Mobile-friendly: many local business owners will open reports on their phone from Telegram
- Small commits, one page at a time
