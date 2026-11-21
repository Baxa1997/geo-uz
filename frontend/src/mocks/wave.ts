// A sample check's data object and scope (`GET /projects/{id}/waves/{runId}`), for the mocks: the sample data has no
// slot log, so its slots are rebuilt from its answers, as the backend rebuilds a check made before the log
// (`backend/app/wave.py`). Its counting follows `backend/app/metrics.py`: the scope card, the headline count and
// the brands (no score: Phase 0 item 0.2), the cited sites by type (0.4).
import { PROMPT_LANGUAGES } from "@/shared/constants";
import type {
  DomainControl,
  DomainRoute,
  DomainType,
  Report,
  SlotTally,
  SourceType,
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
  WaveTopFinding,
  WaveMetrics,
  WaveProviders,
  WaveShelf,
  WaveVisibility,
} from "@/shared/types/api";

// The thresholds of `backend/app/metrics.py`
const SMALL_SAMPLE = 20;
const SHARE_OF_VOICE_FROM = 10;
const TONE_SUMMARY_FROM = 3;
const TONES: Tone[] = ["positive", "neutral", "negative"];
const NUMBERED = /^\s*(\d{1,3})[.)]\s+/;

const host = (domain: string) => domain.trim().toLowerCase().replace(/^www\./, "");

// The sample's sites by the spec's types, from the six kinds it has (`backend/app/domains.py` types a real one)
const TYPE_OF_KIND: Record<SourceType, DomainType> = { own: "client_owned", competitor: "competitor_site", news: "media", directory: "directory", social: "ugc", other: "unclassified" };
const CONTROL: Partial<Record<DomainType, DomainControl>> = { client_owned: "owned", client_managed: "managed", directory: "earned", media: "earned", ugc: "earned", telegram: "earned" };
const PLACEABLE: DomainType[] = ["directory", "media", "ugc", "telegram"];
// The seed list's checked routes, for the sample's sites that have one
const ROUTES: Record<string, DomainRoute> = {
  "2gis.uz": { how: "form", url: "https://reklama.2gis.uz/add-info" },
  "goldenpages.uz": { how: "listing_page", url: "https://www.goldenpages.uz/add/" },
};

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
  const typed = new Map(wave.domains.map((domain) => [domain.domain, domain]));
  const counts = new Map<string, number>();
  for (const answer of cited) for (const domain of new Set(answer.citations.map((citation) => citation.domain))) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([domain, count]) => {
      const site = typed.get(domain);
      const type = site?.type ?? "unclassified";
      const route = site?.route ?? null;
      const listed = Boolean(site?.listed);
      const rivals = site?.rivals.length ?? 0;
      return { domain, type, control: site?.control ?? "not_addressable", review: site?.review ?? "seed", route, listed, rivals, cited: count, target: PLACEABLE.includes(type) && route !== null && !listed && rivals > 0 };
    });
  const types: Partial<Record<DomainType, number>> = {};
  for (const row of rows) types[row.type] = (types[row.type] ?? 0) + 1;
  return { cited_answers: cited.length, sites: rows.length, rows, types, targets: rows.filter((row) => row.target).map((row) => row.domain) };
}

// The top finding's kinds, the strongest first (`metrics.top_finding`)
const FINDING_KINDS: WaveTopFinding["kind"][] = ["competitor", "shared", "client", "open"];
const ENGINES = ["chatgpt", "gemini"];

function topFindingOf(wave: Wave): WaveTopFinding | null {
  if (wave.answers.length === 0) return null;
  const client = wave.project.brand.id;
  const rivals = wave.project.competitors.map((brand) => brand.id);
  const order = new Map(wave.prompts.map((prompt, index) => [prompt.id, index]));
  const names = (answer: Wave["answers"][number], ids: string[]) => answer.mentions.some((mention) => mention.brand_id !== null && ids.includes(mention.brand_id));
  const candidates = [...new Set(wave.answers.map((answer) => answer.prompt_id))].map((promptId) => {
    const theirs = wave.answers.filter((answer) => answer.prompt_id === promptId);
    const withRivals = theirs.filter((answer) => names(answer, rivals)).length;
    const named = theirs.filter((answer) => names(answer, [client])).length;
    const kind: WaveTopFinding["kind"] = withRivals && !named ? "competitor" : withRivals ? "shared" : named ? "client" : "open";
    return { promptId, theirs, withRivals, named, kind };
  });
  candidates.sort(
    (a, b) =>
      FINDING_KINDS.indexOf(a.kind) - FINDING_KINDS.indexOf(b.kind) ||
      b.withRivals - a.withRivals ||
      b.named - a.named ||
      b.theirs.length - a.theirs.length ||
      (order.get(a.promptId) ?? 0) - (order.get(b.promptId) ?? 0),
  );
  const [best] = candidates;
  if (!best || best.kind === "open") return { kind: "open", prompt_id: null, answers: [], named: [], client_named: 0, of: 0 };
  const theirs = [...best.theirs].sort((a, b) => ENGINES.indexOf(a.engine) - ENGINES.indexOf(b.engine) || a.run_index - b.run_index || a.id.localeCompare(b.id));
  const counts = rivals.map((id) => ({ id, named: theirs.filter((answer) => names(answer, [id])).length }));
  return {
    kind: best.kind,
    prompt_id: best.promptId,
    answers: theirs.map((answer) => answer.id),
    named: counts.filter((row) => row.named > 0).sort((a, b) => b.named - a.named).map((row) => row.id),
    client_named: best.named,
    of: theirs.length,
  };
}

