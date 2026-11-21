// A sample check's data object and scope (`GET /projects/{id}/waves/{runId}`), for the mocks: the sample data has no
// slot log, so its slots are rebuilt from its answers, as the backend rebuilds a check made before the log
// (`backend/app/wave.py`). Its counting follows `backend/app/metrics.py`: the scope card, the headline count and
// the brands (no score: Phase 0 item 0.2).
import { PROMPT_LANGUAGES } from "@/shared/constants";
import type {
  Report,
  SitePart,
  SlotTally,
  Tone,
  ToneSummary,
  Wave,
  WaveAssistant,
  WaveBrand,
  WaveBrands,
  WaveGroup,
  WaveResponse,
  WaveSlot,
  WaveSources,
  WaveTop,
  WaveVisibility,
} from "@/shared/types/api";

// The thresholds of `backend/app/metrics.py`
const SMALL_SAMPLE = 20;
const SHARE_OF_VOICE_FROM = 10;
const TONE_SUMMARY_FROM = 3;
const TONES: Tone[] = ["positive", "neutral", "negative"];
const NUMBERED = /^\s*(\d{1,3})[.)]\s+/;

const host = (domain: string) => domain.trim().toLowerCase().replace(/^www\./, "");

function visibilityOf(wave: Wave): WaveVisibility {
  const client = wave.project.brand.id;
  const rivals = new Set(wave.project.competitors.map((brand) => brand.id));
  const own = new Set(wave.project.brand.domains.map(host));
  const named = wave.answers.filter((answer) => answer.mentions.some((mention) => mention.brand_id === client));
  const withClient = new Set(named.map((answer) => answer.prompt_id));
  const withRivals = new Set(wave.answers.filter((answer) => answer.mentions.some((mention) => mention.brand_id !== null && rivals.has(mention.brand_id))).map((answer) => answer.prompt_id));
  const cited = wave.answers.filter((answer) => answer.citations.length > 0);
  return {
    answers: wave.answers.length,
    named: named.length,
    small_sample: wave.answers.length < SMALL_SAMPLE,
    small_sample_below: SMALL_SAMPLE,
    prompts: new Set(wave.answers.map((answer) => answer.prompt_id)).size,
    prompts_named: withClient.size,
    prompts_only_rivals: [...withRivals].filter((prompt) => !withClient.has(prompt)).length,
    cited_answers: cited.length,
    client_cited: cited.filter((answer) => answer.citations.some((citation) => own.has(host(citation.domain)))).length,
  };
}

function placeIn(text: string, names: string[]): number | null {
  const wanted = names.filter((name) => name.trim()).map((name) => name.toLowerCase());
  for (const line of text.split("\n")) {
    if (wanted.some((name) => line.toLowerCase().includes(name))) {
      const match = NUMBERED.exec(line);
      return match ? Number(match[1]) : null;
    }
  }
  return null;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[middle] ?? null) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

const namedIn = (answers: Wave["answers"], id: string) => answers.filter((answer) => answer.mentions.some((mention) => mention.brand_id === id)).length;

function topOf(answers: Wave["answers"], ids: string[]): WaveTop {
  const counts = ids.map((id) => ({ id, named: namedIn(answers, id) }));
  const value = Math.max(0, ...counts.map((row) => row.named));
  return { value, ids: value > 0 ? counts.filter((row) => row.named === value).map((row) => row.id) : [] };
}

function assistantsOf(wave: Wave): WaveAssistant[] {
  const all = [wave.project.brand.id, ...wave.project.competitors.map((brand) => brand.id)];
  const engines = [...new Set(wave.answers.map((answer) => answer.engine))];
  return engines.map((engine) => {
    const theirs = wave.answers.filter((answer) => answer.engine === engine);
    return { engine, answers: theirs.length, named: namedIn(theirs, wave.project.brand.id), top: topOf(theirs, all) };
  });
}

function groupsOf(wave: Wave, by: "topic" | "lang"): WaveGroup[] {
  const topics = new Map(wave.prompts.map((prompt) => [prompt.id, prompt.topic]));
  const keyOf = (answer: Wave["answers"][number]) => (by === "topic" ? (topics.get(answer.prompt_id) ?? "") : answer.lang);
  const rivals = wave.project.competitors.map((brand) => brand.id);
  return [...new Set(wave.answers.map(keyOf))].map((key) => {
    const theirs = wave.answers.filter((answer) => keyOf(answer) === key);
    return { key, prompts: new Set(theirs.map((answer) => answer.prompt_id)).size, answers: theirs.length, named: namedIn(theirs, wave.project.brand.id), rivals: topOf(theirs, rivals) };
  });
}

