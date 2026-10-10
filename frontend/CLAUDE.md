# GEO Platform (working name) — project context for Claude Code

What is done, what comes next and how the work is organized: `../CLAUDE.md`. This file holds the rules for
the frontend.

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
  large with ⤢: a takeaway sentence, every row, the numbers as a table and how to read them); Questions (topics column
  with new, rename and delete; tracked, suggested and archived tabs; how many of the plan's questions are used; search,
  a filter and sorting, with the client's numbers over the rows shown; rows picked to move, archive, track or reject;
  questions added one per line or from a file; "Suggest more", keywords from a file and Discovery for new suggestions;
  CSV; a row opens the question's own page: its facts, a sentence on its
  latest answers, every brand over time, the brands table, the sites cited and their kinds for that question alone,
  what ChatGPT searched the web for, the fixes that list it and its answers); Answers
  (the answers in numbers, a table of every answer that opens like a chat, Previous/Next; filters by brand,
  cited site and status; CSV with the full texts); Competitors
  (four numbers, the brands table, who leads each topic, the brands ChatGPT names that aren't tracked: track or hide
  each; the questions each competitor wins, and stop tracking a competitor); Sources (Sites and Pages views,
  each: the most cited over time, what changed beside whether they work for the client, the table with a gaps
  switch; a page per cited site); Wrong facts (numbers and a
  table); Harakatlar, laid out like Peec's Actions (statuses, filters, grouping, guided tour, export, "Add a
  page", "Accept all"; the four goals as tiles; the list by status, goal and kind of work with boxes to pick
  rows; an action opened beside the list with its brief, steps, questions and Accept → Done; fix → proof);
  Settings (since Oct 10 from Peec's Settings screenshots, with its own menu in the sidebar's place: Profile,
  Facts, Brands, Tags, then General, Members, Plan; all editable); sidebar
  sections with a start checklist; site checks in the free check; public report; language + topic filters as
  dropdown chips; the next weekly check date on the Overview and Questions.
