# Peec AI Teardown & Our Plan for Central Asia

Oct 1, 2026 (updated Oct 6, 2026) · @Bakhriddin

Sources, read Oct 1–3, 2026:

- Screenshots of peec.ai: the home page, the navigation menus, the pricing page and the dashboard shown in the hero.
- Peec's public pages: peec.ai, peec.ai/pricing, peec.ai/for-agencies.
- Peec's documentation at docs.peec.ai (the full index, the sidebar guide, and the pages on the overview, sources, brand perception, actions, the agent, and the three agency pages).
- Third-party reviews. Two are used only for agency prices; those numbers are marked "unconfirmed". Marketer Milk's review of August 6, 2025 is used for how Peec looked and cost a year earlier, in its own section.
- 62 screenshots from a Peec trial account, taken Oct 4, 2026: sign-up, every setup screen, most sidebar pages, settings and billing. The trial project was our own EdTech brand (IELTS and CEFR preparation in Uzbekistan), set up as an in-house team.

Since Oct 4 the inside of the app is described from those screenshots. Pages they don't show are marked "not in the screenshots".

## Summary

**Peec AI sells one idea: track a set of prompts across AI engines every day, and report three numbers per brand: visibility, position and sentiment.** Everything else on the site hangs off that: sources, actions, reports, integrations.

**It sells that idea to two buyers.** Brands (in-house marketing and SEO teams) buy plans by number of prompts. Agencies buy a pool of credits and split it across client projects, with free trial projects for pitching.

**What we take.** The same core loop (prompts → answers → three metrics → sources → fixes), the automatic setup, the structure of their home page, and now the layout of their dashboard.

**What we change for Central Asia.** Uzbek and Russian prompts, ChatGPT first with Gemini and Yandex next, weekly runs instead of daily, local sources (2GIS, local news, Telegram channels), Telegram delivery, and prices in soʻm that are a fraction of Peec's.

**What we skip.** AI shopping, prompt volumes, the ads library, log-file integrations, SSO and the MCP server. They need data or customers we don't have.

**What the trial showed.** In use, Peec is polished, quiet and guided: a checklist in the sidebar, a tour on every main page, a daily onboarding call. It is also broad: 25 pages in eight sidebar groups plus nine settings pages, five of them empty until an integration is connected, in English full of industry terms. For a brand from Uzbekistan it measured the wrong things: setup picked seven engineering firms as competitors because of the brand's name, the answers were collected in the US in English, and the dashboard then called a brand with 0.9% visibility "#1 in AI visibility". Our version keeps Peec's layout where it works and fixes exactly these points (see "What Peec gets wrong").

**Where we stand.** Of the 59 rows in Peec's pricing table, 18 exist in our frontend (on mock data; the backend is not built yet), 13 exist in part, and the rest are planned for later or not planned. For agencies we have the basics (several projects in one account, a shareable report) and none of the agency-specific tools (pitch projects, credit allocation, pausing).

## Peec's home page, section by section

| # | Peec section | What it shows | Ours on the new landing page |
| --- | --- | --- | --- |
| 1 | Navigation | Product, Pricing, Resources and Partnerships menus; Log in, Sign up | Mahsulot and Resurslar menus, Narxlar, Agentliklar; Kirish, Bepul tekshirish |
| 2 | Hero | Small pill, two-line headline, the three metrics as chips, two buttons | Same shape; buttons are "Demo soʻrash" and "Bepul tekshirish" |
| 3 | Dashboard preview | Their real dashboard: sidebar, trend chart, competitor table, domains by type | Our dashboard with the sample clinic's data |
| 4 | Floating input | "Add your own prompts" over the preview | The website field of the free check |
| 5 | AI Search Metrics | Visibility, Position, Sentiment explained beside a ChatGPT answer | Koʻrinish, Oʻrin, Ohang beside a ChatGPT answer in Uzbek |
| 6 | Key features | Six cards: prompts, suggested prompts, brands, models, sources, actions | Six cards: questions, suggested questions, competitors, AI engines, sources, wrong facts |
| 7 | Customer quote | A named customer's quote | A statement of our method (we have no customers to quote yet) |
| 8 | MCP | "Peec MCP is live": connect to Claude, Cursor, n8n | Weekly report in Telegram |
| 9 | Reports | Visibility × sentiment chart; CSV exports, Looker Studio, API | The same chart; PDF, Telegram, shareable link |
| 10 | Testimonials | Nine customer quotes with logos | "Built for the local market": six cards on what only we do |
| 11 | Final call to action | Dark band | Dark band with the free check |
| 12 | Footer | Dark, six link groups, comparison pages | Dark, five link groups |

Pricing is a separate page on peec.ai. Ours stays on the home page, with a comparison table added.

## Every feature Peec lists

Status of ours: **Built** = works in our frontend on mock data. **Partly** = a simpler version exists. **Next**, **Later** = planned phases. **No** = not planned.

### Tracking coverage

