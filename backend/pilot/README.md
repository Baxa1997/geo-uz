# Pilot report generator

Makes the file behind a pilot report (`/pilots/<slug>` in the frontend) from a brief: the questions customers
ask, asked to ChatGPT with web search, counted, and written up as a draft a person then edits.

It is also step 0 of `../PLAN.md`: every run prints what each answer cost.

## Run it

Python 3.9 or newer, no packages.

```
export OPENAI_API_KEY=...
cd backend/pilot
python3 pilot.py briefs/example.json --to ask     # only ask: see the cost first
python3 pilot.py briefs/example.json              # the rest
```

Then, with the frontend running (`npm run dev` in `frontend/`), open `http://localhost:3000/ru/pilots/<slug>`.
"Print or save as PDF" gives the PDF (Chrome; A4).

A step whose result is saved is not run or paid for again. `--redo <step>` runs one again; `--overwrite` lets
`build` replace a report's file that exists (it may hold hand edits).

## The brief

`briefs/example.json` shows every field.

- `slug`: the report's address. `language`: the report's language (`ru`, `uz`, `en`).
- `brand`: the client's name, its other spellings (Latin, Cyrillic, short forms: a mention is found by them) and
  website.
- `category`, `city` (in the report's language), `city_en` (for the search tool's location), `country`, `timezone`.
- `questions`: what customers ask, each `ru` or `uz`. **Never name the client in a question**: the point is whom
  ChatGPT names by itself. The script refuses a brief that does. It adds one direct question about the client by
  itself, kept out of the counts.
- `samples`: how many times each question is asked. Three is the least that says anything; one answer is noise.
- `attributes`: the facts this category is compared on (for a school: programme, price, district; for a clinic:
  services, price, address). Each a `key` in Latin letters and a `label` in the report's language.
- `extraSources`: pages known to mention the client (a catalog card, an article), to check beside the cited ones.
- `contact`: what the last page shows.
- `previous`: for a client's second report and later, the slug of the report before. The new report (under a
  slug of its own, such as `client-2027-02`) then opens with "what changed": the key figures before and now,
  the earlier report's goals against where they stand, who gained and lost, the facts and sources that
  changed. Ask the same questions as before, or the comparison says little.

## The steps

| Step | What it does | Result in `out/<slug>/` |
| --- | --- | --- |
| `ask` | Every question × `samples`, each in a new conversation, web search on, located in the client's city | `raw/*.json` (the full responses) |
| `extract` | A model lists who each answer names and **recommends**, and what it states about each | `answers.json` |
| `names` | One name per business the answers spell differently | `names.json` |
| `sources` | The most cited sites; each cited page is read to see whether it names the client | `sources.json` |
| `site` | The client's own website as text, for the facts check | `site.json` |
| `analyze` | A model drafts the findings, reasons, decisions, plan and limits | `analysis.json` |
| `build` | Puts it together | `frontend/pilots/<slug>.json` |

The numbers are counted by plain code (`steps.aggregate`), never by a model. The model writes sentences.

## Before a report is sent

The draft is a draft. Read every sentence against `answers.json` and fix the report's file by hand:

1. **Recommended or only named** is a judgment (`answers.json`, `recommended`). Check it for the client and the
   leader at least.
2. **Names**: look through `names.json` for two businesses merged into one, or one left in two.
3. **Sources**: `brandListed: null` means the page couldn't be read. Open it.
4. **The analysis**: reasons, decisions and the plan are a model's draft from the evidence. Anything it could not
   know (the client's budget, its real programme) is yours to correct.
5. The kinds of sites come from a short list in `steps.SITE_KINDS`; add the ones that turn up as "other".

## What it does not do yet

Gemini and Yandex; the answers as a person sees them in the
ChatGPT app (this is the API with web search, and the report says so).