function sourcesOf(wave: Wave): WaveSources {
  const cited = wave.answers.filter((answer) => answer.citations.length > 0);
  const kinds = new Map(wave.domains.map((domain) => [domain.domain, domain]));
  const counts = new Map<string, number>();
  for (const answer of cited) for (const domain of new Set(answer.citations.map((citation) => citation.domain))) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([domain, count]) => ({ domain, type: kinds.get(domain)?.type ?? "other", listed: Boolean(kinds.get(domain)?.listed), cited: count }));
  const part = (row: (typeof rows)[number]): SitePart => (row.type === "own" ? "own" : row.type === "competitor" ? "competitors" : row.listed ? "listed" : "missing");
  const split: Partial<Record<SitePart, number>> = {};
  for (const row of rows) split[part(row)] = (split[part(row)] ?? 0) + 1;
  return { cited_answers: cited.length, sites: rows.length, rows, split };
}

function brandsOf(wave: Wave): WaveBrands {
  const tracked = [{ ...wave.project.brand, own: true }, ...wave.project.competitors.map((brand) => ({ ...brand, own: false }))];
  const rows: WaveBrand[] = tracked.map((brand) => {
    const domains = new Set(brand.domains.filter(Boolean).map(host));
    const theirs = wave.answers.flatMap((answer) => {
      const mentions = answer.mentions.filter((mention) => mention.brand_id === brand.id);
      return mentions.length > 0 ? [{ answer, mentions }] : [];
    });
    const tones = theirs.flatMap(({ mentions }) => mentions.map((mention) => mention.tone as Tone));
    const counts = Object.fromEntries(TONES.map((tone) => [tone, tones.filter((value) => value === tone).length]).filter(([, count]) => Number(count) > 0));
    const ranked = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]));
    const summary: ToneSummary | null =
      tones.length < TONE_SUMMARY_FROM ? null : ranked.length > 1 && ranked[0]?.[1] === ranked[1]?.[1] ? "mixed" : ((ranked[0]?.[0] as Tone | undefined) ?? null);
    const places = theirs.map(({ answer }) => placeIn(answer.text, [brand.name, ...brand.aliases])).filter((place): place is number => place !== null);
    return {
      id: brand.id,
      name: brand.name,
      own: brand.own,
      named: theirs.length,
      answers: wave.answers.length,
      prompts_named: new Set(theirs.map(({ answer }) => answer.prompt_id)).size,
      mentions: tones.length,
      rank: null,
      tone: { mentions: tones.length, counts, summary },
      position: { numbered: places.length, named: theirs.length, median: places.length > 0 ? median(places) : null },
      cited: domains.size === 0 ? 0 : wave.answers.filter((answer) => answer.citations.some((citation) => domains.has(host(citation.domain)))).length,
    };
  });
  for (const row of rows) {
    row.rank = row.named === 0 ? null : { place: 1 + rows.filter((other) => other.named > row.named).length, tied: rows.filter((other) => other.named === row.named).length };
  }
  const top = (list: WaveBrand[], key: "named" | "prompts_named" | "mentions" | "cited") => {
    const value = Math.max(0, ...list.map((row) => row[key]));
    return { value, ids: value > 0 ? list.filter((row) => row[key] === value).map((row) => row.id) : [] };
  };
  const rivals = rows.filter((row) => !row.own);
  const total = rows.reduce((sum, row) => sum + row.mentions, 0);
  const shown = total >= SHARE_OF_VOICE_FROM;
  return {
    rows,
    leaders: top(rows, "named").ids,
    rivals_top: { named: top(rivals, "named"), prompts_named: top(rivals, "prompts_named"), mentions: top(rivals, "mentions"), cited: top(rivals, "cited") },
    tone_summary_from: TONE_SUMMARY_FROM,
    share_of_voice: { mentions: total, minimum: SHARE_OF_VOICE_FROM, shown, shares: shown ? Object.fromEntries(rows.map((row) => [row.id, { k: row.mentions, n: total }])) : null },
  };
}

const SURFACES: Record<string, string> = { chatgpt: "api_web_search", gemini: "api_grounded" };

function tally(slots: WaveSlot[]): SlotTally {
  const count = (status: WaveSlot["status"]) => slots.filter((slot) => slot.status === status).length;
  return { slots: slots.length, asked: slots.length - count("excluded"), completed: count("completed"), failed: count("failed"), excluded: count("excluded"), unfinished: count("planned"), failed_reasons: {}, excluded_reasons: {} };
}