| Feature | Peec | Ours | Our version for Central Asia |
| --- | --- | --- | --- |
| AI engines | Pick 3 of 7 collected from the engines' web interfaces: ChatGPT, Perplexity, AI Overviews, AI Mode, Gemini, Copilot, Naver. Enterprise adds 15 API models (OpenAI, Claude, Qwen, DeepSeek, Grok, Mistral, Meta, Perplexity). More models are an add-on | Built (ChatGPT) | ChatGPT now; Gemini and Yandex next. No Naver |
| Prompts | 50 / 150 / 350 | Built | 25 / 75 / 300 |
| Active engines per plan | 3 (Enterprise: unlimited) | Built (1) | 1 now, up to 3 later |
| Frequency | Daily | Built (weekly) | Weekly: about 7× fewer AI calls, which is what makes local prices possible |
| Monthly AI answers | 4,500 / 13,500 / 31,500 | Built | 300 / 900 / 3,600 (prompts × 3 samples × 4 weeks) |
| Countries | 1 / 3 / 3 | Partly | Uzbekistan by city; Kazakhstan, Kyrgyzstan and Tajikistan later |
| Projects | 1 / 2 / 5 | Built | 1 brand; Agentlik: up to 5 brands |
| Languages | Unlimited | Built | Uzbek and Russian per prompt; Kazakh later |
| Competitors | Row not visible in the screenshots | Built | 3 on Start, 5 on Biznes |
| Team users | Unlimited; invited during setup | Later | Unlimited on every plan; today one login per account |

### Discover

| Feature | Peec | Ours | Our version |
| --- | --- | --- | --- |
| Brand context | All plans | Partly | Onboarding reads the website: name, spellings, description, category, city, services. No personas |
| Prompt volume | All plans: a five-bar volume per prompt | No | Needs a large panel of real conversations |
| Competitor suggestions | All plans | Built | Onboarding step 2, plus a notice when ChatGPT names untracked brands |
| Topic suggestions | All plans | Partly | Suggested questions arrive grouped by topic |
| Prompt suggestions | All plans | Built | 20 questions from the website during onboarding, then a Suggested tab to accept or reject new ones |
| Prompts from keywords | All plans | Later | Type "implant narxi", get questions |
| Personas | All plans: setup splits the audience across three personas (casual, informed, evaluative) to steer the suggested prompts | Later | Ask as a parent, a tourist, a first-time buyer |
| Bulk import | All plans | Next | CSV upload of questions |
| Sub-brand tracking | All plans | Later | Branches of one business |
| Regions & languages | All plans | Partly | Language per question; one city per project |
| Topics, tags & categories | All plans | Partly | One topic per question, with a filter |
| Brand classification | All plans: each prompt is tagged branded or non-branded (seen as tags on the Insights heat map) | Later | Mark questions that name the brand, so its share of non-branded questions can be shown apart |
| Intent classification | All plans: tags such as informational and commercial, seen on the same heat map | Later | Tag questions as "which is best", "how much", "where" |

### Measure

| Feature | Peec | Ours | Our version |
| --- | --- | --- | --- |
| Visibility overview | All plans | Built | Laid out like Peec's Overview: five numbers with their weekly change, every brand over time on four metrics, the brands side by side, top sites and their kinds, latest answers |
| Brand insights | All plans: six KPIs per brand, a chart that switches between metrics, a matrix (models × topics × competitors), top rankings | Partly | The Overview's numbers and a chart with four metric tabs; who leads each topic on Raqobatchilar. No matrix yet |
| Ads library | All plans: which brands buy sponsored placements in ChatGPT on the tracked prompts | No | ChatGPT ads aren't sold in our market yet |
| Local GEO | All plans | Partly | The whole product is local: questions carry the city |
| AI shopping (catalog, SKU tracking, merchants, fan-outs, shopping sources) | All plans | No | Our first clients are services, not online shops |
| Domain & URL detail view | All plans | Built | Manbalar: sites and the exact pages cited |
| Subdomain tracking | All plans | No | — |
| Fan-out overview | All plans | Partly (Oct 7) | The searches ChatGPT runs behind an answer: listed on each question's page and in each opened answer. A page across all questions is later |
| Retrievals | All plans | Later | Pages read but not cited |
| Citation share | All plans | Partly | Share of answers citing each site, and citations per answer. Not yet each site's share of all citations |
| Source classification | All plans | Built | Own site, competitor, news, maps and directories, social and Telegram |
| Brand attribute scoring | All plans | Later | How ChatGPT describes you: price, quality, service |
| Custom attributes | Advanced and up | No | — |
| Objections | Pro: monthly; Advanced: weekly | Later | Why ChatGPT recommends someone else |
| Prompts fact-checked | 5 / 10 / 25 | Partly | Notoʻgʻri faktlar page; every question is checked |
| Facts per brand | 5 / 20 / 50 | Next | The client enters real prices, address, hours; we compare |

### Act

| Feature | Peec | Ours | Our version |
| --- | --- | --- | --- |
| Gap analysis | All plans | Built | The outreach list: cited pages that name competitors and not you, most cited first, plus "questions without you" |
| Recommended actions | All plans | Built | Harakatlar: fixes made from the report (sites to get onto, wrong facts, pages to write, site fixes), each with its questions, impact, status and steps to tick; laid out like Peec's since Oct 4 |
| Agent actions | All plans | No | We offer the fixes as a service instead (Managed GEO) |

### Report

