# GEO Competitor Teardown & Our Feature List

Oct 1, 2026 · @Bakhriddin

## Summary

**All five leading tools share the same core: track prompts, score visibility against competitors, and show the sources AI cites.** They differ in what they add on top: Peec adds an action queue and integrations, Otterly a site audit, Profound real prompt-demand data and content agents.

**Our plan:** copy the shared core and Peec's fast, automatic setup for the MVP; add Otterly's audit and Peec's actions next; leave Profound's expensive features (prompt volumes, agents) for later.

**What only we do:** Uzbek and Russian prompts, local sources, Telegram reports, wrong-fact alerts, mystery-shopper conversations, and new-competitor alerts.

**Price:** start below Otterly's $29 entry and far below Peec (€85) and Profound ($99), by tracking weekly instead of daily and focusing on ChatGPT first.

## Feature matrix

✓ = a documented feature. · = not a headline feature in the sources reviewed (it may still exist). Phase is when we build it.

| Feature | Peec | Otterly | Profound | AthenaHQ | Scrunch | Us |
| --- | --- | --- | --- | --- | --- | --- |
| Prompt tracking: visibility, position, sentiment | ✓ | ✓ | ✓ | ✓ | ✓ | MVP |
| Competitor share of voice | ✓ | ✓ | ✓ | ✓ | ✓ | MVP |
| Cited sources, grouped by type | ✓ | ✓ | ✓ | ✓ | ✓ | MVP |
| Prompts suggested from your website | ✓ | ✓ | ✓ | · | · | MVP |
| One headline score | · | ✓ | ✓ | · | · | MVP |
| Prompt tags and filters | ✓ | ✓ | ✓ | · | · | MVP |
| Action list (what to fix next) | ✓ | ✓ | ✓ | ✓ | ✓ | Next |
| Site audit for AI crawlers | ✓ | ✓ | ✓ | · | ✓ | Next |
| Fact-checking of brand claims | ✓ | · | ✓ | · | · | Next |
| AI referral / crawler analytics | ✓ | · | ✓ | · | · | Later |
| Looker Studio, API, MCP | ✓ | ✓ | ✓ | · | · | Later |
| Content-writing agents | · | · | ✓ | ✓ | ✓ | Later |
| Real prompt-volume data | · | · | ✓ | ✓ | · | Not planned |
| AI shopping / product tracking | ✓ | · | ✓ | · | · | Not planned |
| Unlimited users on every plan | ✓ | ✓ | · | ✓ | · | MVP |
| Uzbek / Russian, Telegram delivery | · | · | · | · | · | **MVP (ours)** |

