# Seenova AI — project context for Claude Code

What is done, what comes next and how the work is organized: `../CLAUDE.md`. This file holds the rules for
the frontend.

## What we are building
Seenova AI (the product's name since 17 Nov 2026; until then the working name GEO): an AI-visibility (GEO)
platform for brands in Uzbekistan and Central Asia.
It asks ChatGPT and Gemini the questions customers ask ("best dental clinic in Tashkent?"),
in the languages of the business's country (Uzbek and Russian in Uzbekistan), and measures how often a brand
appears versus competitors, which sources AI cites, and whether facts about the brand are wrong.

## Current phase: real projects on the backend, sample data beside them (18 Nov 2026)
On a real project every page reads and writes the backend (`backend/app/`, `backend/README.md`) through the
slices below. The MOCK data, which matches the API contract below, stays for the landing page's preview, for
the calls the backend doesn't serve yet, and for working with the slices off (`NEXT_PUBLIC_USE_MOCKS`).

**A slice at a time.** `NEXT_PUBLIC_LIVE` (in `.env.local`) lists the parts of the API the backend serves while
the rest are mocks; `shared/api/client.ts` builds `api` from the mocks with those calls replaced. So far "auth"
(`sendCode`, `verifyCode`, `getMe`, `logout`, `updateMe`) and "first-run" (`startFirstRun`, `getFirstRuns`,
`getFirstRun`, `getFirstRunResult`; the page is `/onboarding/first-run`, see `features/projects`), and since
15 Nov "projects": every call about a project (all but login, the first run, the free check, the setup's
suggestions and the landing page's forms). Since 16 Nov "first-run" implies "projects", `/onboarding` without a
first run and `/check` both go to `/onboarding/first-run`, and a logged-in visitor of `/login` goes to the
dashboard: on the Vercel site (`auth,first-run`) real accounts were getting the sample dental clinic. The backend
serves the reads and, since 15 Nov, the writes (`backend/README.md`); suggested questions and members answer
empty, and the calls it doesn't serve (Discovery, keywords, Telegram) fail on a real project. `Report.factsChecked` false means nobody checked the answers against
the brand's facts: an empty list of wrong facts then reads "not checked yet", never "none found". The setup
sends `firstRunId` with `POST /projects`. With it on, the session cookie is the backend's; the
mocks ask the backend once who a token belongs to (`mocks/api.ts`, `backendUser`) and let every such account
see the sample project. Empty, the login is a mock again (demo@geo.uz, any six digits). What the backend's
slices change in the contract below:

- Login is by email, not phone (done): `POST /auth/code` and `/auth/code/verify` take `email`; `User` has `email`,
  and `phone` and `telegramUsername` come back null. `PATCH /auth/me` takes `name`. Telegram login and SMS are
  not built, and the login page no longer offers them.
- A new account's first look (wired, 15 Nov; types `FirstRun`, `FirstRunResult`) is `POST /first-runs` (202,
  returns at once; `GET /first-runs` lists the account's) with `GET /first-runs/{id}` for its
  progress (`status`: queued, reading_site, asking, reading_answers, done, failed) and `GET /first-runs/{id}/result` for a `Snapshot` that also carries `engines` (scores per assistant),
  `recommended` (per brand id), `answers`, `description` and `services`; an answer says its `engine`, a mention
  whether it is `recommended`. `POST /snapshot` is not built.
- Two assistants, ChatGPT and Gemini, from 15 Nov; since 21 Nov 2026 Gemini with Google Search is paused for Google's
  terms (`ANSWER_ENGINES=chatgpt` on the server): the first check's screens show the assistants `/health` lists
  (`useAnswerEngines`), and the public pages and plans name ChatGPT with Gemini "soon" (`ENGINES`, `ENGINE_TILES`).
- **Confirm first, check after (16 Nov; the user: "I don't understand the flow we have … more structured").**
  `/onboarding/first-run` is four numbered steps before anybody is asked (`FirstRunSetup`, `FIRST_CHECK_STEPS`):
  1 the website and the country; 2 the business as we read it; 3 its competitors; 4 the questions (ten at most
  in a first check) and the brand questions. `POST /first-runs` only reads the site and stops at `ready`;
  `getFirstRunDraft` fills steps 2 to 4; the last button is `confirmFirstRun` (`POST /first-runs/{id}/start`),
  then the progress, then the statistics, whose button saves the check as the project
  (`projectFromFirstRun`) and opens its dashboard. No setup after the check: `/onboarding?firstRun=` is no
  longer linked to. The steps reuse the wizard's pickers and its preview of the app on the right. Step 3 is
  `CompetitorRows` (the user's picture): a row a competitor with its site's icon, its name and website to
  correct, ✕ to remove, a row to add one. A 402 from the backend is "your free check has been used".
- **The first check's screens follow the user's pictures (16 Nov: "why you have not made our first setup as
  attached images").** The order had been taken from them and not the screens. Now, in our navy and our words:
  the setup is our name on a navy panel at the left (from `lg`) and the step at the right: the title, a
  sentence, the numbered steps, the fields, Previous at the left and Next at the right; no picture of the app
  beside it. Step 1 asks the company's name (optional, told to the reading), the website, the country, and
  shows the questions' language, which follows the country. Step 2 shows the name, "what you do" and the
  sector, with services, city and other spellings folded under "more details". Step 4 is `QuestionList`:
  numbered cards with a pencil and a bin and a dashed "Add a question (n/10)", the brand questions the same
  way, then "Asked on: ChatGPT, Gemini". The check runs on a navy screen (`FirstRunProgress`): our mark in a
  ring with the assistants on it, three lines with the current one bright, the answers counted. The
  statistics open with a headline ("Your AI visibility for …"), the button to the full analysis, and four
  tabs (competitors, pages, sites, answers) over the conclusion and the rest. Not taken from the pictures:
  their colors and logo. Since 17 Nov the results fill in while the check runs (`FirstRunLive`): the navy
  screen stands until the first answer, then the headline with "still collecting · 4/15" and the four tabs,
  asked for every three seconds (`getFirstRunPartial`); the finished check's page takes its place. The live
  counts come from the answers' own words, so a competitor the answers spell another way is counted only at
  the end, and the page says the final numbers come when the check ends.
- **The free checks' queue (22 Nov; the user: "Cap at 2 a day + queue").** Past the day's free checks for everyone
  (`FREE_CHECKS_A_DAY`) the draft comes with `queue: true`: step 4 opens with a note that the check joins the queue
  and the report is emailed, and its button reads "Join the queue"; a website read past the limit had no competitor
  search (`competitorsSearched: false`), so step 3 says they were suggested from the website. Confirming sends the
  page's language (`language`, the email's). A check in the queue (`waiting`) shows `FirstRunQueued`: its place, the
  address the report goes to, and "Back to the home page" in the bar; since 25 Nov 2026 (the server asks the queue every 15
  minutes) the page asks for its check every 30 seconds (`QUEUE_POLL_MS`), so an open tab moves on by itself to the
  check's progress and then the project, and its note says so. The team runs the queue
  by hand (`backend/README.md`). The empty dashboard says the check is in the queue, its place and where the report
  goes, with a link to it, in the place of "No projects yet" (the user's choice: "Queue on the dashboard").
- **Every screen of the first check and the login is the window's height (18 Nov; the user: "full page not
  scrolling … buttons must be always visible").** The page never scrolls (`data-screen`, and globals.css keeps
  `html` from scrolling under it); a part inside does. The setup (`Shell`): the title and the numbered steps at
  the top, the fields scrolling under them, Previous and Next in a bar at the foot. The live results and the
  statistics (`FirstRunScreen`): the header, the content scrolling, and the screen's buttons in the bar at the
  foot ("See my full analysis", disabled while the check runs; then it and "Check another website", one under
  the other on a phone); the statistics' navy closing band is gone, its sentence is in the bar. The navy
  progress screen is `h-dvh` too. The login: its form column scrolls only on a window too short for it, and its
  navy panel is tighter below 820px of height (the `tall:` variant).

## MVP scope
Written in October; the MVP as it stands now is `../PLAN.md`, "What the MVP is", and wins where the two differ.

1. Brand setup: name, aliases (Latin + Cyrillic spellings), domain, description, category, city, services,
   up to 5 competitors (onboarding pre-fills all of it from the website, then suggests competitors, the
   topics of the suggested questions, and the questions)
2. Prompt set: 20–50 buyer questions per brand, Uzbek and Russian, editable
3. Runner (backend): send each prompt to OpenAI with web search ON, 3 samples per prompt
4. Parser (backend): extract brands mentioned, order, tone, cited URLs
5. Scores: visibility %, share of voice, average position — per prompt and overall
6. Report: web page + PDF, delivered via Telegram bot

NOT in MVP: other engines (Yandex, Gemini), billing, self-serve signup, CMS plugins. (Written in October. Since
14 Nov the first flow is self-serve, login by email, then a first run on ChatGPT and Gemini: see `../CLAUDE.md`.)

## Product roadmap
Two documents in the repository root hold the reasoning: "GEO Competitor Teardown & Our Feature List.md"
and "Peec AI Teardown & Our Plan for Central Asia.md" (every Peec feature, our status, our local version).
Read them before adding a feature or a pricing claim. `backend/PLAN.md` holds the backend plan made from the
pages built so far (tables, the weekly run, how each number is calculated, what each page needs, cost per plan,
open questions): add to it each time a page is finished.

The list below is the state of October 2026; what was built since is in `../CLAUDE.md`, "Done".

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

Plans (the user's decision, 15 Nov 2026, in dollars; they replace October's soʻm plans): the first check free,
once an account (ten questions on Gemini, five of them on ChatGPT) · Standard (`start`) $34.99 a month, weekly,
25 questions · Pro (`business`) $79.99, twice a week, 50 questions, wrong facts against the owner's facts ·
Enterprise (`agency`) "Custom", several projects · Managed GEO "Custom" (the prices of 22 Nov 2026). Every competitor limit is 5;
one answer a question. The table is in `../PLAN.md`; the limits are `PLAN_LIMITS`, in shared/constants and in
`backend/app/projects.py` alike.

## Landing page
Rebuilt on 16 Nov 2026 after the user's look at vizibleai.com ("our landing page is not accurate and not
structured correctly … make it clear everything"): the structure of a clear product page, in our own look and
words. In order (`SECTION` in marketing/constants, `pages/landing-page.tsx`):

1. **Hero**: the indicator (since 18 Nov: a pill with a dark "Jonli" badge and its live dot, a sparkle, what is
   new and an arrow to the assistants' section; it says only what the product does: since 21 Nov 2026 "Savollar
   mijozingiz shahridan beriladi" (Phase 0 item 0.7), no longer "Gemini kuzatuvi qoʻshildi", and never Google's AI
   answers until they are checked), the headline, one short sentence with the
   metrics as chips, and **the website field itself** (`SiteForm`: when `first-run` is live it opens the login at
   once with the website in `next`, `/login?next=/onboarding/first-run?site=…`, so step 1 has it after the code;
   with sample data `/check?site=`), a line "free · email · about 5 minutes · book a demo" (the check takes 4–5 minutes, as the first check's screens say; the landing said 2–3 until 22 Nov), then the dashboard preview.
   **Every "Check for free" button** (the navbar, the phone menu, how it works, the free, Standard and Pro cards,
   the business card, the closing band) opens the login at once (`FreeCheckLink`, `/login?start=check`; the user,
   22 Nov 2026: "first login then run the check"; they scrolled back to the field before). The login page then says
   the free check starts right after; a new account goes to its first check after the code, one with projects to
   its dashboard; a visitor already logged in goes through `/dashboard?start=check`, which opens the first check
   for an account without a project.
2. **Assistants** (`Engines`): ChatGPT "every check"; Gemini (paused since 21 Nov 2026), Google's AI answers and
   Yandex "soon", then why
   these, three StatCounter figures for Uzbekistan with their month (`MARKET_FIGURES`: update the numbers and
   the month in messages together).
3. **How it works**: three numbered steps and the button.
4. **Metrics**: the three tabs on one sample answer (`MetricTabs`).
5. **Competitors and sources** (`Compare`), 6. **What AI says about you** (`BrandAnswers`), 7. **Fixes**
   (`Fixes`), 8. **Report** (`ReportPreview`): each a section head (`SectionHead`: label and heading on the
   left, one paragraph on the right) over **real pieces of the app** in `ProductFrame`s (a light ground, the
   app's own card, a caption under it): `BrandTable`, the cited sites with "are you on it", `BrandViewCard`,
   the open fixes with `useActionTitle` and `ImpactBadge`, `SiteAudit`, the report's first page with
   the count of buyer answers naming the clinic and the five areas by their counts (since 21 Nov 2026, from
   `mockWave`'s metrics; the gauge went with the score). The sample is the clinic of `mocks/demo.ts`
   (`DEMO_REPORT`, `DEMO_BRAND_VIEW`, `DEMO_ACTIONS`, `DEMO_SITE_CHECKS`).
9. **Why us** (`Local`): six cards. 10. **Who it is for** (`Audience`): a business (the navy card), an agency.
11. **Pricing** (the cards, Managed GEO, the comparison `PLAN_TABLE`), 12. **FAQ**, 13. **Demo form** (since
   16 Nov it reaches the backend, `POST /demo-requests`), the navy closing band, the footer.

**The Terms of use and the Privacy policy** (24 Nov 2026): `/[locale]/terms` and `/[locale]/privacy`, under the public
pages' navbar and footer (`pages/terms-page.tsx`, `privacy-page.tsx`, `components/legal/legal-document.tsx`): a label,
the title, the date (`Legal.updated`), the opening, the sections as links, each section numbered, how to write to us.
The sections are `TERMS_SECTIONS` and `PRIVACY_SECTIONS` (marketing/constants), their texts `Legal.terms` and
`Legal.privacy`, paragraphs split at a blank line; `{email}` is `CONTACT_EMAIL` (shared/constants), drawn as a mailto
link. They state what the product does and keeps: change them with it, and the date. The footer's Legal column links
them and writes to us; the login's email step says continuing accepts both (`Login.agree`).

Every claim says what the product does on that date, and a planned part says "tez orada" wherever it appears
(Telegram, Google's AI answers, Yandex, the full site audit, the agency's name on reports). Never add customer
quotes, logos, ratings or contacts we haven't got: the footer's placeholder contacts were removed. A market
figure goes on the page only with its source and month, read from the source itself.

The hero's dashboard is the app's Overview built from the same shared components (`shared/components/scores`:
HeadlineKpis, TrendPanel, BrandTable, TopDomains, SourceTypesChart) with `mocks/demo.ts`, so the
two can't drift apart. It plays by itself (`autoplay`: the chart reads out week
after week and switches metric) and is labelled as sample data. All motion on the page is CSS or a small
client component, stops under `prefers-reduced-motion`, pauses off screen, and ends: nothing animates
forever (see below). The headline is never animated.

### Our look
Peec's layout, not Peec's look (the user, 14 Nov: "so it does not look like 100% as Peec AI"; they chose "navy and
paper", the pilot report's look). The tokens are in `globals.css`:

- **Colors.** Navy ink for text (`--foreground`), navy for the main buttons and the brand (`--primary`, `--brand`:
  the pilot report's `#1c2e6e`), warm grays for grounds and lines (`--muted`, `--border`, `--sidebar`), white
  cards. No pure gray. The charts' colors (`--series-*`, `--you`) are not part of it: see "Charts".
- **Type.** Onest for text and headings (`app/fonts.ts`; Cyrillic drawn with the Latin), JetBrains Mono for
  small labels. The public pages add one accent, Source Serif 4 in italic, the pilot report's serif
  (`features/marketing/fonts.ts`, the class `font-display`): the last words of the hero's headline, nothing else.
- **The landing page's marks**, in the place of Peec's (corrected by the user the same day, with another
  product's page as the picture: "main text … professional pages' font style", "header a little bit bigger",
  the languages as a dropdown, icons in tiles):
  - The headline is a heavy sans line, tight (`font-bold`, `tracking-[-0.04em]`), with its last words in the
    serif italic in navy, not a black line over a gray one. Section headings are the same sans, bold.
  - The sentence under it (since 18 Nov; the user, with two other products' heroes as the pictures: "sub text
    make as in the screenshot, but appropriately of our, but not many text, and style make the same") is one
    short line: enter your website and find out how ChatGPT and Gemini see you, then three metrics as chips in
    the line, then "what to fix". A chip (`metricChip` in hero.tsx) is our own icon and the app's own name for
    the metric, white with a hairline border and a soft shadow: Tilga olinish, Oʻrni, Manbalar (Видимость,
    Позиция, Источники; Visibility, Position, Sources). The chips are tags in the message (`t.rich`), so each
    language keeps its own word order. The old terms Koʻrinish, Oʻrin, Ohang stay out: the user found them hard.
  - A section's label is a numbered kicker (`Kicker`: "01 —— AI METRICS", counted by CSS from the marketing
    layout's `counter-reset`), not a bordered pill with an icon. The hero's indicator is the one pill.
  - Plain paper behind the hero (no dotted texture, no glows), no hairlines down the page's sides, flat cards (a
    line, no shadow) with a smaller radius, a navy closing band with a white button.
  - The navbar is 80px tall with text in the body's size; the language is a button (globe, "UZ", chevron) that
    opens the three languages under their own names with a check on the current one (`LocaleSwitcher menu`). Since
    16 Nov the app has the same dropdown, smaller, on every page (the user: "make it as landing page header"): the
    workspace's top bar, login, the first check, the setup (`up`: it opens upward) and the shared report; only the
    phone's menu on the landing page keeps the three short links (`row`).
  - An icon on the public pages sits in a filled rounded square, white on a color of its own (`TILE_COLORS`): the
    navbar's menus and the "why us" cards.
- **The name and the logo** (17 Nov 2026, the user: "change the logo, Seenova AI the branding"). The name is
  **Seenova AI** everywhere it was GEO; "GEO" stays only as the practice's name (Generative Engine
  Optimization: the FAQ's "What is GEO?", the plan "Managed GEO"). Internal names keep `geo` (the repository,
  the `geo_session` cookie, `geo-tour:` keys, the server's service and subdomain). The wordmark (`Wordmark`):
  "Seenova AI" in one color, semibold, tight (white with `tone="dark"`). The mark (`LogoMark`, since 18 Nov: the
  user disliked the eye of 17 Nov and asked, with Peec's mark as the picture, for "the same … but rounds"):
  two solid rounds, a small one rising above and to the right of a large one (`ROUNDS`), flat, in the color of
  the text around it (ink on light, white on navy). Peec's mark is two bars; ours is two rounds in our own
  colors, never Peec's shape. `app/icon.svg`, `app/favicon.ico` (16, 32, 48px) and `app/apple-icon.png` (180px,
  full-bleed) are the rounds in white on the brand's navy tile. The login panel and the first check's panel
  are the brand's navy gradient, the login panel with the two rounds drawn huge and faint. Emails write the name in `mail.BRAND` and `mail.WORDMARK_HTML`.
- **A shared link's picture** (23 Nov 2026, when the site went public at https://www.seenovai.com, `SITE_URL`): every
  page's card (Telegram, WhatsApp, Facebook, X) shows `public/og/<locale>.jpg`, 1200×630: the login panel's navy
  gradient, the mark and the name, the assistants asked, the hero's headline with its serif last words, the free
  check's button and the address (`shared/helpers/share.ts`, from the `[locale]` layout, which sets `metadataBase`).
  Each page's own title and description go on its card. The pictures are drawn by Chrome from the messages:
  `node scripts/share-images.mjs` after changing the headline, `Landing.submit`, `Landing.cta.eyebrow` or the
  assistants (`ENGINES` in the script).
- **Buttons** (18 Nov, the user: "inside of Dashboard the buttons must be background colored … cancel buttons
  must be appropriately colored background"; asked, they chose black, in the dashboard only). `ui/button` takes
  its colors from tokens in globals.css (`--button*`): the main button (`default`) and the soft one (`outline`).
  On the public pages, the login, the first check and the shared report they are navy and white with a
  hairline, as before; while the workspace is on screen (`:root:has([data-workspace])`, so its windows and menus,
  drawn outside it, follow too) the main one is black with white text and the soft one a filled warm gray with
  no line. Cancel, Back, Decline, "Show more" and paging buttons are the soft one; only icon-only buttons (and the
  header's Log out) stay `ghost`, with no ground. In the workspace never paint a soft button white
  (`bg-background`): it hides the gray.
- **Icons** (14 Nov). Two sources, no Lucide (the set Peec uses; the package is removed):
  - **Our own** (`shared/components/own-icons.tsx`), where a visitor looks most: the sidebar's pages, the four
    metrics (`IconMentions`, `IconVoiceShare`, `IconPlace`, `IconRating`) and the action goals. Drawn on a 24
    grid with a 1.5 line; a filled dot in them is "you".
  - **Phosphor** for everything else, each imported from its own file and named as the code calls it:
    `import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown"`. Always the
    `dist/ssr` file (it works in server and client components) and never the package's root, which would pull
    the whole set into a page. A component that takes an icon types it `AppIcon` (`shared/types/icon`).
  - An icon is sized by its class; without one it is 24px (a rule in `globals.css`).
- **Metric names in Uzbek** (the user's choice, 14 Nov: the old ones were "not very understandable even in
  Uzbek"): Tilga olinish (was Koʻrinish), Oʻrni (was Oʻrin), Baho (was Ohang). "Umumiy koʻrinish" (the Overview)
  and "AI koʻrinish" as the name of the field keep the word. Russian and English are unchanged.

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
- **Vercel's Web Analytics** (`@vercel/analytics`, the user, 22 Nov 2026) is in the root layout, on every page: a small
  client component that loads Vercel's own deferred script (`/_vercel/insights/script.js` on Vercel; in development a
  debug script that sends nothing). No cookies. Turned on in Vercel's dashboard (Analytics); nothing to set here.
- **No app libraries on the landing page.** No TanStack Query (the demo form keeps its own state) and no
  Base UI: `ui/button`, `ui/input` and `ui/separator` are plain elements, and an InfoTip or a Hint downloads its
  bubble (`info-tip-popup.tsx`) the first time one is opened, like ExpandButton its window. Check after adding a
  dependency to anything the landing page renders.
- **Links to the page's own sections** use `SectionLink` (marketing/components), which is never prefetched;
  so are the logo and the language links. A prefetched link to "/#pricing" downloads the page it is on.
- **Nothing that moves sits under a filter, a mask or a backdrop blur.** The hero has no glows or texture
  (since 14 Nov); the preview fades into the page under a painted gradient to `--page` (the
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

## Fields and loading (17 Nov 2026)
The user: "Select, input … need to be corrected, the smooth, cleaner component" and "make the loading effect
better, with animations".

- **One field style** (`shared/components/ui/field-style`: `fieldClass(size)`, `areaClass`): 32, 40 (the
  default) or 44px, a hairline border that darkens on hover, a navy border with a soft halo in focus, 16px
  text on a phone (no zoom) and 14px from md. `Input`, `Textarea`, the settings' `FIELD`, the search boxes and
  `FilterMenu`'s chips use it. A choice from a list is `ui/select` (Base UI's Select drawn in that style, its
  list in the menus' look with a check): never the browser's `<select>` (`NativeSelect` and `FormSelect` are
  gone). A choice's value can't be "": use a word of your own for "none" (`WHOLE_COUNTRY`).
- **Moving between pages (23 Nov 2026; the user: "opens and closes very hardly, no animation or smooth switching")**:
  every project page has its `loading.tsx` (the `PageSkeleton`), so a click shows the next page's outline at once
  instead of holding the old page for the server's second or two; `Page`'s content fades in (`animate-page-in`,
  opacity only, so sticky and fixed parts hold). The opened action slides in from its side and back out
  (`animate-panel-in`/`-out`, on a phone `animate-sheet-in`/`-out`, closing waits `PANEL_OUT_MS`), the assistant
  panel slides in, the menus open in 150 ms, the project cards lift on hover. None of it under reduced motion.
- **Loading**: `PageSkeleton` is shaped like a data page and appears after 150 ms; its blocks are the
  `skeleton` utility (a light passing over). `NavigationProgress` runs a bar across the panel's top from a
  click on a link until the page (not its skeleton, `data-skeleton`) is there. The check's navy screen
  moves while the assistants are asked. These are the one exception to "every animation ends" below: they
  repeat while something loads and go with the screen that shows them; they stand still under reduced motion.
- **A choice that reloads the page** (24 Nov 2026, the user: "when switching from All to any ChatGPT or Gemini there
  must be a modal loader at least at the center of the page"): a choice kept in the address shows no `loading.tsx`,
  so while the server renders the page again `PendingOverlay` stands in the middle of the screen over a light veil,
  saying what loads ("Loading ChatGPT’s answers…"), from 150 ms. The assistant switcher, the language and topic
  chips (`ReportFilterBar`) and every page's tabs (`PageTabs`, through Next's `useLinkStatus`: `LinkStatus` tells the
  tabs, which draw the loader outside the link, so a click on it doesn't reach the link) show it.

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
- Label the collection method (the assistant, web search, the date) on every report. Never the model's name
  (the user, 17 Nov 2026: "we don't have to show which models we used"), and not "API".

## Stack
Two separate folders, one git repository:

- `frontend/`: Next.js (App Router) + TypeScript strict, Tailwind CSS, shadcn/ui (its parts restyled and its
  icons replaced: see "Our look"),
  TanStack Query for data fetching, next-intl for uz/ru/en. Charts are our own (`LinePlot`, `BarRows`):
  `recharts` is still in package.json but nothing imports it since the report's rewrite (Oct 8).
- `backend/app/`: Python (3.9 on this computer), FastAPI, SQLAlchemy 2.0, SQLite here and Supabase's Postgres
  on the server, in a plain `.venv`. No Alembic, tests or queue yet: tables are made at start, a first run is a
  thread. Supabase also does the login; the service runs on a server at Contabo (the user's choices, 14 Nov).
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
      (app)/              # workspace, login required: /dashboard, /settings, /projects/new (sends to the first
                          #   check), /projects/[id]/… (overview, prompts, prompts/[promptId], answers, competitors,
                          #   sources, sources/[domain], wrong-facts, reports, settings)
      onboarding/         # login required, no sidebar: first-run (the first check: its four steps, the check, the
                          #   statistics); / without a first run goes there; the old wizard and runs/[id] (its
                          #   progress) open on sample data only
      projects/[id]/report/   # client-facing report, public, no sidebar
      admin/              # the team's admin page (25 Nov 2026): login/ on its own, (panel)/ with its menu: / (overview),
                          #   waiting, projects, users; behind the `geo_admin` cookie, never an account's session
  features/               # one folder per product area
    admin/                # the team's admin page (25 Nov 2026: the user asked for a super-admin login and a dashboard of the
                          #   users, the brands registered and the waiting list, approving there and reading their reports,
                          #   then "can we make different menu page for each"): AdminShell (the workspace's frame: a menu of Overview,
                          #   Waiting list with its count, Projects, Users, the site and Log out; a drawer on a phone), its
                          #   own login (AdminLoginForm: a name and a password; 401 wrong, 429 shut for the hour, 404 not set
                          #   up on the server), StatCard, ProjectsTable (owner, plan, checks, the latest check's "named /
                          #   answers", Report and Snapshot by their links in a new tab), UsersTable (joined, last login,
                          #   projects opening their reports, the free check's state), WaitingTable with ApproveButton (a
                          #   second press says the cost and starts the check, past the day's limit) and RunningList (asked
                          #   again every 10 s while a check runs). Read-only but Approve. Calls `adminApi`
                          #   (shared/api/client.ts), always the backend, never sample data
    marketing/            # landing (components/landing/: one file per section), free check,
                          #   components/layout/: navbar + footer of all public pages; SectionLink (a link to
                          #   "/#section", never prefetched); see "Keeping the landing page fast"
    auth/                 # login screen (auth-layout + auth-panel): an email, then the code sent to it; where to go after login
    workspace/            # shell: sidebar by task in sections (collapsible) with a "start here" checklist at its foot
                          #   (progress kept in the browser), project card, account, help sheet, placeholder (Reports),
                          #   the Seenova AI assistant panel (design only, opened from a page, e.g. "Analyze" in Answers)
    answers/              # Answers: numbers about the answers themselves (naming the client, negative about it,
                          #   naming nobody, with a web search), then every answer as a table row, the answers to
                          #   one question grouped under the question written once (search; filters by brand
                          #   named, by site cited and by status); the rows shown export as CSV with their full
                          #   text; a row opens a chat window (question, answer, details, Previous/Next); ?prompt=
                          #   opens a question's first answer, ?source= starts with the answers citing a site.
                          #   Since 24 Nov 2026 (the user: "the Russian prompts and Uzbek prompts are mixed up, maybe
                          #   just make it tab version") the questions' languages are the page's tabs (All languages,
                          #   Oʻzbekcha, Русский: ?lang=, so the numbers follow) in the place of the language chip, and
                          #   under All languages each language's questions come under its name and count
                          #   (`answerRows` orders them Uzbek, Russian, English; `AnswersList`'s `languageHeadings`)
    competitors/          # Competitors: four numbers on where the client stands (place, gap to the leader, topics
                          #   led, questions without it), the brands table, who leads each
                          #   topic (helpers/topics.ts; a topic opens its questions), the brands ChatGPT names that
                          #   aren't tracked, like Peec's brand suggestions (track one while the plan has room:
                          #   Project.limits.competitors; or hide it, and show it again), and a card per competitor
                          #   with the questions it wins (each opens the question's page) and a stop-tracking button
    sources/              # Sources: Sites and Pages as the page's tabs (?view=pages). Since 17 Nov (the user:
                          #   "sourcing … must be more understandable") each view opens on PresenceSummary: how much
                          #   of what AI cites leaves the client out (sites it is missing from; pages naming only
                          #   competitors), every citation as one bar split by whom it works for (its own site,
                          #   sites it is on, missing from, competitors'; for pages: naming it, only competitors,
                          #   nobody), and the three to start with, each with whom it names and the way onto it (the
                          #   listing action when the plan has one). Then the table (SitesTable / PagesTable): "are
                          #   you there?" as a filter over it and a column (under the name on a narrow card) with
                          #   "Get listed", Peec's gap switch, search, kind filter, CSV and the row count. Last
                          #   "Overview", the five most cited over the checks (SourcesChart, from the second week),
                          #   and "What changed" (MoversCard, from the second check). &type= starts the sites on
                          #   one kind. A site anywhere opens its own page.
                          #   pages/source-page: one cited site (/sources/[domain], the domain as written, "2gis.uz"),
                          #   with Pages / Answers as its tabs (?tab=answers&page= opens the answers citing one
                          #   page). Pages: the site's mark and link, its facts in a strip across the panel, a
                          #   sentence on what it means for the client with a link to the fix that gets it listed,
                          #   the whole site and its pages over the checks, its pages' movers beside who ChatGPT
                          #   names when it cites the site, its pages' table. Answers: SiteAnswers. A site the
                          #   latest check no longer cites keeps its page from the history, without tabs
    wrong-facts/          # Notoʻgʻri faktlar, rebuilt 18 Nov (the user: "wrong facts … must be analyzed carefully"):
                          #   from the latest check's brand answers and wrong facts. AccuracySummary: everything the
                          #   assistants said as one bar (wrong, not on the website, matching it), whether each knows
                          #   the business (knownBy: the worst of its answers), what the answers were checked against
                          #   (the website, and the owner's facts, with the way to them). Then the wrong ones
                          #   (WrongFactCard: what AI says beside the truth, the assistant and the question, since
                          #   when, "How to fix" opening its action in Harakatlar); what AI says that the website
                          #   doesn't (StatementGroups by topic, to check: put it on the site, or add the correct
                          #   fact); what it gets right, folded. A statement said by several answers or assistants is
                          #   shown once with all their names (statementsOf). "Checked" means brand answers exist or
                          #   the answers were read against the owner's facts: it said "not checked" before whenever
                          #   no facts were typed, though the brand answers had been checked against the website
    actions/              # Harakatlar: recommended fixes (wrong facts, sites to get onto, pages to write, site fixes).
                          #   Since 17 Nov made simple (the user: "logic is good, but UI is not very understandable";
                          #   until then Peec's Actions: three menus, goal tiles, a tree of status, goal and kind of
                          #   work with boxes to pick rows). ActionBoard: the statuses as tabs with their counts (to
                          #   do, in progress, done, declined; STATUS_TABS) beside the tools (the guided tour, export
                          #   as CSV or JSON, "Add a page": AddContentDialog); the heading with how far the plan has
                          #   come; on "to do" the three most effective as cards (ActionCard: the kind of work, its
                          #   effect, what to do, the evidence (ActionWhy), Start and Details), then the rest as a flat
                          #   list (ActionRow) narrowed by goal, with "Accept all" and "Decline all"; each row has the
                          #   one step its status calls for (start, done, reopen, restore) and, done, what it changed
                          #   once measured. ActionPanel (?action= opens one, on its tab): "Copy for AI", what it is,
                          #   topic, why it matters, "Do it with AI" (17 Nov, the user: a prompt "that can be collapsed
                          #   or copied and put into their Claude or coding AI … or the post can be just recommended":
                          #   useAiPrompt writes it from the action and the business's profile, by kind: a site fix
                          #   for a coding AI or a developer, with how to check it is done; a page from its brief and
                          #   the questions; a wrong fact's correction and a letter to the sites; a listing's profile
                          #   (directory), letter to the editors (news) or post (social); the AI is told to write
                          #   [TO FILL] rather than invent a fact; PromptBox shows it folded, with Copy), the brief for
                          #   a page (headlines, meta title and description
                          #   against their length, what it must prove, evidence; "Write with Seenova AI"), the steps
                          #   to tick, the pages AI reads, the questions it should move, the expected effect or fix →
                          #   proof; at the bottom Decline / Accept, then Cancel / Done. Every change shows a toast
                          #   with a link to its tab (ActionToast). Changes show at once and go back if saving fails
    dashboard/            # project list
    projects/             # project setup. The first check (FirstRunFlow: FirstRunSetup's four steps with
                          #   CompetitorRows and QuestionList, FirstRunProgress's navy screen, FirstRunLive while it
                          #   runs, FirstRunResultView; see "Current phase"). The old onboarding wizard (website →
                          #   brand profile → competitors → topics → questions, with a live preview) is kept for
                          #   sample data; the new project form was deleted on 15 Nov
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
                          #   `?tag=`), general-page (AccountCard: the user's name and email; the interface
                          #   language), members-page (MembersTable: role, status, projects; invite by phone,
                          #   remove), plan-page (Peec's Plans & Billing, as the user asked twice on Oct 10:
                          #   PlanOverview, the plan "Current", its price, cycle and renewal, beside how many
                          #   assistants it asks and "Add an assistant" (soon); PlanCards, "Base plan" with Monthly
                          #   / Yearly and the plans and Managed GEO four in a row (two by two under a 64rem panel),
                          #   level with each other: name, price, three limits with marks (questions, brands,
                          #   competitors), the button (the current plan's cancels, the others switch: a request
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
    prompts/              # Questions, across the whole panel (Page `bleed`). Made simple on 18 Nov (the user: "messy
                          #   and UI design is not structurally correct"; asked, they chose "simple, like
                          #   Harakatlar"; until then Peec's layout: a topics column, three rows of tools and a
                          #   table of 14 columns that scrolled sideways). PromptManager: one row with the tracked /
                          #   suggested / archived tabs, the plan's ring (Project.limits.prompts; at the limit
                          #   nothing can be added, tracked or restored), "Find questions", Add (on Suggested
                          #   "Suggest more") and a ⋯ with the rare ones (on a phone "Find questions", a new topic,
                          #   editing the topic picked in TopicDialog, keywords on Suggested, "Archive all" in red);
                          #   one row of tools: search, the topic (a FilterMenu: the topics are a filter now), the
                          #   language, named or not, a tag (when tags exist), the CSV; one sentence on where the
                          #   client stands over the rows shown ("AI named you in 0 of 10 questions. In 6, only
                          #   competitors were named.") with the trial note or the next check under it; the table
                          #   in four columns that fit the panel: the question (sorts A to Z) with its language,
                          #   topic, wrong facts and tags under it (TagsCell shows when the question has tags or
                          #   its ⋯ › Tags was picked), "Named you" as "0 / 1" (sorts), "Who was named" with the
                          #   tracked businesses written out, the most named first, three and "and 2 more", and a ⋯
                          #   (edit, tags, fact-checking as a ticked item, archive); cards on a narrow panel. Share
                          #   of voice, tone, position, web search, branding, location and the date added are on
                          #   the question's own page and in the CSV. The footer shows only with rows picked (move
                          #   to a topic, archive; track or reject suggestions; track archived ones again), and on
                          #   Suggested with "Reject all" and "Track all". AddPromptDialog (one
                          #   question per line, or a CSV/TXT file: helpers/file.ts; also edits a question);
                          #   SuggestionsTable (why and when each was suggested, ✕ / ✓ per row), "Suggest more" for
                          #   the topic picked or all, ImportKeywordsDialog; pages/discovery-page (/prompts/discovery,
                          #   Peec's Discovery: services, customer types, extra context, languages → new suggestions
                          #   with new topics). ?view=suggested|archived opens a tab, &new= marks new suggestions.
                          #   Left out of Peec's: volume (no data), intent (needs classifying in the backend).
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
                          #   week's, `?print=1` opens the print window) and Hisobotlar (the latest report's counts,
                          #   the register of reports, a page per report with its contents): see "The report"
    pilot/                # the pilot report (/pilots/[slug], public): see "The pilot report"
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
    hooks/                # use-assistant (open the Seenova AI panel from any page), use-logout, use-in-view, use-reduced-motion,
                          #   use-count-words (the report's counts in words: ranks with ties, tone, place, N/A)
    helpers/              # domain (also shortUrl, pathOf, and siteHref + SITE_SLOT: the address of a cited site's
                          #   page as a pattern a server page can hand to a client component), dates, labels, phone,
                          #   scores (pure functions), areas (the report's five areas in order, isListable; the
                          #   condition score of Oct 10 was removed on 21 Nov 2026), history (checks grouped by day,
                          #   week, month), prompts (isTracked), utils (cn)
    constants/            # app-wide constants (ENGINES, TIME_ZONE, SESSION_COOKIE, phone format, prompt limits)
    types/                # api.ts (API contract types), scores.ts
  i18n/                   # next-intl routing, navigation, request config, setPageLocale, pickMessages (the
                          #   part of the catalog a public page's client components need)
  messages/               # uz.json, ru.json, en.json
  mocks/                  # realistic mock data (Tashkent dental clinics), test accounts, mock session
  proxy.ts                # locale routing + sends logged-out visitors of private pages to /login?next=…, and the admin
                          #   page without its cookie to /admin/login
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
Auth: the backend sets an httpOnly session cookie `geo_session` on login. **The browser never calls the backend
directly** (since 15 Nov): it calls `/api/backend/…` on this site, which `next.config.ts` rewrites to the backend
(`NEXT_PUBLIC_API_URL`), so the cookie belongs to the site the user is on, whatever its domain (a Vercel address
now, the product's own later; a cookie from another site's API is not sent back by browsers). Server-rendered
pages call the backend themselves and forward the cookie (shared/api/client.ts).
- `POST /auth/code` → { resendIn } (body: email; sends a 6-digit code to it. On this computer the code is printed
  in the backend's log)
- `POST /auth/code/verify` → User (body: email, code; creates the account on first login; 401 for a wrong or
  expired code)
- `POST /auth/telegram` → User (not built; the login page doesn't offer it)
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
- `POST /projects/{id}/plan-requests` → 204 (body: plan, "managed" or "cancel", and cycle "month"|"year": it reaches
  us; since 22 Nov 2026 only for Enterprise, Managed GEO, and any plan while Stripe isn't set up)
- `POST /projects/{id}/checkout` → { url } (body: plan "start"|"business", cycle, language: Stripe's checkout; its
  billing page when the project pays already; 503 `billing_unavailable` without Stripe) and
  `POST /projects/{id}/billing-portal` → { url } (body: language: Stripe's billing page; 409 before a first payment).
  `Project.billing` says `status` ("trial", "trial_ended", "active", "unpaid", "canceled"), `trialEndsAt`,
  `cancelsAt`, `online` (Stripe set up) and `portal` (a customer exists); `shared/helpers/billing.ts` reads it
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
- The team's admin page (25 Nov 2026; `adminApi`, `backend/app/superadmin.py`): `POST /admin/login` (body: username,
  password; sets the httpOnly `geo_admin` cookie for 12 hours; 401 wrong, 429 shut after wrong ones, 404 when the backend
  has no admin login), `POST /admin/logout` → 204, `GET /admin/me` → AdminMe, `GET /admin/overview` → AdminOverview,
  `GET /admin/projects` → AdminProject[], `GET /admin/users` → AdminUser[], `GET /admin/waiting` → AdminQueue,
  `POST /admin/waiting/{firstRunId}/approve` → 202 (409 when it isn't waiting any more). Server pages pass the cookie on
  like the session's (`sessionHeaders`)

Types:
- User { id, name | null, email | null, phone | null, telegramUsername | null } (login is by email: the backend
  sends the last two as null)
- Project { id, brand: Brand, competitors: Brand[], category, city, languages: ("uz"|"ru")[], description ("" if none),
  services: string[] (as the client wrote them), customers: string[] (customer types, from Discovery),
  identity: string[] (Peec's brand identity: a few words on what the brand stands for, from Sozlamalar › Profil),
  plan: "start"|"business"|"agency", billing: { cycle: "month"|"year", renewsAt | null }, limits: { prompts (questions
  tracked at once), competitors, facts } }. The Questions page reads `limits.prompts` and the Competitors page
  `limits.competitors`; onboarding, which runs before a project and its plan exist, still uses a fixed 5
- Brand { id, name, aliases: string[], domain, logo: string | null (its logo's address, found by the backend on the
  brand's website (the site's icon); shown in the chart's tooltip, the brands table and Savollar, the initial where
  there is none) }
- Prompt { id, text, language: "uz"|"ru"|"en" (English since 16 Nov, for a business serving a country outside
  Uzbekistan and its Russian-speaking neighbours), topic, createdAt, archivedAt | null }
- Report { project, period, method: { engine, model, webSearch: boolean, samples, collectedAt },
  scores: BrandScore[], prompts: PromptResult[], topSources: Source[], wrongFacts: WrongFact[],
  history: HistoryPoint[] (past runs, oldest first, ending with this one),
  sourceHistory: SourceHistoryPoint[] (the cited sites over the same runs),
  untrackedBrands: { name, answers, dismissed }[] (brands the answers name that aren't tracked: new-competitor
  alerts; `dismissed` ones were hidden by the client and are listed apart),
  nextRunAt | null (next weekly run; runs start Monday 06:00 Tashkent; shown on the Overview as a date, not a countdown) }
- HistoryPoint { runId, collectedAt, scores: BrandScore without trend [], answers (the run's answers), named (those
  naming the client): Hisobotlar's register and the project cards show the count since 21 Nov 2026 }
- ProjectLimits { prompts, competitors, facts } (from PLAN_LIMITS in shared/constants and the backend: 25/5/0,
  50/5/20, 300/5/50 since 15 Nov; Standard (`start`) checks no wrong facts against the owner's, so it keeps no facts)
- TagSummary { name, prompts }; Member { id, name | null, phone | null, telegramUsername | null, role: "owner"|
  "member", status: "active"|"invited", projectIds[] }
- WaveResponse { wave, metrics } (`GET /projects/{id}/waves/{runId}`, `latest` for the newest check; read by the
  report's link): one check's data object (report spec §10) and every number the report shows, computed by
  `backend/app/metrics.py`: `scope` (the scope card, from the slot log), `visibility` (the headline count: buyer
  answers naming the client of all of them, the small-sample flag under 20, questions named, citations of the
  client's site of answers citing any site) and `brands` (every tracked brand's count, rank with ties grouped,
  tone per mention with a word only from 3 mentions, place only from numbered lists, share of voice only from 10
  mentions); since 0.3 also `assistants`, `topics`, `languages`, `sources` (each site over the answers citing any
  site) and `claims` (the brand-question check's verdicts); since 0.4 each cited site has the spec's type
  (`DomainType`: client_owned, client_managed, competitor_site, directory, media, ugc, telegram, reference,
  platform_docs, unclassified), its control, its route (`{how, url}`, only from our checked list or a review), who
  typed it (`seed`, `automated`, `founder-reviewed`), whether it lists the client and the competitors beside it;
  `sources.types` counts the sites by type and `sources.targets` lists the placement targets (spec §7). The report's
  `topSources` keep the six `SourceType` kinds for the other pages, with the spec's fields beside them. Types in
  shared/types/api.ts (`WaveMetrics`)
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
  proof: { before, after (visibility 0–1 on promptIds), runs, counts: { before: [named, answers], after: [named, answers] } }
  | null (the report shows the counts since 21 Nov 2026), and by kind:
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

**No condition score since 21 Nov 2026** (report spec Phase 0 item 0.2, rule 1: the 0–100 score of Oct 10 was
the mean of five areas, and with nothing measured one of them stood at a default 50). The report surfaces
(the report, Hisobotlar, the PDF, the project cards, the landing page's sample report, the email) show counts
from the check's data object (`WaveMetrics`), each with what it is counted over ("0/15"):
- the headline: buyer answers naming the client, of all of them, with "small sample" under 20 answers;
- the five areas (`REPORT_AREAS`), each by its own count and no status (the user's decision of 21 Nov 2026):
  visibility (answers), competition (its rank among the tracked brands; brands named equally often share it, a
  brand named nowhere has none, and one leads only when alone at the top), coverage (questions), sources (answers
  citing its site of the answers citing any site), accuracy (its tone per mention, N/A when not named, and the
  wrong facts);
- tone is never a number: N/A at no mention, each tone counted under three mentions, a word ("mostly positive",
  "mixed") from three; a place in an answer only from a numbered list ("no rank (unordered)" otherwise); share of
  voice only from 10 mentions of the tracked brands. `shared/hooks/use-count-words.ts` writes them in words;
  nothing in the frontend computes them. Never default a missing number to 50: write N/A.
- every percentage on a report surface stands beside its count, through `Share` (report-parts: "2/7 · 29%",
  `data-k`, `data-n`), by one rounding rule: `shareOf` (use-count-words), a whole percent rounded half up, the
  same as the backend's `metrics.share` (Phase 0 item 0.3). A site's share is over the answers that cite any site
  (spec §6.3), not over every answer.
- the report's Sources (`sources.tsx`, since Phase 0 item 0.4): the sites by the spec's type as one bar (counted in
  sites), then "Sites you can get onto" (the placement targets, each with its route as a link; a sentence when there
  is none), then every cited site with its type, control, "automated" when the AI typed it, its count, whether the
  client is there (a dash, explained under the table, for a type nothing is suggested for) and the competitors
  beside it. Its table has fixed columns (a long address is cut on a screen with the whole of it on hover, written
  out on paper). The glossary lists the types; the method says how a site is typed; the risks register's
  "listings" reads the targets, at the level of the first one's action (`impact`).
- evidence (since Phase 0 item 0.5): every buyer answer is numbered A1, A2… in the report's order
  (`helpers/evidence.ts`: its question's order, the assistant, the run). The summary's top finding
  (`top-finding.tsx`, from `metrics.top_finding`) shows the question, who appeared, each answer's passage, and
  "Open evidence" with the whole answers (on paper it points to section 14). Each entry of the risks register
  names its answers ("Evidence: A2, A3", links). Section 14, "Evidence" (`evidence.tsx`), prints every answer in
  full under its question with its cited pages, on screen and on paper (smaller type and two columns on paper),
  with "Answers as CSV" (`answers-csv.tsx`, made in the browser). An answer's own words are marked `data-verbatim`:
  a percentage an assistant wrote is not one of the report's. The "every question" appendix no longer prints the
  answers' beginnings on paper. With several runs (0.6) each answer says "run 2 of 3", and on paper only the
  questions where the client or a tracked competitor is named print in full, the others by their beginning (whole
  on the screen and in the CSV).
- the Free Snapshot (Phase 0 item 0.8): `/[locale]/snapshot/[firstRunId]` (`features/report/pages/snapshot-page.tsx`,
  `components/snapshot.tsx`; public, like the report's link): what was asked and the single-run note, who holds each
  question, who appeared (every tracked brand first, then the others named most, marked "unverified"), the top
  finding, what the First Audit adds (locked), a request for it (`audit-request.tsx`, through the demo request with
  `about`), and the digest with Copy (`copy-digest.tsx`). One A4 page on paper (smaller type, the questions in two
  columns, the form left out). Hisobotlar shows the latest check's digest with Copy under the latest report, and a
  link to the snapshot of the first check (`Project.firstRunId`).
- topics (Phase 0 item 0.9, spec §6.3): a topic with fewer than 3 answers gets no standing ("too few answers"), and
  the topics are counted by standing and ordered worst first only when at least 3 of them have 3 answers
  (`metrics.topic_ranking`); otherwise a line says why. The risks register judges only such topics. A block with
  nothing to show says "No data:" and why, never a table of headings alone.
The Overview and the other pages keep Peec's four numbers (`BrandScore`) and the six site kinds until they move to
the data object.

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
- The report's own small charts follow the same rules (the condition score's gauge and columns went with the score
  on 21 Nov 2026): a split (whom the citations work for, the tones of the
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
heading in capitals over a rule, tables ruled and square with dark headings (`ReportCard`, `ReportTable`), and a
sign-off (no status tags since the score went, 21 Nov 2026). No rounded app cards inside it.
It runs in four parts, every section numbered (`REPORT_PARTS`, `REPORT_SECTIONS`):

- **Letterhead** (`ReportLetterhead`): our mark and what we do, the report's number among the project's checks
  and its date; the document's title with whom it is about; then the scope card (`ScopeCard`, spec §4.0, from the
  slot log: Phase 0 item 0.1).
- **I. Condition.** 1 Executive summary (`HeadlineSummary`): the buyer answers naming the client as a large count
  with its small-sample badge, beside the five areas, each with its count and the sentence behind it
  (`useAreaFindings`, from the metrics); the conclusion: the count and who is named most; the week's highlights
  beside the decisions needed (the plan's first three actions). 2 Key figures (`Scorecard`): visibility,
  questions, share of voice, tone, place and "used as a source", the client's beside the strongest competitor's,
  tied competitors named together (comparing checks comes with the change log, spec §4.12, Phase 1). 3 What
  changed since the last report: the events behind the numbers.
- **The decision brief and "Why AI names them, not you"** (23 Nov 2026, spec §4.1 and §4.5 brought forward from Phase
  1, the user's "Build research + decision page"). Section 1 is the decision brief: the headline count and the five
  areas, the conclusion, who holds each question (`ShelfStatus`, shared with the Free Snapshot), who AI named in the
  client's place (the data object's providers, tracked or not) and why, from the research, with a link to section 6;
  then the top finding, the week's highlights, the first three actions and the decision for the week. Section 6
  (`Research`) shows each lost question: who AI named and its sentence, the page it cited for them beside the client's
  closest page with both passages, what theirs states and the client's doesn't (each fact in the page's language of
  the interface, with the rival page's words), the section to add with its blanks, and that it is `automated`; "not
  researched yet" or "no such question" when there is nothing. The competitors section adds the businesses named that
  aren't tracked (`WhoAppeared`, "unverified"). A page action lists its rival pages' facts in the panel and its AI task.
- **II. Analysis** opens (since 17 Nov) with "Each AI assistant" (`Assistants`): each assistant's share over its
  own answers beside whom it names most (ties together, from `metrics.assistants`), a line that Google's AI
  Overview isn't checked yet, and what each
  said about the business by name, every statement against the website. Then a section per area, each with its status beside its title, opening with its conclusion
  (`Verdict`) and closing with the plan's action that answers it (`NextStep`): 4 Competitive position (the brands
  table with bars, visibility over the checks), 5 Topics and questions (the client over the strongest competitor
  as two bars per topic and per language, the questions where only competitors are named), 6 Sources (whom the
  citations work for as one bar, the most cited sites), 7 Accuracy and tone (the tone score with its mentions
  split by tone, the wrong facts).
- **III. Decisions.** 8 Risks and opportunities: a register made from the report's own numbers
  (`helpers/risks.ts`), each entry a sentence with its numbers, what it means, its level and the action that
  answers it. 9 Action plan: how far it has come as one bar, what is still to do in order of effect with the area
  each action improves (`ACTION_AREAS`), then what is done and what it changed.
- **Sign-off** (`ReportSignOff`), where the report proper ends: who prepared it and when. The lines for the
  reader to sign that they had read it were removed on 18 Nov (the user: "remove the signature for bosses part").
- **IV. Reference.** Method and scope with the limits of the numbers and the small-sample and tie rules with their
  thresholds, then Definitions (the numbers, the five areas, ties, N/A; no example number), which close the report. Last, a line on
  what the numbers are.
- **The order since 16 Nov** (the user's corrections): every question with its answers is section 6, right after
  Topics, and the definitions are the last section (`REPORT_SECTIONS`). Topics says what a topic is and what it
  is for, counts the topics by standing, and gives a row a topic in answers ("0 / 2"), with the standing as a
  word and what to do (its counts from `metrics.topics` and `metrics.languages`, the competitors named most with
  ties). Sources counts its sites from `metrics.sources`: the split in sites ("24 of 26 sites · 92%"), each site
  over the answers that cite any site. The risks register speaks in counts, never a percentage. Accuracy answers
  two questions apart: A the tone (every mention counted by tone, a word only from three mentions, N/A when not
  named), B, labelled as a separate check on the brand questions (`data-block="branded"`) with each verdict
  counted (verified, contradicted, unverified, `metrics.claims`), whether what AI says is true (statements against the website, wrong facts as a table). On paper
  nothing opens, so every question prints with the beginning of each of its answers (`PromptTable`).

The sections are drawn by one component (`ReportBody`), so the shared report and Hisobotlar's report page never
differ.

**Hisobotlar** (`/projects/[id]/reports`) opens with the latest report (`LatestReport`: its number, period and
scope, the same count and areas as the report's summary (`HeadlineSummary`), "Open the report", and its link,
Telegram and PDF; "Why 40?" went with the score on 21 Nov 2026). Then every report as a register: number, period,
the answers naming the client of that check's answers with who was named most (ties named together), what
happened that week (`weekEvents`), its PDF; a row opens its report; CSV with the same counts. Last, one line on where the report goes, with Telegram in one click and the rest (email, language, the
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
term is explained in the definitions and under the scorecard's names. Its tables follow the sheet's own width, not the screen's (container queries: `@lg:` and so on), so
they are right beside the contents, on a phone and on paper, where a sheet is about 700px wide. It is laid out for
A4 (`@page` and the `print:` classes): the tools and filters are `print:hidden`, backgrounds print (or bars and
marks would vanish), a section runs on from the one before, its heading and conclusion stay with what follows, a
short table, a card and a table's row are never cut in two, and every page carries "3 / 13" at its foot (a page
margin box in `@page`; a browser that doesn't know them leaves it out). The first page holds the letterhead and the
scope card; the summary (`HeadlineSummary`) is never cut in two, so it opens the second page. "PDF yuklab olish" (`PdfButton`, 18 Nov: the user
"pdf download is not working, there are no pdf download button") downloads the file the backend makes by printing
this same page with Chrome (`GET /projects/{id}/reports/{runId}/pdf`, by the report's link) when its `/health` says
`pdf`; elsewhere, or when the download fails, it opens the print dialog as before. Its texts are the `Report`
namespace; the findings are computed in `features/report/helpers` and the shared score helpers. Check a change to
it as a PDF too (Chrome's `Page.printToPDF` from the test browser), not only on screen.

## The pilot report
`/pilots/[slug]` is a one-off measurement written up for one business, the document sold before the weekly
product (the user's hand-made report for a first client, Nov 2026, is its model and, kept on this computer only,
its sample). It is read from `frontend/pilots/<slug>.json` (`helpers/load-pilot.ts`; the shape is
`features/pilot/types`), which `backend/pilot` writes and a person edits. Not from the API: it has no project.

- **Language.** The report speaks its file's language (`pilot.language`), whatever the address's locale; its
  fixed words are the `Pilot` namespace, in the three languages. Every sentence of findings is in the file.
  The category's noun comes from the file too (`terms`: "школа", "школу", "школ"), so the messages stay
  free of gender: "Упоминания", not "Названа".
- **Order.** Cover with the one number (answers naming the client); the summary a reader may stop at (the
  finding as a headline, the client beside the leader as ChatGPT sees them, four numbers, flags, strengths,
  first steps); then numbered sections: what was asked, whom ChatGPT recommends, the closest competitors, the
  reasons (with the sources and the facts check), the decisions, the plan with the figures for the next
  measurement, the limits. Each section's title is its finding, not a label. Figures and tables are numbered
  in the order printed; a section without data is left out and the numbers close up.
- **A second report** (`pilot.previous`, set when the brief names the report before) opens, after the summary,
  with "what changed" (`PilotChanges`): the key figures before and now, the earlier report's goals against
  where they stand, who gained and lost, the facts and sources whose state changed; the cover says what the
  number was. The two measurements may differ in size, so a change's direction is judged on the share, and
  the page says so. The client's figures read "better / worse"; another business's read "up / down" in gray.
- **Several models** (`pilot.models`, when the script was run with `--also-model`): under the questions' figure,
  a table of the client's counts and the most recommended business on each model, the report's own first, with
  a line saying that single answers differ and the share over many is what holds.
- **Counts, not percentages**: "0 из 5". A pilot has few answers. "Recommended" (in ChatGPT's closing advice)
  is counted apart from "named".
- **Look.** Its own palette (navy, ink, a red, a green, an amber: `PALETTE` in the page) and a serif for
  headings (`fonts.ts`, loaded by this page only). A paper: the same in the light and the dark theme.
- **Paper.** `@page pilot` in globals.css. Every page's margin box is as wide as the paper and the sheets keep
  the side margin themselves, because Chrome lays the whole document out at the first page's width and the
  cover must reach the edges. On paper the root font is 12.5px (`html:has(.pilot)`), so the rem sizes and the
  container widths the layout turns at follow: the first client's report is ten pages. Each numbered section starts
  a page (`Sheet`; `flow` lets one follow the other). The head's and foot's lines are written by the page into
  a `<style>`. Check a change as a PDF: `Chrome --headless --print-to-pdf` against the dev server.

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

- The tour starts by itself on the first visit to a page, once per account on any device (since 23 Nov 2026, the
  user: "must not show anywhere even in different devices"): the account keeps the tours it has seen
  (`User.seenTours`, `POST /auth/me/tours`, `useTourMemory` in the workspace), marked the moment one starts by
  itself; the browser's `localStorage` `geo-tour:<page>` stays as a second memory, and one seen there before is
  passed to the account. Not while a window is open; the book button at the end of the page's top bar shows it again.
- A page names its tour with `Page`'s `tour` prop. The steps are the page's entries in `messages/Tours`, in
  their order (keep it the page's order, top to bottom); each points at the element marked with
  `data-tour="<key>"`. Frame whole sections, as Peec does: a card, a strip of numbers, a table's tools or its
  first row, not a section taller than the screen. A card in a grid is wrapped in `<div data-tour className="grid">`
  so it still fills its row. A step whose element isn't on the page (a tab not open, a narrow screen) is passed over.
- Shared parts carry their own key: the row of numbers (`KpiStrip`, "kpis"), the first answer of a list
  ("answer"), `PageSection`'s and `LinkRow`'s `tour` prop.
- Each settings section has its own (`settings` for Profile, `settingsFacts` and so on); the Profile's first step
  frames the settings' menu in the sidebar (`data-tour="settingsNav"`).
- Harakatlar keeps its own tour in `ActionBoard` (the cards to do first, the tabs, a row, then the opened
  action's steps), started from the book button in its strip of tools. Hisobotlar's tour points at the latest report, the register and the
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