| Feature | Peec | Ours | Our version |
| --- | --- | --- | --- |
| Visibility lift analysis | All plans: the Impact page marks on the chart when each action started and was done | Partly | Fix → proof: each done fix shows the client's visibility on its questions before and after. No markers on the chart yet |
| Visibility lift predictor | All plans | No | — |
| Custom tables & views | All plans | No | — |
| Crawlability audit | All plans | Partly | The free check tests robots.txt for AI bots, prices as text, business markup and contacts; a full site audit is next |
| AI referrals | All plans | Later | A script that counts visits from ChatGPT |
| Crawl insights | 4M / 10M / 25M bot visits | Later | Cloudflare first |
| Shareable dashboards | All plans | Built | The public report link |
| Data Studio connector | Advanced and up | No | — |
| API | Pro and up | Later | For agencies |
| MCP | All plans | No | — |
| CSV exports | All plans | Built | Weekly scores (Overview), questions with their results, answers with their full text, sites, pages and gaps (Manbalar), actions |

### Platform, assistant and integrations

| Feature | Peec | Ours | Our version |
| --- | --- | --- | --- |
| Role-based permissions | All plans | Later | Owner and viewer |
| Single sign-on | Enterprise | No | Login is by phone or Telegram |
| Support | Chat; chat and email; dedicated | Built | Help form in the app; answers in Telegram |
| Onboarding | Self-serve (about 16 screens, a checklist and a tour); custom for Enterprise | Built | Five steps laid out like Peec's setup (website, brand profile, competitors, topics, questions) with a live picture of the app beside the form; the first run starts at the end; a start checklist in the sidebar |
| Peec agent (company and project context, memory, skills) | All plans | Partly | "GEO AI" panel: design only, no assistant behind it yet |
| CDN and log providers | Vercel, Cloudflare, AWS, CloudFront, Google Cloud CDN, WordPress, Akamai, webhook, CSV upload | Later | Cloudflare only |

## Inside Peec's app, from a trial account

Everything in this section comes from the Oct 4, 2026 screenshots.

### Sign-up and setup

About 16 screens stand between signing up and the first dashboard:

1. **How will you use Peec AI?** In-house team, or for my clients (free pitch projects, flexible credit allocation across clients, unlimited client seats). Customer quotes and logos fill the right half.
2. **Setup, five steps** (the screenshots show steps 2 to 4). Each step has a form on the left and, on the right, a faded picture of the app with the page where that setting will live.
   - Step 2, **Verify brand profile**, filled in from the website: description, industry, adjectives for the brand's identity, products and services, target markets on a map, and an audience split across three personas (casual recommendation seeker 50%, informed shopper 30%, evaluative researcher 20%; must total 100%).
   - Step 3, **Review topics**: five of up to ten topics, with "Add custom".
   - Step 4, **Review prompts**: 40 of 50, eight per topic, all ticked; "Looks good".
3. **Retrieving sources**: an animation of the engines' logos around the brand's initial.
4. **A preview**: "Your AI search analytics for [brand]" with sample data from the engines' APIs (competitors, pages, domains, recent chats). Sentiment and position are blurred until onboarding continues.
5. **Choose your plan**, 7-day free trial: Starter, Pro, Advanced (see "Pricing side by side").
6. **Choose up to 3 of 7 models** collected from the engines' web interfaces: ChatGPT, Perplexity, Google AI Overviews, Google AI Mode, Gemini, Copilot, Naver. Fifteen more models through APIs (OpenAI, Claude, Qwen, DeepSeek, Grok, Mistral, Meta, Perplexity) need Enterprise. More models are an add-on.
7. **Four survey questions**: role, function (SEO, GEO, growth, PR, content, e-commerce, marketing), where you heard of Peec, and invite teammates (unlimited seats, roles changeable later).
8. **A welcome video**, then "Explore insights".

### The shell

- **Sidebar**: project switcher with search; a Browse / Agent switch; eight collapsible groups (Home, Brand, Prompts, Sources, Optimize, Results, Agent analytics, Shopping); Settings pinned near the foot; the account at the bottom.
- **"Start here" checklist** at the foot of the sidebar: five steps to a "first win in 5 minutes" (workspace set up, where you stand, a real AI response, where AI gets its answers, your first gap), a progress bar, and a button to book an onboarding call.
- **Top bar**: the page title as a breadcrumb, "Trial ends in 7 days", Agent, Help.
- **Filter bar** on data pages: brand, date range, all filters; on the Overview also Edit, Share, and a switch between a "New" and a "Classic" view.
- **Guided tour**: dark tooltips with Skip tour, Back and Next on the Overview, Gap analysis, Actions and Impact.
- **Kick-off banner** on the Overview: a daily onboarding call, with the next two time slots as buttons.

### Page by page