export function mockWave(report: Report, runId: string, number: number): WaveResponse {
  const { project, method } = report;
  const runs = new Map<string, number>();
  const slots: WaveSlot[] = [];
  const answers: Wave["answers"] = [];
  for (const result of report.prompts) {
    for (const [index, answer] of result.answers.entries()) {
      const engine = answer.engine ?? "chatgpt";
      const key = `${result.prompt.id}:${engine}`;
      runs.set(key, (runs.get(key) ?? 0) + 1);
      const id = `${runId}:${result.prompt.id}:${index}`;
      const searched = answer.searches.length > 0 || answer.citations.length > 0;
      slots.push({
        id: `slot:${id}`,
        prompt_id: result.prompt.id,
        group: "discovery",
        lang: result.prompt.language,
        engine,
        model: method.model || null,
        surface: SURFACES[engine] ?? null,
        location: { country: "UZ", city: project.city || null, timezone: "Asia/Tashkent", set: engine === "chatgpt", how: engine === "chatgpt" ? "user_location" : null },
        run_index: runs.get(key) ?? 1,
        status: "completed",
        reason: null,
        attempts: 1,
        answer_id: id,
        searched,
        cost_usd: null,
        reconstructed: true,
      });
      answers.push({
        id,
        prompt_id: result.prompt.id,
        slot_id: `slot:${id}`,
        lang: result.prompt.language,
        engine,
        model: method.model || null,
        run_index: runs.get(key) ?? 1,
        collected_at: method.collectedAt,
        text: answer.text,
        searches: answer.searches,
        searched,
        mentions: answer.mentions.map((mention) => ({ brand_id: mention.brandId, name: mention.brandId, tracked: true, position: mention.position, tone: mention.tone, recommended: Boolean(mention.recommended) })),
        citations: answer.citations.map((citation) => ({ url: citation.url, title: citation.title, domain: citation.domain })),
      });
    }
  }
  const engines = [...new Set(slots.map((slot) => slot.engine))];
  const prompts = report.prompts.map((result) => result.prompt);
  const byLanguage = (items: { lang?: string; language?: string }[]) =>
    Object.fromEntries(PROMPT_LANGUAGES.map((language) => [language, items.filter((item) => (item.lang ?? item.language) === language).length]).filter(([, count]) => Number(count) > 0));
  const wave: Wave = {
    schema_version: 1,
    project: {
      id: project.id,
      brand: { id: project.brand.id, name: project.brand.name, aliases: project.brand.aliases, domains: [project.brand.domain] },
      competitors: project.competitors.map((brand) => ({ id: brand.id, name: brand.name, aliases: brand.aliases, domains: [brand.domain] })),
      category: project.category,
      market: project.country ?? "UZ",
      city: project.city,
    },
    wave: { id: runId, number, is_baseline: number === 1, kind: number === 1 ? "first" : "weekly", collected_at: method.collectedAt, runs_per_prompt: Math.max(1, ...slots.map((slot) => slot.run_index)), settings_hash: "sample", reconstructed: true },
    prompts: prompts.map((prompt) => ({ id: prompt.id, text: prompt.text, lang: prompt.language, group: "discovery", topic: prompt.topic, version: 1 })),
    slots,
    answers,
    domains: report.topSources.map((source) => ({ domain: source.domain, type: source.type, listed: source.brandListed })),
    branded: [],
  };
  return {
    wave,
    metrics: {
      visibility: visibilityOf(wave),
      brands: brandsOf(wave),
      assistants: assistantsOf(wave),
      topics: groupsOf(wave, "topic"),
      languages: groupsOf(wave, "lang"),
      sources: sourcesOf(wave),
      // Sample data has no brand-question check
      claims: { answers: 0, statements: 0, verified: 0, unverified: 0, contradicted: 0 },
      scope: {
        wave: { number, is_baseline: number === 1, kind: wave.wave.kind, collected_at: method.collectedAt, settings_hash: "sample", reconstructed: true },
        engines: engines.map((engine) => {
          const mine = slots.filter((slot) => slot.engine === engine);
          return {
            engine,
            models: method.model ? [method.model] : [],
            surface: SURFACES[engine] ?? null,
            location: mine[0]?.location ?? null,
            location_varies: false,
            ...tally(mine),
            searched: mine.filter((slot) => slot.searched).length,
          };
        }),
        not_tracked: ["google_ai_overviews", "yandex"],
        prompts: { discovery: prompts.length, by_language: byLanguage(prompts), branded: 0, howto: 0 },
        runs_per_prompt: wave.wave.runs_per_prompt,
        slots: tally(slots),
        answers_by_language: byLanguage(slots),
        branded: { ...tally([]), engines: [] },
        brands_tracked: 1 + project.competitors.length,
        other_names: report.untrackedBrands.length,
      },
    },
  };
}