// Who holds each question (`metrics.shelf`) and every business named (`metrics.providers`)
function shelfOf(wave: Wave): WaveShelf {
  const client = wave.project.brand.id;
  const rivals = wave.project.competitors.map((brand) => brand.id);
  const names = (answer: Wave["answers"][number], ids: string[]) => answer.mentions.some((mention) => mention.brand_id !== null && ids.includes(mention.brand_id));
  const questions = wave.prompts.flatMap((prompt) => {
    const theirs = wave.answers.filter((answer) => answer.prompt_id === prompt.id);
    if (prompt.group !== "discovery" || theirs.length === 0) return [];
    const named = theirs.filter((answer) => names(answer, [client])).length;
    const withRivals = theirs.filter((answer) => names(answer, rivals)).length;
    const status: WaveShelf["counts"] extends Record<infer K, number> ? K : never = named && withRivals ? "shared" : named ? "client" : withRivals ? "competitor" : "open";
    return [{ prompt_id: prompt.id, status, answers: theirs.length, named, rivals: withRivals }];
  });
  const counts = { competitor: 0, client: 0, shared: 0, open: 0 };
  for (const row of questions) counts[row.status] += 1;
  return { questions, counts };
}

function providersOf(wave: Wave): WaveProviders {
  const tracked = [{ ...wave.project.brand, own: true }, ...wave.project.competitors.map((brand) => ({ ...brand, own: false }))];
  const byId = new Map(tracked.map((brand, index) => [brand.id, { brand, index }]));
  const seen = new Map<string, { name: string; tracked: boolean; own: boolean; order: number; answers: Set<string> }>();
  for (const answer of wave.answers) {
    for (const mention of answer.mentions) {
      const known = mention.brand_id ? byId.get(mention.brand_id) : undefined;
      const key = known ? known.brand.id : `name:${mention.name.trim().toLowerCase()}`;
      const row = seen.get(key) ?? { name: known ? known.brand.name : mention.name.trim(), tracked: Boolean(known), own: Boolean(known?.brand.own), order: known ? known.index : tracked.length, answers: new Set<string>() };
      row.answers.add(answer.id);
      seen.set(key, row);
    }
  }
  const rows = [...seen.entries()]
    .sort(([, a], [, b]) => b.answers.size - a.answers.size || a.order - b.order || a.name.localeCompare(b.name))
    .map(([key, row]) => ({ key, name: row.name, tracked: row.tracked, own: row.own, answers: row.answers.size }));
  return { answers: wave.answers.length, rows };
}

/** The sample's six lines for Telegram (`backend/app/digest.py` writes a real project's), in English. */
export function sampleDigest(wave: Wave, metrics: WaveMetrics): string {
  const rows = new Map(metrics.brands.rows.map((row) => [row.id, row]));
  const top = metrics.brands.rivals_top.named;
  const seen = metrics.visibility;
  return [
    `Seenova · ${wave.project.brand.name} · ${wave.wave.collected_at.slice(0, 10)} · ${metrics.scope.engines.map((engine) => engine.engine).join(", ")}`,
    `In AI answers: ${wave.project.brand.name} ${seen.named}/${seen.answers} (sample)`,
    top.value > 0 ? `Most named instead of you: ${top.ids.map((id) => rows.get(id)?.name ?? id).join(" and ")} ${top.value}/${seen.answers}` : "Most named instead of you: no tracked competitor",
    "Biggest change: sample data",
    "This week's action: sample data",
    "Full report: (the report's link)",
  ].join("\n");
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
    domains: report.topSources.map((source) => {
      const type = TYPE_OF_KIND[source.type];
      const rivals = new Set(project.competitors.map((brand) => brand.id));
      const beside = new Set(answers.filter((answer) => answer.citations.some((citation) => citation.domain === source.domain)).flatMap((answer) => answer.mentions.flatMap((mention) => (mention.brand_id && rivals.has(mention.brand_id) ? [mention.brand_id] : []))));
      return { domain: source.domain, type, control: CONTROL[type] ?? "not_addressable", route: ROUTES[source.domain] ?? null, review: "seed", listed: source.brandListed, rivals: [...beside] };
    }),
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
      top_finding: topFindingOf(wave),
      shelf: shelfOf(wave),
      providers: providersOf(wave),
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