Sources: [Peec features](https://questiondb.io/hub/peec-ai/), [Peec Actions and MCP](https://visible.seranking.com/blog/peec-ai-review/), [Otterly review](https://www.get-ryze.ai/blog/otterly-ai-review-pricing-2026), [Profound features](https://www.tryprofound.com/features), [Profound feature list](https://www.scalenut.com/blogs/profound-ai-reviews), [AthenaHQ vs Scrunch](https://athenahq.ai/comparison/scrunch), [Evertune overview of tools](https://www.evertune.ai/resources/insights-on-ai/the-10-best-ai-visibility-tools-for-2026).

## Feature by feature

For each feature: how the leaders do it, and our version.

### MVP

**Prompt tracking.** Peec runs prompts daily and records visibility, position and sentiment per engine ([OrganiKPI](https://organikpi.com/blog/reviews/peec-ai-review/)). *Ours:* weekly runs on ChatGPT with web search, 3 samples per prompt, in Uzbek and Russian. Weekly keeps costs low enough for local prices.

**Competitor share of voice.** All tools rank your brand against named rivals. *Ours:* competitors are found automatically from the brands ChatGPT names, and new ones trigger an alert.

**Sources.** Peec classifies cited sources as competitor, editorial or user-generated ([QuestionDB](https://questiondb.io/hub/peec-ai/)). *Ours:* the same, plus local types: Uzbek news sites, Telegram channel pages, maps and review sites.

**Automatic setup.** Peec suggests prompts from your website and lets you tag them ([OMR Reviews](https://omr.com/en/reviews/product/peec-ai)). *Ours:* the website-only wizard: brand, category, city, competitors and 20 prompts are all pre-filled.

**Headline score.** Otterly's Brand Visibility Index rolls several signals into one number ([GetMentioned](https://www.getmentioned.co/blog/otterly-ai-review-and-alternatives)). *Ours:* one score out of 100 at the top of Overview, with the competitor's score beside it.

### Next (after first paying clients)

**Action list.** Peec's Actions turns citation gaps into a ranked to-do list you can save, complete or dismiss ([AI Peekaboo](https://www.aipeekaboo.com/blog/peec-ai-review)). *Ours:* the same queue, with each action linked to the prompts it should improve, so we can show before/after.

**Site audit.** Otterly's GEO audit flags why AI skips your pages; Peec audits crawlability for 40+ AI bots ([GetMentioned](https://www.getmentioned.co/blog/otterly-ai-review-and-alternatives), [QuestionDB](https://questiondb.io/hub/peec-ai/)). *Ours:* robots.txt, schema, FAQ blocks, prices and contacts as readable text, `llms.txt`.

**Fact-checking.** Peec and Profound both check what AI says about a brand ([QuestionDB](https://questiondb.io/hub/peec-ai/), [Scalenut](https://www.scalenut.com/blogs/profound-ai-reviews)). *Ours:* "Noto'g'ri faktlar" page comparing answers with the brand's real facts (price, address, hours, services).

### Later

**AI traffic and crawler analytics.** Profound reads server logs from Cloudflare, AWS or Vercel, with no JavaScript needed ([Profound](https://www.tryprofound.com/features)). *Ours:* first a JS snippet for ChatGPT referrals, then a Cloudflare Worker for bot visits.

**Integrations.** Peec offers Looker Studio, API and an MCP server ([SE Ranking](https://visible.seranking.com/blog/peec-ai-review/)). *Ours:* Telegram and PDF first; API for agencies later.

**Content agents.** Profound's agents create and publish content aimed at AI citations ([Profound](https://www.tryprofound.com/features)). *Ours:* draft FAQ pages and brand profiles in Uzbek and Russian for the client to approve.

### Not planned

**Prompt volumes** need a large panel of real user conversations; Profound cites over 2 billion prompts ([Beri](https://www.beri.net/tools/profound)). We can't build that. **AI shopping** tracking fits e-commerce brands, not our first clients.

## What we add that none of them lead with

| Feature | What it does | Why it sells locally |
| --- | --- | --- |
| Uzbek + Russian prompts | Questions and answers in Uzbek (Latin and Cyrillic) and Russian, reported separately | No leading tool targets Uzbek |
| Mystery shopper | Runs a full multi-turn conversation ("best clinic?" → "cheaper one?" → "in Chilanzar?") and shows where the brand drops out | Easy to understand in a demo |
| Wrong-fact alerts | Flags old prices, wrong addresses, closed branches in AI answers | Owners feel this pain immediately |
| New-competitor alerts | "Dental Line now appears in 6 of 20 answers" | Owners watch rivals closely |
| Local source map | Which Uzbek news sites, Telegram channel pages and review sites ChatGPT trusts per category | Gives a concrete outreach list |
| Telegram-first reports | Weekly score and alerts in a Telegram bot; ask "what does ChatGPT say about us today?" | Local owners live in Telegram |
| Fix → proof tracking | Every fix is dated; the report shows what changed on the related prompts | Peec notes thin ROI attribution as a gap ([geotoolbox](https://geotoolbox.ai/blog/what-is-peec-ai)) |
| Done-for-you option | We apply the fixes as a monthly service | Most small businesses won't do it themselves |

## Pricing

**Competitors' entry and mid plans:**

| Tool | Entry plan | Next plan |
| --- | --- | --- |
| Otterly | $29/mo: 15 prompts, 4 engines, daily | $189/mo: 100 prompts ([TMB](https://thatmarketingbuddy.com/pricing/otterly-ai)) |
| Peec | €85/mo: about 50 prompts, 3 models | €205 and €425/mo; Advanced has 350 prompts ([geotoolbox](https://geotoolbox.ai/blog/what-is-peec-ai), [OMR](https://omr.com/en/reviews/product/peec-ai)) |
| Profound | $99/mo: ChatGPT only, 50 prompts, 1 seat | $399/mo: 3 engines, 100 prompts ([Trakkr](https://trakkr.ai/reviews/profound-review/features)) |
| AthenaHQ | $295/mo | Custom ([AthenaHQ](https://athenahq.ai/comparison/scrunch)) |

**Our plans (to test, not proven).** Prices in soums, with USD at about 12,000 soums per dollar:

| Plan | Price | What's included | Compared with |
| --- | --- | --- | --- |
| Bepul tekshiruv | 0 | 10 prompts, one run, short result | Sales tool |
| Start | 199,000 so'm/mo (\~$16) | 25 prompts, ChatGPT, weekly, 3 competitors, Telegram report | Under Otterly Lite, with more prompts |
| Biznes (recommended) | 490,000 so'm/mo (\~$41) | 75 prompts, 5 competitors, wrong facts, actions, site audit | Half of Peec's entry, more features |
| Agentlik | 1,490,000 so'm/mo (\~$124) | 300 prompts across up to 5 brands, white-label reports | Under Otterly Standard |
| Managed GEO | from 3,000,000 so'm/mo | Biznes plan + we apply the fixes | Service, not software |

Unlimited users on every plan, like Peec and Otterly.

**How we stay cheaper:** weekly runs instead of daily (about 7× fewer AI calls), ChatGPT first instead of 4–11 engines, and a cheap model for parsing.

**Check before launch:** each prompt costs 12 ChatGPT calls a month (3 samples × 4 weeks), so Start = 300 calls and Biznes = 900. Price the web-search API calls before fixing these numbers; the plan must cost us under a third of its price.

## UI: pages and patterns to reuse

Reuse the layout patterns these tools share; keep our own name, logo, colors and wording. Copying another product's exact look invites confusion and complaints, and makes us look like a clone to the agencies we sell to.

**Shared filter bar** at the top of every data page: engine (ChatGPT active, others "tez orada"), language (UZ / RU / all), prompt tag, date range.

| Page | What it shows | Pattern seen in |
| --- | --- | --- |
| Umumiy ko'rinish (Overview) | Headline score, visibility trend line, competitor ranking table, top 3 actions | Peec dashboard, Otterly Brand Visibility Index |
| Savollar (Prompts) | Table: prompt, language, tag, visibility %, position, sentiment, last run; add and tag prompts | Peec prompts with tagging |
| Javoblar (Answers) | Full answer text per run, brand names highlighted, filter by prompt and sample | Profound Answer Engine Insights |
| Raqobatchilar (Competitors) | Share of voice over time, new-competitor alerts | All tools |
| Manbalar (Sources) | Domains and URLs cited, type (news, competitor, Telegram, review), % of answers, "you listed?" | Peec source analytics |
| Harakatlar (Actions) | Queue of fixes: save, complete, dismiss; each linked to prompts | Peec Actions |
| Noto'g'ri faktlar (Wrong facts) | Claim, correct value, which prompt, date found | Peec / Profound fact-checking |
| Hisobotlar (Reports) | PDF downloads, Telegram schedule | Ours |
| Sozlamalar (Settings) | Brand, spellings, competitors, team, plan | All tools |

**Rules that make these screens work:** every score shows the competitor beside it; every number links to the answers behind it; empty states never appear after onboarding, because the first run starts during the wizard.

## Sources

- [Profound features page](https://www.tryprofound.com/features)
- [Profound feature list incl. FactCheck and Aim (Scalenut)](https://www.scalenut.com/blogs/profound-ai-reviews)
- [Profound pricing and modules (Trakkr)](https://trakkr.ai/reviews/profound-review/features)
- [Profound prompt dataset (Beri)](https://www.beri.net/tools/profound)
- [Peec AI features overview (QuestionDB)](https://questiondb.io/hub/peec-ai/)
- [Peec AI Actions and MCP (SE Ranking)](https://visible.seranking.com/blog/peec-ai-review/)
- [Peec AI features, pricing and limits (geotoolbox)](https://geotoolbox.ai/blog/what-is-peec-ai)
- [Peec AI review (OrganiKPI)](https://organikpi.com/blog/reviews/peec-ai-review/)
- [Peec AI Actions queue (AI Peekaboo)](https://www.aipeekaboo.com/blog/peec-ai-review)
- [Peec AI user reviews and plans (OMR)](https://omr.com/en/reviews/product/peec-ai)
- [Otterly.AI review and pricing (Ryze)](https://www.get-ryze.ai/blog/otterly-ai-review-pricing-2026)
- [Otterly.AI plan details (That Marketing Buddy)](https://thatmarketingbuddy.com/pricing/otterly-ai)
- [Otterly.AI review (GetMentioned)](https://www.getmentioned.co/blog/otterly-ai-review-and-alternatives)
- [AthenaHQ vs Scrunch pricing (AthenaHQ)](https://athenahq.ai/comparison/scrunch)
- [AI visibility tools overview (Evertune)](https://www.evertune.ai/resources/insights-on-ai/the-10-best-ai-visibility-tools-for-2026)