| Section | Page | What it shows | Ours |
| --- | --- | --- | --- |
| Home | Overview, "New" view | An AI chat box ("Discover what AI sees about [brand]") with three suggested questions. No numbers | No. Our Overview starts with the numbers |
| Home | Overview, "Classic" view | Five numbers with their change (visibility, share of voice, sentiment, position, used as a source); visibility per brand as bars with logos, or lines; top 7 brands table; "own source impact" chart with two y-axes; topics × tags heat map; top domains with Top / New / Trending / Losing tabs; domain types (corporate 48%, institutional 25%, UGC 9%, other 9%, reference 8%, editorial 2%, you 0%); recent chats. The numbers stay pinned on top while scrolling | Built in the same layout (since Oct 5): five numbers with their change, a weekly chart with the four metrics as tabs, the brands table, top sites and site kinds as bar lists, latest answers, a Share menu (public link, CSV). Ours adds a sentence on where the client stands above the numbers, shows visibility by topic and by question language as bars in place of the heat map, keeps the recommended actions under the charts, and opens each card large with a takeaway and how to read it. Left out: the two-axis own-source chart, the movers tabs and the pinned numbers |
| Home | My website | The domain; bot visits, session starts and conversions (all "not connected"); used as a source 2%; cited without a mention 4 of 7; AI and human traffic chart; crawl access; why AI bots visit (training, user query, search); HTTP responses bots got; every page with bot visits, retrievals, citation rate, topics and events | Partly: the site check in the free check. No page for now (decided Oct 6): most of it needs server logs or Google Analytics, and the rest is on the Overview, Manbalar and Harakatlar. "Cited without a mention" and a view of the client's own pages go to Manbalar; a "Saytim" page comes with the full site audit |
| Brand | Insights | A one-line verdict ("You're #1 in AI visibility…"); six numbers including the strongest and weakest model; a metric chart with notes on events ("40 new prompts created"); a heat map of topics × tags (the tags include non-branded, informational, commercial) with "switch axis"; top rankings, engines × places 1–8 | Partly: the metric chart and the standing line, both on the Overview. No separate page (decided Oct 6): what remains compares AI engines, and we have one |
| Brand | Perception | Not in the screenshots | Later |
| Prompts | All prompts | A topics column with counts and "New topic"; Active / Suggested / Archived tabs; prompts used, 40 of 50; Generate prompts; Add prompt; a summary line (visibility, sentiment, position, web search 95%); per prompt: visibility, share of voice, sentiment, position, brands named (logos), volume (signal bars), web search; footer "40 Prompts · Runs: Daily · next Mon 5 Oct"; Archive all | Built in the same layout (Oct 5–6): topics column with counts; Tracked, Suggested and Archive tabs; questions used out of the plan's limit (25, 75, 300); search, a "named / not named" filter and sorting; the client's numbers over the rows shown; a table that scrolls sideways under the pinned question, with visibility, share of voice, tone, position, brands named, leader, web search, wrong facts found (in place of the fact-checking switch: we check every question) and date added; a click on a row opens the question; CSV; a footer with the plan and the next weekly check. Left out: volume (no data), branded and intent tags (need the backend), free tags, location (one city per project), bulk select |
| Prompts | A prompt's page (opened from the list) | The prompt with date added, topic, volume, location, status; visibility per brand over time (D / W / M) beside a top-brands table; source distribution (domains or URLs with Top / New / Trending / Losing, domain types); query fanouts with common terms; all chats for the prompt | Built (Oct 6): the question with date added, topic, question language, city and status (tracked, queued, archived); a sentence on the latest check counted in answers ("named in 1 of 3"); every brand over time beside the brands table, and the sites cited beside their kinds, for that question alone; what ChatGPT searched the web for (Peec's query fanouts: each search with the answers that ran it); the recommended fixes that list the question; its answers, each opening as a chat. Left out: volume, the movers tabs, "common terms", answers of earlier checks |
| Prompts | Discovery | A video, then "Tell us more about you": services (from the profile), personas, extra context, then markets | Partly: onboarding and the Suggested tab. No page of its own (decided Oct 6); later, "suggest questions for a service or a keyword" inside the Suggested tab |
| Sources | Gap analysis | Domains / Hosts / URLs tabs: places where competitors are named and the brand isn't. Filters: at least N competitors, brands, domain type, page type. Columns: type (corporate, reference, institutional, UGC; pages: homepage, article, other), brands named, retrieved, retrieval rate, citation rate, gap score, last updated; bookmarks; export | Built (Oct 5): the Gaps tab on Manbalar, pages naming competitors and not the client, with the competitors and the share of answers; CSV. No gap score or bookmarks |
| Sources | Domains, URLs | Not in the screenshots | Built (Oct 5): Sites and Pages tabs on Manbalar with kind pills, brands named, share of answers, citations, "are you listed?" |
| Optimize | Actions | A plan card with four goal tiles: fix how AI reads your site, improve your own pages, get mentioned elsewhere, fix wrong claims. The list is grouped by status (New, In progress, Done, Declined), then by goal; 1–3 bars for impact; tags such as "Your page" and "Technical SEO fix". An action opens in a side panel: why, steps to tick one by one, affected pages, expected impact, Accept / Decline. Also Accept all, Decline all, Add content, group by goal, owned vs earned or topic. The trial's 11 actions were all site fixes ("Fix your llms.txt format", "Split the sitemap by page type") | Built: since Oct 4 in the same layout (see "What we copied") |
| Optimize | Impact | A chart of the chosen metric with markers when an action moved to In progress (amber) or Done (green); an action tracker with In progress and Done tabs | Partly: the result on each done action. Not a page of its own (decided Oct 6): the chart with marks becomes a block on Harakatlar |
| Results | Ranking | Brands by visibility, share of voice, sentiment, position | Built (Oct 5): Raqobatchilar with the same table, plus who leads each topic (our version of Insights' top rankings) |
| Results | Chats | Total chats 352, brand mentioned 3, with web search 336 (95.5%), average citations 7.5, most common feature. Each chat: engine, prompt and answer excerpt, brands named, sources (favicons), features, position, date. A chat opens in a window with Previous / Next and a details panel; the engine and the country (US) on top | Built in the same layout (Oct 5, finished Oct 7): the answers in numbers; a table of every answer with search and filters by brand named, by site cited (Peec's "All sources") and by status; CSV export of the answers with their full text; a chat window with Previous / Next and details; the engine and the city on top. Left out: the web-search share, "most common feature" and the features column and filter |
| Results | Fanouts | 187 distinct background searches, 192 in total, grouped by topic with type and count | Later |
| Results | Ads | ChatGPT ads on the tracked prompts: advertisers, bidding on your brand, coverage. Paused: "ChatGPT recently changed how it displays ads" | No |
| Agent analytics | Crawl insights | Set up from AWS CloudFront, Google Cloud CDN, WordPress, Cloudflare Worker, Vercel, Akamai, a webhook or a file | Later |
| Agent analytics | Crawlability | robots.txt rules per AI bot, compared with competitors; a URL tester; history; "No robots.txt found: all bots are allowed" | Partly: in the free check |
| Agent analytics | AI referrals | Google Analytics through Google sign-in, read-only, four weeks back | Later |
| Shopping | Overview | Products from a Shopify store, Peec's CSV or a Google Merchant CSV, or the products the answers already name | No |
| Settings | Profile | Brand profile: cover, logo, description, industry and the rest of setup step 2. Saving refreshes the suggested prompts | Partly: the profile from onboarding (name, description, field, city, services, spellings, competitors) shown in Sozlamalar, not editable yet |
| Settings | Facts | "Claims AI makes about you are checked against the facts you write here. One statement per line." 0 of 5 facts; Build facts with AI | Next |
| Settings | Brands | Your brands (8): color, display name, tracked names, domains, social channels, mentions. "Brand suggestions" (11): brands the answers name, with their mention count, to accept or reject | Partly (Oct 5): the same brands table in Sozlamalar (color, spellings, website, answers naming each); suggestions as cards on Raqobatchilar, not yet accepted from there |
| Settings | Tags | Tags with a color and an optional group | Partly: one topic per question |
| Settings | Company | Name and domain; an email report per project ("Every 2 weeks · Next Fri 16 Oct"); early-access switches (filter presets, writing your own actions) | No. Our report goes to Telegram (backend needed) |
| Settings | Billing | Current plan and renewal date; base models (3) plus model add-ons; Starter, Pro, Advanced, Enterprise | Later |

### What Peec gets wrong, and what we do instead

| # | In the trial | Why it matters | Ours |
| --- | --- | --- | --- |
| 1 | Setup picked seven engineering firms (AECOM, WSP, Jacobs, Arup, Stantec, Ramboll, AtkinsRéalis) as competitors of an IELTS-prep site, apparently from its name. The real rivals sat in Settings › Brands as suggestions: British Council (108 mentions), SmallTalk2Me (87), LimeTalk (74), Cathoven (54), IELTSbiz (54), TestGlider (49), LexiBot (48) | Every number was measured against the wrong brands: 100% share of voice and "You're #1 in AI visibility" at 0.9% visibility | Suggest competitors from the brands ChatGPT names for the category and city, and put new names where people look: Raqobatchilar and onboarding. Never call a brand first without saying out of whom and at what visibility |
| 2 | The answers were collected in the US, in English, although the profile said Uzbekistan | The answers a Tashkent customer gets look different | Uzbekistan by city, Uzbek and Russian questions |
| 3 | About 16 screens before the first number, including a plan choice and four survey questions | Owners leave before they see a result | Website → competitors → questions → first result. No survey, no plan choice before the result |
| 4 | 25 pages in eight groups, plus nine settings pages; five are empty until something is connected (crawl insights, AI referrals, shopping, ads, website traffic) | Hard to know where to start | Eight pages in three sections; integrations appear only once they exist |
| 5 | English industry terms: SoV, retrieval rate, citation rate, gap score, fanouts, UGC, "web UI scraping", "surfaces", "placements", "llms.txt", "wrap the post body in an article element" | An owner can't act on them | Plain Uzbek and Russian, a "why" line, and steps an owner or their web developer can follow |
| 6 | The default "New" Overview is a chat box; the numbers are under "Classic" | The first screen shows nothing measured | Numbers first, with one sentence on what changed |
| 7 | Charts with two y-axes (visibility against used as a source) | Easy to misread | One axis per chart (our chart rules) |
| 8 | "Updated · 5 минут назад" in an English interface | The browser's language leaked into one line | One interface language throughout |
| 9 | All 11 first actions were site fixes; the other three goals were empty | The list depends on crawling the site; the client sees no outreach or content work | Our four goals fill from the answers (sites to get onto, wrong facts, pages to write) as well as from the site check |

### What we copied on Oct 4

- **Harakatlar in Peec's layout**: a plan card with four goal tiles that filter the list (wrong facts, other sites, pages on your site, site settings), the list grouped by status and then by goal, impact as signal bars, and a side panel with the evidence, the steps to tick one by one (the first tick starts the action), the questions it should move and the status buttons. Also a CSV export, and Overview links that open an action directly. Our wording; our order of goals, wrong facts first, because a wrong price or opening hour costs customers directly.
- **Sidebar sections and a start checklist**: headings "Kuzatuv", "Yaxshilash", "Ulashish" over the same eight pages, and "Birinchi qadamlar" at the foot: five steps that tick off as their pages are opened, fold to a progress bar, and close for good once done.
- **The weekly check on Savollar**: "Har hafta tekshiriladi, keyingisi: 5-oktabr, dushanba" beside the question count, like Peec's run line in its prompts footer.
- **Onboarding laid out like Peec's setup**: "Qadam 2/5" above each step, the form on the left with a hint under every label, Back and Next pinned at the bottom, and on wide screens a faded picture of the app on the right with the page each step fills in outlined and redrawn as the user types. Five steps: website; brand profile (name, description, field, services and other spellings as chips, city); competitors; topics (all ticked, with their question counts, plus your own); questions (one topic at a time from a list, plus your own). Unlike Peec, the client confirms the competitors, and no plan or survey comes before the first result.
- **The first run's screen**: the brand's initial in a ring of the engines that fills as the answers come in, like Peec's "Retrieving sources".

### What we copied on Oct 5

Every other data page now follows Peec's layout, with our wording and colors:

- **Shared pieces**: cards with a title and an ⓘ that explains them, a row of numbers with their change at the top of each page, filters as dropdown chips, bar lists for rankings.
- **Overview**: five numbers (visibility, share of voice, tone, position, used as a source), the weekly chart with the four metrics as tabs beside the brands table, top sites beside site kinds, latest answers, a Share menu.
- **Javoblar**: Peec's Chats page, a table of every answer opening into a chat window.
- **Savollar**: Peec's prompts page, topics on the left.
- **Manbalar**: Peec's domains, pages and gap analysis as three tabs of one card.
- **Raqobatchilar**: Peec's ranking table plus who leads each topic.
- **Notoʻgʻri faktlar**: numbers and a table.
- **Sozlamalar**: sections on the left, the brand profile and the tracked brands table.

Kept out on purpose: two-axis charts, a chat box instead of numbers, and English terms.

### What to copy next

1. Competitor suggestions with "track" and "dismiss" and their mention counts, on Raqobatchilar and in onboarding (point 1 above).
2. Brand facts, one statement per line (5 / 20 / 50 by plan), checked against the answers on Notoʻgʻri faktlar.
3. Editable project settings like Peec's: profile, facts, competitors (color, spellings, domain), tags; then members and billing.
4. The Impact view: the visibility chart with markers where an action started or was done.
5. Insights: a verdict line and a heat map of topics × question types.
6. A short tour of the main pages, and an onboarding call booked in Telegram.

## What a brand needs

A brand here is one company watching itself: the owner or the marketing person. In the order they meet the product:

| Job | What Peec gives | Ours | When |
| --- | --- | --- | --- |
| Start without knowing what a prompt is | Brand profile read from the website; suggested prompts, topics and competitors | Built: website-only wizard | Done |
| See where I stand today | Overview with three metrics and ranks | Built | Done |
| See whether it's getting better | Trend per metric, change vs the previous period | Built (weekly) | Done |
| Know who beats me, and on which questions | Brands table, ranking, per-prompt results | Built | Done |
| Read what the AI actually said | Chats | Built | Done |
| Know which sites to get listed on | Domains, URLs, gap analysis | Built: Manbalar and the outreach list | Done |
| Catch wrong prices, addresses, hours | Fact-checking against my own facts | Partly | Brand facts: Next |
| Know what to do first | Actions with expected impact | Built: Harakatlar | Done |
| Prove the work paid off | Impact, lift analysis | Partly: before and after on each done fix | Whole-report lift: Next |
| Report to the owner without logging in | Share link, PDF, scheduled exports | Link built; PDF and Telegram need the backend | Next |
| Understand how AI describes me | Attributes, objections | Missing | Later |
| See traffic from AI | AI referrals, crawl insights | Missing | Later |
| Add colleagues | Unlimited users, roles | One login per account | Later |

The gap that matters most for a local brand is the middle of this list: "what to do first" and "prove it paid off". Measurement alone doesn't keep a small business paying.

## What an agency needs

Peec has a separate agency product: its own page, its own plans and three pages of documentation.

**How it works.** An agency buys credits, not prompts. One prompt on one model for one day costs one credit, so a prompt tracked on one model for a month takes 30. The agency spreads its credits over client projects and can move them at any time.

| Feature | What Peec gives | Ours | When |
| --- | --- | --- | --- |
| Client workspaces | One isolated project per client (own prompts, competitors, engines); switch clients without logging in again | Built: several projects in one account, a project switcher | Done |
| Pitch projects | A free 7-day project for a prospect, outside the paid quota; becomes a client project in three clicks | Close: the free check makes a one-off report for any website, and logging in turns it into a project | Agency version: Next |
| Credit allocation | Set prompts and engines per client; a usage page shows credits per project | Fixed limits per plan | Later |
| Per-client engines | Choose which AI models each client is tracked on | ChatGPT only | With Gemini and Yandex |
| Pause and resume | A paused project keeps its data and frees its credits | Missing | Next |
| Unlimited seats | The whole team and the clients, no per-seat price | One login per account | Later |
| Client access | Read-only dashboard link, no Peec login needed; optional password | Built: public report link, no password | Password: Next |
| Client reporting | Looker Studio templates that can carry the agency's branding; CSV; API to BigQuery, Tableau, Power BI | Missing | PDF and Telegram report with the agency's name: Next |
| Automated weekly reports | Through the MCP server: loop over all clients, post summaries to Slack, build a slide deck | Missing | Telegram report per client: Next |
| Attribution | AI-referred traffic and funnel events per client | Missing | Later |
| Export of all chats | CSV per project | Built (Oct 7): the answers of the latest check, from Javoblar | Done |
| Partner program | Agency partner listing; a referral commission | Missing | Not now |

**Peec's agency plans** (from peec.ai/for-agencies; billed yearly):

| Plan | Credits | About | Pitch projects | Price |
| --- | --- | --- | --- | --- |
| Essential | 10,000 | 111 prompts on 3 models | 3 | $245 a month (unconfirmed) |
| Growth | 25,000 | 277 prompts on 3 models | 10 | $495 a month (unconfirmed) |
| Scale | 65,000 | 722 prompts on 3 models | 25 | $795 a month (unconfirmed) |
| Comprehensive | Custom | Custom | Unlimited | Custom |

Every agency plan includes unlimited seats, daily tracking, six engines (ChatGPT, Claude, Perplexity, Google AI Overviews, Google AI Mode, Gemini), the MCP server, the API, Looker Studio and CSV exports. Weekly tracking, at about a third of the credits, exists only on Scale and above.

Two points don't agree between sources. Peec's page doesn't show agency prices; the prices above come from a review. That review also gives 3, 5 and 7 pitch projects where Peec's page says 3, 10 and 25. The trial account was set up as an in-house team, so both are still unconfirmed. One hint: Enterprise lists 722 prompts, the number the review gives for the Scale agency plan.

**What this means for our Agentlik plan.** Today it is "300 prompts, up to 5 brands". To be worth 1,490,000 soʻm to a local agency it needs four things, in this order:

1. A pitch report: the free check with the agency's name on it, as a link and a PDF, to send to a prospect.
2. A weekly Telegram and PDF report per client that the agency can forward as its own.
3. Prompts split freely between clients, with a usage view.
4. Pausing a client without losing its history.

## What a 2025 review says

Source: Marketer Milk, "Peec AI Review" by Omid Ghiam, August 6, 2025. The article says some of its links are affiliate links, and it is one person's test. It is fourteen months older than the rest of this document, so it shows Peec as it was then.

| Area | What the review describes | In Oct 2026 | Ours |
| --- | --- | --- | --- |
| Dashboard | Visibility (share of voice against competitors), an "Industry Ranking" table (position and sentiment over 7 days, visibility), recent mentions of the brand, top sources | Grown into the customizable Overview with five numbers | Built: the Overview panel |
| Prompts | Own prompts plus a Suggested tab, each accepted or rejected in one click; 7, 14 or 30 days or a custom range; position, sentiment, visibility, location and tags per prompt; CSV download | Same, plus Archived and prompt volumes | Savollar. Suggestions only during onboarding; no date range; no CSV of prompts |
| Domains | Type (your brand, competitor, reference, corporate, UGC, editorial), "Used" (share of chats over 7 days), average citations | Same, seven types | Built: the Saytlar tab has the same two columns |
| URLs | Each cited page: whether the brand is mentioned on it, which competitors are, times used, average citations, when it was last fetched | Same | Partly: pages cited per site, without who is mentioned on each page |
| Competitors | Name and domain, typed in or suggested | Same | Built |
| Refresh | Daily, with a countdown to the next refresh on the dashboard | Daily | Weekly |
| Trial | 7 days with everything | 7 days of Starter, chosen during setup; afterwards Starter continues or the client upgrades | One free check of 10 questions |
| Support | A named customer-experience person, in-app chat, bookable calls, an email address that reaches the CEO | Chat, email, a dedicated contact on higher plans | Help form; answers in Telegram |
| Security | No SOC 2 mentioned; the company is in Berlin | Not checked | Not decided |

**Its verdict.** Worth it for an established brand that already gets visitors or customers through ChatGPT. Not worth it for a new company that AI doesn't mention yet: the author calls the numbers "vanity metrics" in that case. The author also notes that the tool measures and doesn't say how to improve. By 2026 Peec has an Actions page that does.

**Praised:** suggested prompts, the free trial, a clean interface that is quick to learn, the page-level source list for outreach, flexible date ranges, transparent prices, unlimited seats.

**Criticized:** little value for brands nobody knows yet, chart colors too close to tell apart, a URLs chart that shows one line until you hover, no data from before a prompt was added, an unexplained countdown, no user community, no stated security certification.

**What it means for us.** Points 1, 2, 3 and 5 are built in the frontend on mock data (Oct 4, 2026); the rest are proposals:

1. **The "vanity metrics" risk is larger here.** Many local businesses won't be named by ChatGPT at all, so a zero must never be the whole answer. The free check already lists who was recommended instead and the sites the business is missing from. The missing piece is the next step, Harakatlar: one more reason to build it right after the backend, and to offer Managed GEO to clients who start at zero.
2. **Page-level mentions make the outreach list.** "Which cited pages name my competitors but not me" is what the reviewer valued most. We only show "are you listed?" per site. The backend should fetch each cited page and record which tracked brands it names.
3. **Say when the next check runs.** A countdown confused the reviewer. We run weekly, so a plain line such as "Keyingi tekshiruv: 5-oktabr" on the Overview is enough. Not built yet.
4. **Keep the chart colors checked.** Their colors were too close to tell apart. Our brand colors pass a color-blindness check, and CLAUDE.md says not to change them without re-running it.
5. **Say early that history starts now.** Neither tool can show the past. We explain it after the first run; the onboarding could say it before the user starts.
6. **Trial.** Peec gave 7 days of everything; we give one 10-question check. Whether the first weekly run of a paid plan should be free is an open pricing question.
7. **Personal support sells.** The reviewer's warmest praise was for fast, personal support. Answers in Telegram from a person fit this.
8. **Data location matters more than SOC 2 here.** Local clients are unlikely to ask for SOC 2, but they may ask where their data is kept. Uzbekistan's personal-data law is understood to require citizens' personal data (for us: users' phone numbers and Telegram accounts) to be stored on servers inside the country. To confirm with a lawyer before choosing hosting.

## What only we offer

| Feature | Status | Why it matters here |
| --- | --- | --- |
| Uzbek (Latin and Cyrillic) and Russian questions | Built | No tool in this list targets Uzbek |
| Local source types: maps and directories, local news, Telegram | Built | Gives the client a concrete list of places to get listed |
| New-competitor notice | Built | Owners watch rivals closely |
| Wrong-fact page with the date found | Built | Owners feel a wrong price or address immediately |
| Weekly report in Telegram | Backend needed | Local owners live in Telegram |
| Prices in soʻm, from 199,000 a month | Built (landing) | Peec starts at $95 |
| Managed GEO: we apply the fixes | Service | Most small businesses won't do it themselves |
| Mystery shopper (multi-turn conversations) | Later | Easy to show in a demo |

## Pricing side by side

| | Peec Starter | Peec Pro | Peec Advanced | Our Start | Our Biznes | Our Agentlik |
| --- | --- | --- | --- | --- | --- | --- |
| Price per month | $95 | $245 | $495 | 199,000 soʻm (~$16) | 490,000 soʻm (~$41) | 1,490,000 soʻm (~$124) |
| Per month, billed yearly | $80 | $205 | $420 | — | — | — |
| Prompts | 50 | 150 | 350 | 25 | 75 | 300 |
| Engines | 3 | 3 | 3 | ChatGPT | ChatGPT | ChatGPT |
| Frequency | Daily | Daily | Daily | Weekly | Weekly | Weekly |
| AI answers per month | 4,500 | 13,500 | 31,500 | 300 | 900 | 3,600 |
| Projects | 1 | 2 | 5 | 1 | 1 | Up to 5 brands |
| Countries per project | 1 | 3 | 3 | Uzbekistan | Uzbekistan | Uzbekistan |
| Users | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

Peec also has an Enterprise plan (custom price: 722 prompts, unlimited projects and countries, daily or weekly runs, the API models) and separate agency pricing. Our equivalents are Managed GEO (from 3,000,000 soʻm a month) and Agentlik. Every Peec plan starts with a 7-day trial of Starter, and models beyond the plan's three are sold as an add-on (seen in the app on Oct 4).

A year earlier (Marketer Milk, August 2025) Peec sold Starter at $89 (25 prompts, 3 countries), Pro at $199 (100 prompts, 5 countries) and Enterprise at $499 (300+ prompts, 10+ countries), with ChatGPT, Perplexity and AI Overviews on every plan. Since then Starter went from 25 to 50 prompts for $6 more, and Pro from 100 to 150 prompts for $46 more.

Still to check before launch: the cost of the web-search API calls behind each plan (a plan must cost us under a third of its price), and where the law requires users' personal data to be stored.

## Roadmap after this teardown

**Built (frontend, mock data).** Onboarding in five steps laid out like Peec's setup, with a live picture of the app; questions with per-question results, a Suggested tab and CSV export; answers; the Overview as one panel (three metrics over time for every brand, brands table with weekly changes, sites and pages cited, sources by type, recommended actions, next check date, CSV export); Harakatlar (recommended fixes with statuses, steps to tick and fix → proof, laid out like Peec's Actions page); sidebar sections and a start checklist; competitor ranking; untracked-brand notice; sources by type with who each cited page names, and the outreach list; wrong facts; site checks in the free check; public report; language and topic filters.

**Next (after first paying clients).** Backend for all of the above, including the rules that make Harakatlar from real data; Telegram reports and PDF; a full site audit; competitor suggestions from the answers, with "track" and "dismiss"; brand facts for fact-checking; editable project settings (profile, facts, competitors, tags); markers on the chart when a fix starts and is done; CSV import of questions and export of answers. For agencies: the pitch report, reports under the agency's name, pausing a client.

**Later.** Gemini and Yandex; a date-range filter; brand attributes and objections; personas and keyword prompts; AI referrals and crawler visits; API; roles and more users; prompts split between clients; mystery shopper; Kazakhstan.

**Not planned.** AI shopping, prompt volumes, ads library, lift predictor, SSO, MCP, Looker Studio, a rearrangeable overview.

## Landing page and dashboard rules

We follow the structure of Peec's home page and the layout of their dashboard, and keep everything else our own: name, logo, colors, wording, screenshots and numbers. We don't reuse their text, customer logos or testimonials, and we don't show quotes or ratings we haven't earned. Features that aren't built yet are marked "tez orada" wherever they appear.

Inside the app we follow Peec's layout where it reads well: the setup wizard (form left, live picture of the app right), the sidebar's sections and start checklist, the Actions page (goal tiles, status groups, a side panel with steps to tick), the run date beside the questions. We don't follow it where the trial showed it fails: competitors picked by name, answers from another country, a chat box instead of numbers, two-axis charts, English terms.

The hero's dashboard is our real Overview with the sample clinic's data, and it moves by itself: the chart reads out week after week and switches between the three metrics. It is labelled "Namuna maʼlumotlari" so nobody takes it for live results.
