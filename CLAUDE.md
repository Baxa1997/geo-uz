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

## Done (as of 8 October 2026)

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
- **Javoblar (7 Oct), built from Peec's Chats screenshots of 4 Oct; the user has not sent corrections for
  it yet.** Added to the page that existed: CSV export of the answers with their full text, a filter by
  cited site (`?source=` lets other pages link to "the answers citing this site"), hover explanations on the
  table and in the opened answer, and the searches behind each answer in its details. Left out: Peec's
  web-search share, "most common feature" and features filter.
- **Decisions the user made (6 Oct):** visibility is shown in percent, as Peec shows it; a change is green
  when better and red when worse, for the client only (competitors stay gray); daily checks are not offered
  for now, so the day and week views of the chart show the same points.
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
  and pushed on 6 Oct, Savollar on 7 Oct, Javoblar with the second Savollar correction on 8 Oct (the user
  chose "commit, push, continue"). Each page gets its own branch, merged when the user says so.

## To do, in order

1. **The other pages, the same way, in the sidebar's order.** Each also gets hover explanations on its table
   headings, figures and marks (`Hint`), which only Savollar has so far:
   - Javoblar: built and merged (see "Done"); corrections may still come.
   - Raqobatchilar: suggested competitors can be seen but not yet tracked or dismissed.
   - Manbalar: two things from Peec's "My website": the number "cited without a mention" (answers that link
     to the client's site and don't name the client), and a way to see only the client's own pages. From
     Peec's Gap analysis: a filter by kind of site on the gaps tab. Peec's Domains and URLs pages were not
     among the 4 Oct screenshots: ask the user for them.
   - Notoʻgʻri faktlar: brand facts for the answers to be checked against.
   - Harakatlar: marks on the chart where a fix started and was done.
   - Sozlamalar: editing (today it is read-only), then facts, members, billing.
   - Hisobotlar: a placeholder today.

   Peec pages that get no page of ours (the user agreed on 6 Oct):
   - Discovery (a wizard that makes new topics and prompts from services, personas and markets): onboarding
     and the Suggested tab already do this. Worth taking later, inside the Suggested tab: "suggest questions
     for a service or a keyword", which needs the backend.
   - Impact: not a page, a block on Harakatlar (the chart with marks, above).
   - Fanouts: no page of its own; since 7 Oct each question's page lists the searches behind its answers.
   - Ads: no. ChatGPT ads aren't sold here, and Peec has paused the page itself.
2. **Parts that are design only:** the GEO AI side panel answers every question with a demo reply; Gemini
   and Yandex are marked "tez orada" in the engine switcher. Plans: a project now carries its plan and
   limits and the question limit is used, but nothing sets a plan (every mock project is on Biznes) and the
   competitor limit is still the fixed 5 of onboarding.
3. **Backend.** Begin with step 0 of `backend/PLAN.md`: a small script that measures what one answer costs
   and whether the answers are the ones a person in Tashkent gets. Its result decides whether the prices
   work, so it comes before any other backend code. Then follow the build order in that file. It lists
   sixteen open questions; daily checks (14) is decided and plan limits (8) partly.
4. **Noted during the dashboard review, not scheduled:** saving a chart as a picture (owners forward
   pictures in Telegram), a date-range filter once a client has four or more weeks, an export menu on each
   card, and a "write to us in Telegram" banner for new clients. Also a "Saytim" (my website) page once the
   full site audit exists: every site check with passed and failed (a client sees only the failed ones today,
   as fixes in Harakatlar) and the client's own pages that ChatGPT cites.

## Commands

All from `frontend/`: `npm run dev` (development), `npm run build` then `npm run start` (the real build),
`npm run lint`, `npx tsc --noEmit` (type check).