- Next (after first paying clients): the backend (including the rules that make Harakatlar from real data and
  measure each fix's result, and reading cited pages and websites for real), Telegram reports and PDF, a full
  site audit, competitor suggestions from the answers (track / dismiss), brand facts for fact-checking, editing
  project settings, markers on the chart when a fix starts and is done. (CSV import of questions and keywords,
  and export of answers, are built.)
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
client component, stops under `prefers-reduced-motion`, pauses off screen, and ends: nothing animates
forever (see below). The headline is never animated.

### Keeping the landing page fast
Measured on the production build as a slow phone would load it (4x slower CPU, slow 4G), Oct 6: the page
weighs about 350 KB (scripts 200 KB, HTML 52 KB, fonts 67 KB, CSS 24 KB), paints its headline in 1.7 s
and blocks the main thread for under 100 ms. Before the rules below it was 500 KB, 2.0 s and 250 ms.
With the real graphics card (headless Chrome started with `--enable-gpu --use-angle=metal`, frames read
from Chrome's trace): 8 layers, no dropped frames while scrolling, and the page at rest when left alone.
`npm run dev` is always slower (unminified scripts, a compile after every change): judge speed on
`npm run build && npm run start`.

- **Messages.** The root layout gives the browser only `Common` (for error.tsx). The app's layouts and pages
  (workspace, login, onboarding, the free check's run, the public report) wrap themselves in `AppProviders`
  (every message + the data cache) or in `NextIntlClientProvider`. The marketing layout gives its client
  components only the paths in `LANDING_CLIENT_MESSAGES` (marketing/constants), picked with
  `i18n/pick-messages.ts`: add a path when a client component of the navbar, the landing page or the
  dashboard preview starts using a new namespace, or the browser's console shows a missing message.
- **No app libraries on the landing page.** No TanStack Query (the demo form keeps its own state) and no
  Base UI: `ui/button`, `ui/input` and `ui/separator` are plain elements, and an InfoTip or a Hint downloads its
  bubble (`info-tip-popup.tsx`) the first time one is opened, like ExpandButton its window. Check after adding a
  dependency to anything the landing page renders.
- **Links to the page's own sections** use `SectionLink` (marketing/components), which is never prefetched;
  so are the logo and the language links. A prefetched link to "/#pricing" downloads the page it is on.
- **Nothing that moves sits under a filter, a mask or a backdrop blur.** The hero's glows are radial
  gradients, not blurred discs; the preview fades into the page under a painted gradient to `--page` (the
  marketing layout's opaque background), not under a mask. No sticky bar blurs what is behind it (the navbar,
  the workspace's page title bar): that blur was almost half of the graphics card's work during a scroll.
- **Every animation ends and leaves nothing applied** (`backwards` fill, a finite count: see globals.css). An
  endless one, however small (a pinging dot, a drifting glow), makes the browser redraw the page 60 times a
  second while it is on screen: measured on an M1, the landing page drew 300 frames in 5 idle seconds, and
  about 70 without them. The live dots ring four times (`animate-ring`); the glows stand still.
- **Blocks fade in once** (`data-reveal` + `RevealOnScroll`, an IntersectionObserver), not by a scroll-driven
  animation: those never end, kept every block a separate layer on the graphics card (62 layers, now 8) and
  caused late and dropped frames while scrolling. A block with `data-reveal` carries no transition or
  transform of its own.
- **What follows the pointer or plays by itself moves by `translate`**, never by `left`/`top` (the chart's
  marker line, dots and tooltip: `FOLLOWS` in metric-chart.tsx). The website field types its examples
  straight into the input's placeholder, not through React state.

## Page layout
Every workspace page's top follows Peec's (the user's correction, Oct 8: "page top breadcrumb must also be the
same"), through `Page` (shared/components/page.tsx):

1. **The bar**: where the page is, as a breadcrumb in plain weight ("Manbalar › Saytlar › 2gis.uz"; `crumbs`
   are the pages above, the last part is the page's h1), the engine switcher on the right.
2. **The filters' strip** (`toolbar`): the language and topic chips, and tools for the whole page (the
   Overview's next check and share menu), with a line under it.
3. **The views' strip** (`tabs`, `PageTabs`) when a page has views: links, the open one on a light pill with a
   line under it that covers the strip's border. Each view has its own address (`?view=`, `?tab=`), so the
   server renders it and it can be linked to.
4. **The content**, in parts (`PageSection`, on Manbalar and a site's page so far): a heading and a grey line
   that says what the cards show and how to read them, outside the cards, then the cards. A part's switch
   (Peec's gap analysis) sits on the right of its heading. A table's card has its tools on top (search on the
   left, filters and an icon-only CSV on the right), a grey heading row and its row count at the bottom.
   A page laid out across the whole panel, like Peec's prompts page (`bleed`: Savollar, Discovery, Harakatlar),
   brings its own columns instead, with a footer that stays in view (`sticky bottom-0`): the panel scrolls and
   the page grows with its content, so nothing scrolls inside it but its wide table, sideways. Harakatlar's
   opened action is the one part that scrolls on its own: it sits beside the list (`sticky`, under the page's
   tools, which stick too from that width), and covers the screen on a phone.
   Anything `absolute` inside a part that scrolls on its own (a screen reader's hidden label) needs that part to
   be `relative`, or it stretches the panel and the page scrolls past its end.

A strip of facts across the whole panel (a site's page) steps out of the page's padding (`-mx-4 sm:-mx-5`).

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
  TanStack Query for data fetching, next-intl for uz/ru/en. Charts are our own (`LinePlot`, `BarRows`):
  `recharts` is still in package.json but nothing imports it since the report's rewrite (Oct 8).
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
                          #   (overview, prompts, prompts/[promptId], answers, competitors, sources,
                          #   sources/[domain], wrong-facts, reports, settings)
      onboarding/         # first-login wizard, login required, no sidebar; runs/[id]: first run's progress
      projects/[id]/report/   # client-facing report, public, no sidebar
  features/               # one folder per product area
    marketing/            # landing (components/landing/: one file per section), free check,
                          #   components/layout/: navbar + footer of all public pages; SectionLink (a link to
                          #   "/#section", never prefetched); see "Keeping the landing page fast"
    auth/                 # login screen (auth-layout + auth-panel): phone + SMS code, Telegram, where to go after login
    workspace/            # shell: sidebar by task in sections (collapsible) with a "start here" checklist at its foot
                          #   (progress kept in the browser), project card, account, help sheet, placeholder (Reports),
                          #   GEO AI panel (design only, opened from a page, e.g. "Analyze" in Answers)
    answers/              # Answers: numbers about the answers themselves (naming the client, negative about it,
                          #   naming nobody, with a web search), then every answer as a table row, the answers to
                          #   one question grouped under the question written once (search; filters by brand
                          #   named, by site cited and by status); the rows shown export as CSV with their full
                          #   text; a row opens a chat window (question, answer, details, Previous/Next); ?prompt=
                          #   opens a question's first answer, ?source= starts with the answers citing a site
    competitors/          # Competitors: four numbers on where the client stands (place, gap to the leader, topics
                          #   led, questions without it), the brands table, who leads each
                          #   topic (helpers/topics.ts; a topic opens its questions), the brands ChatGPT names that
                          #   aren't tracked, like Peec's brand suggestions (track one while the plan has room:
                          #   Project.limits.competitors; or hide it, and show it again), and a card per competitor
                          #   with the questions it wins (each opens the question's page) and a stop-tracking button
    sources/              # Sources, laid out like Peec's Sources › Domains and › URLs (the user's correction,
                          #   Oct 8: "page top breadcrumb must also be the same"): Sites and Pages as the page's
                          #   tabs (?view=pages). Each view: "Overview", the five most cited over the checks
                          #   (SourcesChart); "What changed", MoversCard (cited for the first time, more, less, as
                          #   tabs; helpers/history.ts) beside PresenceCard (how the citations split by whether they
                          #   work for the client: its own site, sites it is on, sites it is missing from,
                          #   competitors'; for pages: naming the client, only competitors, nobody); then the table
                          #   (SitesTable / PagesTable) with Peec's gap switch (the places where a competitor is
                          #   named and the client isn't, then a filter by competitor), search, kind filter, CSV and
                          #   the row count. &type= starts the sites on one kind. A site anywhere opens its own page.
                          #   pages/source-page: one cited site (/sources/[domain], the domain as written, "2gis.uz"),
                          #   with Pages / Answers as its tabs (?tab=answers&page= opens the answers citing one
                          #   page). Pages: the site's mark and link, its facts in a strip across the panel, a
                          #   sentence on what it means for the client with a link to the fix that gets it listed,
                          #   the whole site and its pages over the checks, its pages' movers beside who ChatGPT
                          #   names when it cites the site, its pages' table. Answers: SiteAnswers. A site the
                          #   latest check no longer cites keeps its page from the history, without tabs
    wrong-facts/          # Wrong facts: numbers, then claim, correct value, question, date found as a table
    actions/              # Harakatlar: recommended fixes (wrong facts, sites to get onto, pages to write, site fixes),
                          #   laid out like Peec's Actions across the panel (Page `bleed`; the user's screenshots of
                          #   Oct 10): ActionBoard's strip of tools (statuses, All filters: topics, where the work is,
                          #   kind of site, kind of work; Group by: goal, kind of work, impact, where, topic; the
                          #   guided tour (shared Tour; see "Guided tours"), export as CSV or JSON,
                          #   "Add a page" (AddContentDialog: a page's address or a Markdown/text file, its type and
                          #   topic → an action with its brief), "Accept all"); a heading and GoalTiles; the list by
                          #   status, then group, then kind of work when a goal has two or more (helpers/grouping.ts),
                          #   the first group of each level open, five rows then "Show all"; boxes to pick rows (one
                          #   kind of work at once with its box) and a footer that stays in view: the open count and
                          #   "Decline all", or what to do with the rows picked. ActionPanel (?action= opens one):
                          #   "Copy for ChatGPT" (the action written as a prompt), what it is, topic, assistant, why
                          #   it matters, the brief for a page (headlines, meta title and description against their
                          #   length, what it must prove, evidence; "Write with GEO AI"), the steps to tick, the pages
                          #   ChatGPT reads (a listing's site, or the client's own), the questions it should move,
                          #   the expected effect or fix → proof; at the bottom Decline / Accept, then Cancel / Done.
                          #   Accepting opens "In progress" on the action and folds "New", as Peec's; every change
                          #   shows a toast with a link to its group (ActionToast). Changes show at once and go back
                          #   if saving fails. Left out of Peec's: models, platforms and page types as filters (one
                          #   assistant; the backend doesn't classify pages), XLSX (CSV opens in Excel), Peec Agent
                          #   (our GEO AI panel takes its place)
    dashboard/            # project list
    projects/             # project setup: new project form, onboarding wizard (website → brand profile → competitors
                          #   → topics → questions; form left, live preview of the app right from lg) and the first
                          #   run's progress screen (the engines in a ring that fills with the answers)
    settings/             # Settings, laid out like Peec's (the user's screenshots of Oct 10: "take what we need"):
                          #   on /projects/[id]/settings/* the sidebar becomes the settings' own menu (workspace
                          #   SettingsMenu: "‹ Overview" back, Project · its name: Profile, Facts, Brands with its
                          #   count, Tags; Account: General, Members, Plan). Each section a page of its own:
                          #   settings-page (Profile: ProfileForm, Peec's brand profile in the page's middle: a
                          #   banner with the brand's initial, name, website and other spellings (BrandDialog to
                          #   edit them), description, field, brand identity, services, customer types, then the
                          #   target market: the city from a list or on MarketMap (Uzbekistan and its neighbours,
                          #   constants/map.ts, Natural Earth outlines; ⤢ opens it large); a SaveBar at the panel's
                          #   foot), facts-page (FactsEditor: brand facts, one a
                          #   row, against the plan's limits.facts; "Fill from the website"), brands-page
                          #   (BrandsManager: Peec's brands table with ⋯ edit / stop tracking, "Add a brand" in a
                          #   window, the brand suggestions beside it, ✓ / ✕), tags-page (TagsManager: the
                          #   questions' tags with counts, create several, rename, delete; a row opens Savollar on
                          #   `?tag=`), general-page (AccountCard: the user's name, phone and Telegram; the interface
                          #   language), members-page (MembersTable: role, status, projects; invite by phone,
                          #   remove), plan-page (Peec's Plans: PlanOverview, the plan "Current", its price, cycle,
                          #   renewal and what the project uses, beside the assistants it asks; PlanCards, "Base
                          #   plan" with Monthly / Yearly and the plans and Managed GEO side by side: price, limits
                          #   with marks, the button (the current plan's cancels, the others switch: a request
                          #   reaches us), assistants, ✓ / — features; PlanBilling: payment and invoices "soon").
                          #   Settings' parts (SettingsCard, SettingsRow, SaveBar) in settings-parts.tsx.
                          #   account-settings-page: /settings with no project open, the interface language.
                          #   Left out of Peec's: social channels and brand colors to pick, source tags, Projects
                          #   (the project list is the dashboard), API keys, early access, model add-ons (Gemini
                          #   and Yandex show "soon")
    overview/             # project home: a sentence on where the client stands (Verdict), five numbers, weekly trend
                          #   beside the brands table, top sites beside their kinds, visibility by topic and by question
                          #   language (BreakdownCard; these five cards open large, ⤢), then recommended actions and
                          #   questions without you, latest answers; share menu (public link, CSV), next weekly check
                          #   date. Numbers and charts come right after the sentence (the user's order, Oct 5)
    prompts/              # Questions, laid out like Peec's prompts page across the whole panel (Page `bleed`; the
                          #   user's correction of Oct 8: Add as a window, "Suggest more", and the rest of Peec's
                          #   features): the topics column in Peec's design (TopicsColumn: the title's ⌃⌄ sorts the
                          #   topics as added, by name or by count; "New topic +" and "All topics" in rows of their
                          #   own; each topic's pencil opens it in a window, as Peec's (TopicDialog: its name, its
                          #   tracked questions, "Delete topic"), and "New topic" opens one empty; suggested topics apart on the Suggested
                          #   tab; « at its foot folds it to Peec's closed rail, kept in the geo_topics cookie: ⌃⌄,
                          #   the count of all, +, each topic as its count with its name on hover); tracked /
                          #   suggested / archived tabs with the plan's ring (Project.limits.prompts; at the limit
                          #   nothing can be added, tracked or restored) and the page's buttons; Peec's table (gray
                          #   headings in the body's size, the numbers at the right, the pinned question's edge
                          #   shadowed once it scrolls sideways): the question (sorts A to Z), visibility, share of
                          #   voice, tone (a dot and the score out of 100), position, brands named, leader, web
                          #   search, branding (whether the question names the client's brand, as Peec's), Peec's
                          #   fact-checking switch (Prompt.factCheck; the wrong facts found beside it), tags
                          #   (Prompt.tags; TagsCell finds or makes one; a "Tag" filter over the list), language,
                          #   location (Prompt.location, the city it is asked from, picked in its window), date
                          #   added; the client's numbers over the rows shown
                          #   (helpers/stats.ts); boxes to pick rows, and a footer that stays in view: when they are
                          #   asked again and "Archive all", or what to do with the rows picked (move to a topic,
                          #   archive; track or reject suggestions; track archived ones again). AddPromptDialog (one
                          #   question per line, or a CSV/TXT file: helpers/file.ts; also edits a question);
                          #   SuggestionsTable (why and when each was suggested, ✕ / ✓ per row), "Suggest more" for
                          #   the topic picked or all, ImportKeywordsDialog; pages/discovery-page (/prompts/discovery,
                          #   Peec's Discovery: services, customer types, extra context, languages → new suggestions
                          #   with new topics). ?view=suggested|archived opens a tab, &new= marks new suggestions.
                          #   Left out of Peec's: volume (no data), intent and branding (need classifying in the
                          #   backend), free tags (we have topics), location (one city), the topics column's sort.
                          #   pages/prompt-page: one question (/prompts/[promptId], opened from the list, the archive
                          #   and an answer's chat), in Peec's design: PromptFilters in the page's strip (the checks
                          #   shown, ?period=8|4; "All filters": competitors to compare, ?brands=, and kinds of
                          #   sites, ?kinds=; helpers/prompt-filters.ts), the question with its facts in a strip
                          #   across the panel, then "Overview" (a sentence counted in answers, the chart, the
                          #   brands) and "Source distribution" (the sites, their kinds) as PageSections, fed with
                          #   the report over that question, what ChatGPT searched the web for (Peec's
                          #   "query fanouts": each search with the answers that ran it) beside the fixes that list
                          #   the question, then its answers
    report/               # the client's status report (public, no login, no sidebar; prints as A4; `?run=` a past
                          #   week's, `?print=1` opens the print window) and Hisobotlar (the latest report's condition,
                          #   the register of reports, a page per report with its contents): see "The report"
  shared/                 # used by 2+ features
    api/                  # client.ts (switches mocks/backend), session.ts (requireUser), query-keys.ts, errors.ts,
                          #   load-report.ts (the report under the URL's filters, for every data page)
    components/           # AppProviders (every message + the data cache: wraps the app's layouts, never the landing
                          #   page), ui/ (shadcn), answers/ (AnswersList: answers as table rows grouped under their
                          #   question, used by the Answers page and a cited site's page; ChatDialog: an answer
                          #   opened like a chat, laid out like Peec's chat window, also used by a question's page),
                          #   scores/ (HeadlineKpis + KpiStrip, TrendPanel (the chart card: MetricTabs in
                          #   its header, MetricChart as its plot, its large view), BrandTable, TopDomains,
                          #   SourceTypesChart, BarRows: the Overview's parts, also the landing hero's; StandingLine
                          #   (where the client stands, in words);
                          #   HeadlineScore, AnswerViewer, …), Panel (a data page's card: title,
                          #   ⓘ hint, tools, footer, and `expand` for ⤢), ExpandButton + ExpandWindow (a card opened in a
                          #   large window), InfoTip (an ⓘ that explains a title or a number), Hint (the same bubble
                          #   on anything else: wraps a table heading, a figure, a mark or an icon button and
                          #   explains it on hover, keyboard focus or a tap), FilterMenu (a dropdown filter chip), ReportFilterBar (language + topic
                          #   chips, kept in the URL: ?lang=&topic=),
                          #   Page (a workspace page: see "Page layout"), PageTabs (a page's views as tabs, in
                          #   Page's `tabs` strip), PageSection (a heading and a grey line over a part's cards),
                          #   EmptyState, Logo, …
    hooks/                # use-assistant (open GEO AI from any page), use-logout, use-in-view, use-reduced-motion
    helpers/              # domain (also shortUrl, pathOf, and siteHref + SITE_SLOT: the address of a cited site's
                          #   page as a pattern a server page can hand to a client component), dates, labels, phone,
                          #   scores (pure functions), condition (the status report's score: its facts, formula and
                          #   statuses), history (checks grouped by day, week, month), prompts (isTracked), utils (cn)
    constants/            # app-wide constants (ENGINES, TIME_ZONE, SESSION_COOKIE, phone format, prompt limits)
    types/                # api.ts (API contract types), scores.ts
  i18n/                   # next-intl routing, navigation, request config, setPageLocale, pickMessages (the
                          #   part of the catalog a public page's client components need)
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
- `POST /projects/{id}/competitors` → Project (body: name, optional aliases[] and domain; usually one of the
  report's untracked brands. The backend fills in the spellings and the website it knows from the answers, and
  counts the brand's mentions in the answers it already has, so its numbers and history appear at once. 409 at
  the plan's competitor limit or when the brand is tracked already)
- `DELETE /projects/{id}/competitors/{brandId}` → Project (stops tracking it; the answers keep its mentions, so it
  returns to the untracked brands and can be tracked again)
- `PATCH /projects/{id}/untracked-brands` → 204 (body: name, dismissed true/false: hides an untracked brand from
  the suggestions, or shows it again)
- `GET  /projects/{id}/prompts` → Prompt[] (every question, archived ones too)
- `POST /projects/{id}/prompts` → Prompt[] (body: { prompts: { text, language, topic }[] }: one question or many,
  the lines of the Add window or a file's; all or none: 409 when they don't all fit the plan, 422 for one asked
  already or too short or long. A new topic name makes the topic)
- `PATCH /projects/{id}/prompts` → Prompt[] (body: ids[], archived? and/or topic?: several at once, archived,
  tracked again (409 when they don't all fit) or moved to a topic)
- `PUT  /projects/{id}/prompts/{promptId}` → Prompt  (body: text, language, topic)
- `PATCH /projects/{id}/prompts/{promptId}` → Prompt (body: archived true/false. An archived question isn't asked
  any more, leaves the report and the actions at once, keeps its past answers and doesn't count toward the
  plan's limit; tracking it again asks it from the next run, 409 when the plan is full)
- `GET  /projects/{id}/prompts/{promptId}/report` → Report over that one question, archived or not: its answers
  of the last run that asked it, the scores and cited sites over them, its wrong facts, and `history` = one
  point per run that asked it (from the first run after it was added to the last before it was archived).
  Empty (`prompts: []`, `history: []`) until a run has asked it
- `GET  /projects/{id}/topics` → string[] (the project's topics in their order, those without a question too)
- `POST /projects/{id}/topics` → string[] (body: name; an empty topic; 409 when it exists)
- `PATCH /projects/{id}/topics/{topic}` → string[] (body: name; renames it in its questions and suggestions; 409
  when the name is taken)
- `DELETE /projects/{id}/topics/{topic}` → 204 (its tracked questions are archived: they keep their answers)
- `GET  /projects/{id}/prompt-suggestions` → SuggestedPrompt[] (questions buyers ask that the project doesn't
  track yet, newest first; rejected ones aren't offered again)
- `POST /projects/{id}/prompt-suggestions/accept` → Prompt[] (body: ids[]; tracks them, asked from the next run;
  409 when they don't all fit the plan)
- `POST /projects/{id}/prompt-suggestions/reject` → 204 (body: ids[])
- `POST /projects/{id}/prompt-suggestions/more` → SuggestedPrompt[] (body: topic?; "Suggest more" for one topic,
  the project's or a suggested one, or for all; only the new ones; empty when nothing new comes up)
- `POST /projects/{id}/prompt-suggestions/discover` → SuggestedPrompt[] (body: services[], customers[], context,
  languages[]; Discovery: saves the services and customer types to the project, returns the new suggestions,
  whose topics may be new)
- `POST /projects/{id}/prompt-suggestions/keywords` → SuggestedPrompt[] (body: keywords[] from a file's first
  column, at most 50; questions customers ask about them)
- `GET  /projects/{id}/reports/{runId}` → Report as it stood after that run (Hisobotlar; the runs are `Report.history`,
  each with its `runId`); readable without login, like the report.
- `PATCH /auth/me` → User (body: name; Sozlamalar › Umumiy)
- `PATCH /projects/{id}` → Project (body: any of name, domain, aliases[], description, category, city, services[],
  customers[], identity[]; Sozlamalar › Profil. 422 for an empty name or a bad website. Name, spellings and website count from
  the next check; the suggested questions are written again from the new profile)
- `PATCH /projects/{id}/competitors/{brandId}` → Project (body: name?, aliases[]?, domain?; 409 when the name is
  tracked already, 422 for a bad website)
- `GET  /projects/{id}/facts` → string[]; `PUT` (body: facts[]) → string[] (the brand facts the answers are checked
  against, one statement each, replaced as a whole; 409 above `limits.facts`, 422 for one over 300 characters);
  `POST /projects/{id}/facts/suggest` → string[] (statements read from the brand's website, not saved, without the
  ones the project has)
- `GET  /projects/{id}/tags` → TagSummary[] (every tag, those no question carries yet too, with its tracked
  questions); `POST` (body: names[]) → TagSummary[]; `PATCH /projects/{id}/tags/{tag}` (body: name; renames it on
  every question; 409 when taken) → TagSummary[]; `DELETE` → 204 (takes it off every question)
- `GET  /members` → Member[] (the account's people, the owner first); `POST /members` (body: phone; an SMS with a
  link; 409 when a member already, 422 for a number that isn't Uzbek) → Member; `DELETE /members/{id}` → 204 (403
  for the owner)
- `POST /projects/{id}/plan-requests` → 204 (body: plan, "managed" or "cancel", and cycle "month"|"year"; billing
  isn't built: it reaches us)
- `GET  /projects/{id}/report-settings` → ReportSettings; `PATCH` with `email`, `language`, `agencyName` (the Agency plan
  only, else 403) or `telegram: "connect" | "disconnect"` → ReportSettings.
- `GET  /projects/{id}/report?period=week&language=uz&topic=implants` → Report over the tracked questions (language
  and topic are optional filters: the report then covers only those prompts, and its scores are computed over them)
- `GET  /projects/{id}/actions` → Action[] (readable without login through the report's link, like the report
  itself: the report lists its recommendations; changing an action needs the owner. Recommended fixes made from the latest run over all prompts, most
  important first; recomputed after every weekly run, keeping the statuses the client set)
- `PATCH /projects/{id}/actions/{actionId}` → Action (body: status and/or stepsDone; marking done sets doneAt,
  and the proof appears after the next run; the frontend sends status in_progress with the first ticked step)
- `PATCH /projects/{id}/actions` → Action[] (body: ids[], status: several at once, "Accept all", "Decline all"
  and the rows picked; their ticked steps stay as they were)
- `POST /projects/{id}/actions` → Action (body: url? or document? (a page's Markdown or text, at most 200 KB),
  pageType, topic: "Add a page". The backend reads the page against that topic's questions and their answers and
  returns a new content action with url/pageType set and a brief for reworking it; 422 without an address or a
  text, or for an unknown topic)
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
  services: string[] (as the client wrote them), customers: string[] (customer types, from Discovery),
  identity: string[] (Peec's brand identity: a few words on what the brand stands for, from Sozlamalar › Profil),
  plan: "start"|"business"|"agency", billing: { cycle: "month"|"year", renewsAt | null }, limits: { prompts (questions
  tracked at once), competitors, facts } }. The Questions page reads `limits.prompts` and the Competitors page
  `limits.competitors`; onboarding, which runs before a project and its plan exist, still uses a fixed 5
- Brand { id, name, aliases: string[], domain, logo: string | null (its logo's address, found by the backend on the
  brand's website (the site's icon); shown in the chart's tooltip, the brands table and Savollar, the initial where
  there is none) }
- Prompt { id, text, language: "uz"|"ru", topic, createdAt, archivedAt | null }
- Report { project, period, method: { engine, model, webSearch: boolean, samples, collectedAt },
  scores: BrandScore[], prompts: PromptResult[], topSources: Source[], wrongFacts: WrongFact[],
  history: HistoryPoint[] (past runs, oldest first, ending with this one),
  sourceHistory: SourceHistoryPoint[] (the cited sites over the same runs),
  conditionHistory: Condition[] (the project's condition after each of the same runs; empty for one question's report),
  untrackedBrands: { name, answers, dismissed }[] (brands the answers name that aren't tracked: new-competitor
  alerts; `dismissed` ones were hidden by the client and are listed apart),
  nextRunAt | null (next weekly run; runs start Monday 06:00 Tashkent; shown on the Overview as a date, not a countdown) }
- HistoryPoint { runId, collectedAt, scores: BrandScore without trend [] }
- ProjectLimits { prompts, competitors, facts } (from PLAN_LIMITS in shared/constants: 25/3/0, 75/5/20, 300/5/50;
  Start checks no wrong facts, so it keeps no facts)
- TagSummary { name, prompts }; Member { id, name | null, phone | null, telegramUsername | null, role: "owner"|
  "member", status: "active"|"invited", projectIds[] }
- Condition { score (0–100, the mean of the areas), areas: { visibility, competition, coverage, sources, accuracy } (each
  0–100) }: see "Scores", the condition score
- SourceHistoryPoint { collectedAt, answers (answers of that run), sources: { domain, type, count (answers citing
  it), pages: { url, count }[] }[] } (a site the run didn't cite is left out; the last point's counts are
  `topSources`. The sites chart, a site's own chart and "what changed" are made from it in the frontend)
- BrandScore { brandId, visibility (0–1), shareOfVoice (0–1), avgPosition | null, sentiment (0–100) | null,
  trend (visibility vs previous period) }
- PromptResult { prompt: Prompt, answers: Answer[] }
- Answer { sample, text, mentions: { brandId, position, tone: "positive"|"neutral"|"negative" }[], citations: { url, domain, title | null (the page's
  title, as the search tool gives it with the link) }[],
  searches: string[] (the web searches ChatGPT ran before writing the answer, as the search tool reports them, in
  order; empty when it answered without searching) }
- Source { domain, type: "own"|"competitor"|"news"|"directory"|"social"|"other", count, brandListed: boolean,
  pages: { url, title | null, count, mentions: brandId[] | null }[] }  (directory = maps, catalogs and review sites; social
  includes Telegram channels; mentions = tracked brands the page names, found by reading it, null if unreadable)
- Snapshot (shape in types/api.ts) includes siteChecks: { check: "ai_bots_blocked"|"prices_as_images"|
  "no_business_markup"|"contacts_missing", passed }[] | null (null when the website couldn't be read)
- SuggestedPrompt { id, text, language: "uz"|"ru", topic (the project's or a new one), source: "profile"|"searches"|
  "discovery"|"keywords" (from its services and topics, from ChatGPT's web searches for the tracked questions, from
  Discovery, from imported keywords), createdAt }
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
  fact { claim, correct } · content { topic, url | null, pageType: "home"|"service"|"prices"|"article"|"about"|
  "other" | null (both set for a page the client added: it is reworked, not written), brief: ContentBrief | null } ·
  technical { check: "ai_bots_blocked"|"prices_as_images"|"no_business_markup"|"contacts_missing" } }. Titles and
  steps are written by the frontend in the interface language; a brief comes written by the backend, in Uzbek
  (the page's language is the client's choice; the questions are in Uzbek and Russian).
- ContentBrief { summary, headlines: string[] (two or three), metaTitle (about 60 characters), metaDescription
  (about 155), argue (what the page must prove), proofPoints: string[] (the evidence to put on it) }
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

**The condition score** (the status report's headline, `Report.conditionHistory`, one per run) is the mean of five
areas, each a whole number from 0 to 100. The backend computes it; `shared/helpers/condition.ts` holds the same
formula for the mocks (`rateCondition`), the facts it is counted from (`conditionFacts`, which the report's
sentences are also written from) and how a score reads (`conditionStatus`: good from 70, fair from 40, weak under).
- visibility = the client's visibility in percent
- competition = its visibility as a share of the most visible tracked brand's (100 when it leads)
- coverage = the share of questions with at least one answer naming it
- sources = of the citations of sites a business can be listed on (not its own, not competitors'), the share going
  to sites that list it, a site counted by the answers citing it (100 when none is cited)
- accuracy = its tone (50 if never named) less 10 for every wrong fact
A status is green, amber (`--progress`) or red, always with its word beside it. The score appears only in the
report and on Hisobotlar: the Overview keeps Peec's four numbers.

## Charts
- Where every tracked brand is drawn (the Overview's chart and table), each has its own color: `--series-1`
  is always the client, competitors take `--series-2…6` in the project's order, so a brand keeps its color
  whatever its rank. The order of the colors is what keeps neighbours apart for color-blind readers:
  don't reorder or add hues without re-running the palette check.
- Where one brand is the story (the free check's headline score), the client is `--you` and competitors are
  gray. The report compares every brand, so its table and chart use the brands' own colors, as the Overview does.
- Kinds of cited sites have fixed colors too (`SOURCE_TYPE_COLORS`). Good/bad uses `--positive`/`--negative`
  with an arrow or icon, never color alone. A change since last week is an arrow with its number, both green
  (`--better`) when the number got better and red (`--worse`) when it got worse; for position, better means a
  smaller number, and the arrow still points up. Every brand's change is colored in its own direction, so a
  competitor that gained is green too; the client's is also bold (the user's correction, Oct 8: until then
  competitors' changes were gray).
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
- The cited sites (or pages) over time (`SourcesChart`, sources feature) reuse the brands chart's plot
  (`LinePlot`, exported from metric-chart.tsx), in Peec's card: the title with the K / H / O switch, the plot,
  the legend in a strip under it (each name opens the site's page, a page's opens the answers citing it). How
  to read a point is the section's grey line over the card. A point is the share of that check's answers citing
  the site, in whole percent, the number the tables show. Among the sites (or pages), the client's own keeps
  `--series-1` and a thicker line and the others take `--series-2…6` by rank; on a site's own page the whole
  site is the thick gray line and its pages take the palette. A change in a site's share is an arrow with the
  points it moved, green up and red down (`ChangeMark`): colored in its own direction, like a brand's.
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
- A question's own page shows the same cards as the Overview, over that question's answers alone. With three
  answers a check, a brand's visibility there is 0, 33, 67 or 100%, so the page's sentence counts in answers
  ("named in 1 of 3 answers") and the chart's ⓘ says a single answer moves the percentage a lot.
- Peec's topics × tags heat map is replaced by two bar lists (by topic, by question language), each row with the
  brand that leads there. No heat maps: a cell's shade can't be read as a number.
- The report's own small charts follow the same rules: the condition score is a half-circle gauge cut where
  "fair" and "good" begin, with the scale written under it; the score over the reports is columns with their
  numbers (a column per check, never a curve); a number's line in the scorecard (`SparkLine`) is straight from
  check to check and shows the way it went, not its size; a split (whom the citations work for, the tones of the
  mentions, the plan's progress) is one bar with its legend and numbers.

## The report
`/projects/[id]/report` is the document a client forwards and prints: public, no sidebar, three languages. Since
Oct 10 it is a **status report** (the user's correction: "professional business report about condition, and
advanced report structure"; asked, they chose a status document with an overall score, and for Hisobotlar the
latest condition first, then every report). It is laid out as an **official document** (the user, the same day:
"inside of report make as official report page"): one white paper on a gray ground (`ReportPaper`), square at its
corners, everything on it one under another; on paper it is the pages, each with its number at its foot. Its
marks of a document: a letterhead over a double rule, the title in capitals in the middle of the page, a ruled
table of the report's facts, each part named on a gray band ("Part II. Analysis": `PartHeading`), each section's
heading in capitals over a rule with its area's status at the line's end, tables ruled and square with dark
headings (`ReportCard`, `ReportTable`), statuses as square tags, and a sign-off. No rounded app cards inside it.
It runs in four parts, every section numbered (`REPORT_PARTS`, `REPORT_SECTIONS`):

- **Letterhead** (`ReportLetterhead`): our mark and what we do, the report's number in the run of weekly reports
  and its date; the document's title with whom it is about; the period, the scope (questions × answers), the
  assistant and who prepared it as a ruled table.
- **I. Condition.** 1 Executive summary: the overall condition score as a gauge with its status, its change and its
  columns over the reports, beside the five areas (a bar, the score, the status and the fact behind it in a
  sentence: `useAreaFindings`); the conclusion in a sentence; the week's highlights beside the decisions needed (the
  plan's first three actions). 2 Key figures: the five numbers, each with this check, the previous one, the change,
  the strongest competitor, how far ahead or behind, and its line over the checks. 3 What changed since the last
  report: the events behind the numbers.
- **II. Analysis**, a section per area, each with its status beside its title, opening with its conclusion
  (`Verdict`) and closing with the plan's action that answers it (`NextStep`): 4 Competitive position (the brands
  table with bars, visibility over the checks), 5 Topics and questions (the client over the strongest competitor
  as two bars per topic and per language, the questions where only competitors are named), 6 Sources (whom the
  citations work for as one bar, the most cited sites), 7 Accuracy and tone (the tone score with its mentions
  split by tone, the wrong facts).
- **III. Decisions.** 8 Risks and opportunities: a register made from the report's own numbers
  (`helpers/risks.ts`), each entry a sentence with its numbers, what it means, its level and the action that
  answers it. 9 Action plan: how far it has come as one bar, what is still to do in order of effect with the area
  each action improves (`ACTION_AREAS`), then what is done and what it changed.
- **Sign-off** (`ReportSignOff`), where the report proper ends: who prepared it and when, and lines for the reader
  to sign that they have read it.
- **IV. Reference.** 10 Method and scope with the limits of the numbers, 11 Definitions (the five numbers, then the
  condition score, each area's formula and where a status begins), 12 Appendix: every question. Last, a line on
  what the numbers are.

The sections are drawn by one component (`ReportBody`), so the shared report and Hisobotlar's report page never
differ.

**Hisobotlar** (`/projects/[id]/reports`) opens with the latest report's condition (`LatestReport`: its number,
period and scope, the same gauge and areas as the report's summary, "Open the report", and its link, Telegram and
PDF). Then every report as a register: number, period, the condition it found (score, status, change), the five
areas as marks, what happened that week (`weekEvents`), its PDF; a row opens its report; CSV with every area's
score. Last, one line on where the report goes, with Telegram in one click and the rest (email, language, the
agency's name on the Agency plan) in a window. A report's page (`/projects/[id]/reports/[runId]`) is the document
inside the workspace: its number, period and ways out in the strip under the title, its contents beside it, then
the paper. The contents are a panel of their own (`ReportContents`; the user's correction the same day: "too many
spacing, and no separation"): a white card with a heading that carries the report's overall status, the parts one
under another with a line between them, each section a tight row with its area's status as a dot, and the one
being read marked with a bar at its edge. A past report's actions show today's status. The pages keep the app's
own density (the user, the same day: "overall reports page is too many spacing"): the gray ground is 16px wide
around the paper, the paper's own margins are those of a document and no wider (32px), and blocks and table rows
stand close. The list's first screen holds the latest report's whole condition and the start of the register.
In the workspace the contents and the paper take the panel's whole width (`ReportBody`'s `fill`; the user, with a
screenshot of a wide screen: "make little bit fuller for the page"): no gray is left beside them or between them
until a screen is wider than 110rem, and the summary's score bars grow with the paper. The shared report keeps
the width of a sheet, in the middle of the screen. The dark cover of the first version is gone (the user: "not what I expected").

Rules: a reader who stops after the summary has the decision, and everything after it is evidence for it. No
number appears without what it is compared with. Nothing depends on hover: the report must read on paper, so a
term is explained in the definitions and under the scorecard's names, and the scale of the score is written under
the gauge. Its tables follow the sheet's own width, not the screen's (container queries: `@lg:` and so on), so
they are right beside the contents, on a phone and on paper, where a sheet is about 700px wide. It is laid out for
A4 (`@page` and the `print:` classes): the tools and filters are `print:hidden`, backgrounds print (or bars and
marks would vanish), a section runs on from the one before, its heading and conclusion stay with what follows, a
short table, a card and a table's row are never cut in two, and every page carries "3 / 13" at its foot (a page
margin box in `@page`; a browser that doesn't know them leaves it out). The first page holds the letterhead and
the whole condition: the summary's area rows keep their bar beside the name from 448px (`@md:`) for that. "Print or save as PDF" is the browser's print
dialog; a sent PDF (Telegram) will be this same page printed by the backend. Its texts are the `Report`
namespace; the findings are computed in `features/report/helpers` and the shared score helpers. Check a change to
it as a PDF too (Chrome's `Page.printToPDF` from the test browser), not only on screen.

## One place for each number
A number or a block appears once in the app, plus the Overview, which is the summary of the other pages (the
user's correction, Oct 8: "some infos are repetitive").

- A page's top row holds numbers about that page's own subject which the blocks right under it don't already
  show. No count that a tab or a block's title repeats (how many sites are cited is under the sites table), no
  restating of a table's first row (the leader), and no number that belongs to another page: who leads is on
  Raqobatchilar. Manbalar has no top row since it took Peec's layout (Oct 8): how often the client's own site is
  cited is among the Overview's five numbers and on that site's page, links per answer on each site's page.
- A chart or a card that already stands on the Overview is not added to the page it summarizes, unless that
  page shows more of it. So Manbalar's "What changed" has whether the sources work for the client beside the
  movers, where Peec has its domain types: the kinds of sites are on the Overview.
- A change is shown once on a page: the movers card shows the sites and pages that moved, so the tables under
  it show shares without arrows.
- In a table, what is the same in every row is said once outside it (the date of the check is in the method
  line). Rows that share a question are grouped under the question, written once.
- Before adding a block, check where its numbers already appear.

## Clickable rows
A click in a menu or window a row opens (drawn outside the table, in a portal) still reaches the row through
React; `LinkRow` ignores it (since Oct 10: a tag's ⋯ › Rename used to open Savollar too).

Whatever acts on a click shows the hand cursor: a base rule in `globals.css` gives it to buttons, tabs and menu
items (Tailwind 4 leaves them with the arrow). A table row that opens something opens on a click anywhere on
it and shows the hand too: `LinkRow` (shared/components) for a row that leads to a page, `cursor-pointer` with
an `onClick` for a row that opens a window. The link or button inside the row stays, for the keyboard. A row of
a bar list leads somewhere when it has `href` (`BarRows`): the whole row is then the link.

A cited site opens its own page wherever it is shown (the user's correction, Oct 8): a row of the sites table,
the chart's legend, a row of "what changed", the Overview's and a question's list of sites. A cited page (a row
of a pages table or of "what changed", a page's name in a chart's legend) opens its site's page on the answers
that cite that page; its address under the title opens the page itself in a new tab. A row whose question is written once over several columns spans only the columns every width
shows, with an empty cell for each column a wider card adds: a wider span adds columns on a phone.

The site's page has the site's domain in its address ("…/sources/2gis.uz"). `proxy.ts` skips addresses with a
dot (files), so its matcher lists this route apart; restart `npm run dev` after changing the matcher.

## Explanations on hover
Everything on a data page says what it is when the mouse rests on it, as on Peec (the user's correction, Oct 6):
every table heading, every figure that isn't self-evident, every mark that stands for something (a brand's
initial, a tone icon, a site's kind as a dot) and every button with only an icon. A card's title and a number
in a row of numbers have an ⓘ (`InfoTip`); anything else is wrapped in `Hint`, which opens the same dark bubble
over the element on hover, on keyboard focus and on a tap (phones have no hover).

- A heading's hint says what the column measures and how to read it, in a sentence or two, in the three
  languages; a sorting heading adds that a click sorts. Never the native `title` attribute: it is slow, unstyled
  and doesn't open on a phone.
- A control that already takes the focus (a sorting heading, an icon button, a tab) is passed to `Hint` as a
  function and gets the description's id for `aria-describedby`. Marks repeated in every row pass
  `focusable={false}` (reached by the mouse and a tap, not by Tab) and `described={false}` when a hidden label
  already says the same.
- Done on Savollar, a question's page, Javoblar (the table and the opened answer), Raqobatchilar, Manbalar,
  a cited site's page and Harakatlar (goal tiles, impact bars, where the work is done, steps, the opened
  action's figures), and in the shared brands table, tone icons, site-kind dots and export buttons.
- A hint's bubble and its frame let the pointer through (`pointer-events-none`): a menu or a row under an
  open bubble stays clickable. The other pages' tables get
  theirs when their turn comes.

## Guided tours
Every workspace page has a short tour, laid out like Peec's (the user's correction with Peec's screenshots,
Oct 10): each step frames one section of the page in a dark border while the rest fades, and a dark bubble
beside it, its pointer on the section, says what the section shows and what to do with it ("Skip tour",
Back, Next). The bubble goes under the section, else over it, else beside it, and follows it when the page
scrolls. Hint bubbles stay hidden while a tour is open.

- The tour starts by itself on the first visit to a page, once per browser (`localStorage` `geo-tour:<page>`),
  unless a window is open then; the book button at the end of the page's top bar shows it again.
- A page names its tour with `Page`'s `tour` prop. The steps are the page's entries in `messages/Tours`, in
  their order (keep it the page's order, top to bottom); each points at the element marked with
  `data-tour="<key>"`. Frame whole sections, as Peec does: a card, a strip of numbers, a table's tools or its
  first row, not a section taller than the screen. A card in a grid is wrapped in `<div data-tour className="grid">`
  so it still fills its row. A step whose element isn't on the page (a tab not open, a narrow screen) is passed over.
- Shared parts carry their own key: the row of numbers (`KpiStrip`, "kpis"), the first answer of a list
  ("answer"), `PageSection`'s and `LinkRow`'s `tour` prop.
- Each settings section has its own (`settings` for Profile, `settingsFacts` and so on); the Profile's first step
  frames the settings' menu in the sidebar (`data-tour="settingsNav"`).
- Harakatlar keeps its own tour in `ActionBoard` (its steps open an action), started from the book button
  in its strip of tools, as on Peec. Hisobotlar's tour points at the latest report, the register and the
  delivery line; a report's page at its tools, contents, condition and decisions.

## Commands (frontend, from `frontend/`)
- `npm run dev`
- `npm run build`
- `npm run lint`

## Working style
- TypeScript strict mode, no `any`
- Server components by default; client components only where interaction is needed
- Mobile-friendly: many local business owners will open reports on their phone from Telegram
- Small commits, one page at a time
