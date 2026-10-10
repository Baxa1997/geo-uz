# GEO platform for Uzbekistan (working name; repository `geo-uz`)

Start here in a new session: this file says what the project is, how the work is organized, what is done and
what comes next. The details live in three other places, and each should be read before the work it covers:

- `frontend/CLAUDE.md`: folder structure, the API contract, how the scores and charts work, and the rules
  that keep the landing page fast. Read it before changing frontend code.
- `backend/PLAN.md`: what the backend has to do, written from the frontend pages. Nothing in it is built.
- The two teardown documents in this folder ("Peec AI Teardown & Our Plan for Central Asia.md" and "GEO
  Competitor Teardown & Our Feature List.md"): every Peec feature with our version of it, the other
  competitors, and prices. Read them before adding a feature or making a pricing claim.

Keep "Done" and "To do" below current. When a page is finished or a decision is made, change them in the
same piece of work, with the date.

## What the project is

A tool that shows a business how AI assistants talk about it, and what to do about it.

Every week it asks ChatGPT (with web search on) the questions customers ask, such as "best dental clinic in
Tashkent?", in Uzbek and in Russian, three times each. From the answers it measures how often the brand is
named compared with its competitors (visibility, share of voice, position, tone), which sites ChatGPT relies
on, and what it says about the brand that is wrong. Then it gives the owner a short list of fixes: get listed
on a site ChatGPT cites, correct a wrong fact, write a page on a topic where only competitors are named, fix
something on the website.

- **Buyers:** local businesses (the owner or their marketer) and agencies. Uzbekistan first, then the rest
  of Central Asia. Many will read their report on a phone, from Telegram.
- **Languages:** the interface is in Uzbek (default), Russian and English; the questions are in Uzbek and Russian.
- **Reference product:** Peec AI (peec.ai). We copy its layout where it works and make ours simpler, local
  and in plain words. We never copy its name, logo, colors, wording, customer quotes or logos.
- **Why ChatGPT only for now:** it brings about 95% of the visits that AI assistants send to websites in
  Uzbekistan (DataReportal Digital 2026). Google's AI answers and Yandex come next; Google has about 74% of
  search there and Yandex about 22% (StatCounter, 2026).
- **Plans (soʻm a month):** free check 0 · Start 199,000 · Biznes 490,000 · Agentlik 1,490,000 · Managed GEO
  from 3,000,000. Weekly checks. Details in `frontend/CLAUDE.md`.

## Where the project stands

Frontend first. `frontend/` is a Next.js 16 app that runs entirely on mock data (Tashkent dental clinics)
behind the same API contract the backend will implement, so the mocks can be switched off later with one
setting. There is no backend code yet, only its plan.

To see it: `cd frontend`, `npm run dev`, open http://localhost:3000. In the mocks, the phone number
+998 90 123 45 67 with any six-digit code logs into the sample project "Oq Tabassum" (eight weeks of data).
Any other number makes a new account, which goes through onboarding and gets a project with one check.

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
5. **Commit only when the user asks.** Say plainly which branch the work is on.

## Done (as of 10 October 2026)

- **Every page exists on mock data:** landing page, free check, login (phone and code, Telegram),
  onboarding in five steps, the first check's progress screen, project list, Overview, Savollar (questions),
  Javoblar (answers), Raqobatchilar (competitors), Manbalar (sources), Notoʻgʻri faktlar (wrong facts),
  Harakatlar (actions), Sozlamalar (settings, read-only), and the public report.
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
  format's rules are in `frontend/CLAUDE.md`, "The report". The Hisobotlar menu item is still a placeholder
  that links to it.
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
  tags, fact-checking and location). Each time the user chose "commit, push" when asked (for Harakatlar:
  "push everything"). Each page gets its own branch, merged when the user says so.

## To do, in order

1. **The other pages, the same way, in the sidebar's order.** Each also gets hover explanations on its table
   headings, figures and marks (`Hint`), which only Savollar has so far:
   - Javoblar: built and merged (see "Done"); corrections may still come.
   - Raqobatchilar: built and merged (see "Done"); corrections may still come.
   - Manbalar: rebuilt after Peec's Domains screenshots, laid out like Peec's on 8 Oct, confirmed by the
     user and merged (see "Done"). Peec's URLs page was not among the screenshots; our Pages tab stands in.
   - The report: rewritten and merged (see "Done"); corrections may still come.
   - Savollar: laid out like Peec's with all of its Prompts features on 8 Oct and merged on 10 Oct, then its
     topics column, folded rail and table in Peec's design with tags, fact-checking and location, merged the
     same day (see "Done"); corrections may still come.
   - Harakatlar: laid out like Peec's Actions on 10 Oct, corrected twice and merged the same day (see "Done");
     more corrections may still come. Still to come on it: marks on the chart where a fix started and was done (Peec's Impact as a block), once Impact's
     screenshots arrive.
   - Next, as the user asked on 8 Oct ("we need actions, and reports, need to be corrected"): Hisobotlar.
     Their Peec trial ends about 11 Oct, so the remaining Peec screens are captured in one go: Impact,
     Settings › Company (Peec's email report), every other Settings tab including Facts (asked for on 10 Oct;
     the fact-check switch on Prompts came that day and is built). The Fanouts screenshots of 8 Oct need nothing: the question's page already lists the
     searches (decided 6 Oct).
   - Hisobotlar: a placeholder today that links to the report. When its turn comes: the list of past
     checks' reports (needs a report per run from the backend), sending to Telegram, the agency's name on it.
   - Notoʻgʻri faktlar: brand facts for the answers to be checked against (Peec's Settings › Facts).
   - Sozlamalar: editing (today it is read-only), then facts, members, billing.

   Peec pages that get no page of ours (the user agreed on 6 Oct; Discovery left this list on 8 Oct, when the
   user asked for all of Peec's Prompts features: it is "Find questions" on Savollar):
   - Impact: not a page, a block on Harakatlar (the chart with marks, above).
   - Fanouts: no page of its own; since 7 Oct each question's page lists the searches behind its answers.
   - Ads: no. ChatGPT ads aren't sold here, and Peec has paused the page itself.
2. **Parts that are design only:** the GEO AI side panel answers every question with a demo reply; Gemini
   and Yandex are marked "tez orada" in the engine switcher. Plans: a project now carries its plan and
   limits, and the question and competitor limits are used, but nothing sets a plan (every mock project is
   on Biznes) and onboarding still allows a fixed 5 competitors.
3. **Backend.** Begin with step 0 of `backend/PLAN.md`: a small script that measures what one answer costs
   and whether the answers are the ones a person in Tashkent gets. Its result decides whether the prices
   work, so it comes before any other backend code. Then follow the build order in that file. It lists
   nineteen open questions; daily checks (14) and the searches (16) are decided and plan limits (8) partly.
4. **Noted during the dashboard review, not scheduled:** saving a chart as a picture (owners forward
   pictures in Telegram), a date-range filter once a client has four or more weeks, an export menu on each
   card, and a "write to us in Telegram" banner for new clients. Also a "Saytim" (my website) page once the
   full site audit exists: every site check with passed and failed (a client sees only the failed ones today,
   as fixes in Harakatlar) and the client's own pages that ChatGPT cites.

## Commands

All from `frontend/`: `npm run dev` (development), `npm run build` then `npm run start` (the real build),
`npm run lint`, `npx tsc --noEmit` (type check).
