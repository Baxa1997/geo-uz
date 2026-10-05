// Turns the hand-written answers into API objects, then derives scores and
// sources from them with the formulas in CLAUDE.md, so every number is consistent.
// Any project reuses the same answers: its brands are cast in the roles of the clinics
// the answers name, and the texts are rewritten with their names and domains.
import type {
  Answer,
  Brand,
  BrandScore,
  Citation,
  HistoryPoint,
  NewBrand,
  Project,
  Prompt,
  PromptResult,
  Report,
  ReportFilters,
  ReportMethod,
  ReportPeriod,
  Snapshot,
  SnapshotRequest,
  Source,
  SourceType,
  Tone,
  UntrackedBrand,
  WrongFact,
} from "@/shared/types/api";
import { normalizeDomain } from "@/shared/helpers/domain";
import { ANSWERS, WRONG_FACTS } from "./answers";
import {
  BRANDS,
  LISTINGS,
  OTHER_CLINICS,
  PAGE_MENTIONS,
  PREVIOUS_VISIBILITY,
  PROMPTS,
  SOURCES,
  SOURCE_TYPES,
  type BrandKey,
  type OtherClinic,
  type SourceKey,
} from "./data";
import { siteChecks } from "./site-checks";

export const METHOD: ReportMethod = {
  engine: "chatgpt",
  model: "gpt-5",
  webSearch: true,
  samples: 3,
  collectedAt: "2026-09-28T01:00:00Z",
};

/** A finished run: the prompts it asked, each answered with a seeded prompt's answers. */
export interface MockRun {
  /** Prompt id → id of the seeded prompt whose answers it got. */
  answeredWith: ReadonlyMap<string, string>;
  collectedAt: string;
  /** False on a project's first run: there is no previous period to compare with. */
  hasPrevious: boolean;
}

/** The seeded prompts' weekly run. */
export const SEEDED_RUN: MockRun = {
  answeredWith: new Map(PROMPTS.map((prompt) => [prompt.id, prompt.id])),
  collectedAt: METHOD.collectedAt,
  hasPrevious: true,
};

/** No run yet: the project's questions wait for their turn. */
export const NO_RUN: MockRun = { answeredWith: new Map(), collectedAt: METHOD.collectedAt, hasPrevious: false };

/**
 * A new project's first run. A question from the seeded set gets its own
 * answers; any other question gets those of an unused seeded question in the same language.
 */
export function firstRun(prompts: Prompt[], collectedAt: string): MockRun {
  const answeredWith = new Map<string, string>();
  const used = new Set<string>();
  const assign = (prompt: Prompt, seeded: Prompt) => {
    answeredWith.set(prompt.id, seeded.id);
    used.add(seeded.id);
  };
  // Exact matches first, so an own question can't take the answers of a seeded one
  for (const prompt of prompts) {
    const seeded = PROMPTS.find((p) => p.text === prompt.text && !used.has(p.id));
    if (seeded) assign(prompt, seeded);
  }
  for (const prompt of prompts) {
    if (answeredWith.has(prompt.id)) continue;
    const pool = PROMPTS.filter((p) => p.language === prompt.language);
    const seeded = pool.find((p) => !used.has(p.id)) ?? pool[answeredWith.size % pool.length];
    if (seeded) assign(prompt, seeded);
  }
  return { answeredWith, collectedAt, hasPrevious: false };
}

const SEEDED = Object.entries(BRANDS) as [BrandKey, Brand][];
const OTHERS = Object.entries(OTHER_CLINICS) as [OtherClinic, NewBrand][];

/** Which tracked brand plays each clinic the answers name. */
interface Cast {
  /** Clinics named with a tone. */
  seeded: Map<BrandKey, Brand>;
  /** Clinics named without one: their mentions are neutral. */
  others: Map<OtherClinic, Brand>;
}

/** Same domain or spelling as one of the clinics in the answers. */
function isSame(brand: Brand, clinic: NewBrand) {
  const domain = normalizeDomain(brand.domain);
  const names = new Set([clinic.name, ...clinic.aliases].map((name) => name.toLowerCase()));
  return (domain !== "" && domain === clinic.domain) || names.has(brand.name.trim().toLowerCase());
}

/**
 * A clinic of the answers plays each brand it matches. Any other brand plays a free clinic, in order:
 * a seeded one while there are some, then one the answers name without a tone.
 */
function castBrands(tracked: Brand[]): Cast {
  const cast: Cast = { seeded: new Map(), others: new Map() };
  const unmatched = tracked.filter((brand) => {
    const seeded = SEEDED.find(([key, clinic]) => !cast.seeded.has(key) && isSame(brand, clinic));
    const other = OTHERS.find(([key, clinic]) => !cast.others.has(key) && isSame(brand, clinic));
    if (seeded) cast.seeded.set(seeded[0], brand);
    else if (other) cast.others.set(other[0], brand);
    return !seeded && !other;
  });
  for (const brand of unmatched) {
    const seeded = SEEDED.find(([key]) => !cast.seeded.has(key));
    const other = OTHERS.find(([key]) => !cast.others.has(key));
    if (seeded) cast.seeded.set(seeded[0], brand);
    else if (other) cast.others.set(other[0], brand);
  }
  return cast;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replaces the clinics' names, spellings and domains with those of the brands playing them. */
function rewriter(cast: Cast): (text: string) => string {
  const replacements = new Map<string, string>();
  const roles: [NewBrand, Brand][] = [
    ...[...cast.seeded].map(([key, brand]): [NewBrand, Brand] => [BRANDS[key], brand]),
    ...[...cast.others].map(([key, brand]): [NewBrand, Brand] => [OTHER_CLINICS[key], brand]),
  ];
  for (const [clinic, brand] of roles) {
    if (brand.name !== clinic.name) {
      for (const name of [clinic.name, ...clinic.aliases]) replacements.set(name, brand.name);
    }
    const domain = normalizeDomain(brand.domain);
    if (domain && domain !== clinic.domain) replacements.set(clinic.domain, domain);
  }
  if (replacements.size === 0) return (text) => text;
  // One pass, longest first: "Samo Dent Clinic" before "Samo Dent", and no replacement is replaced again
  const pattern = new RegExp(
    [...replacements.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|"),
    "g",
  );
  return (text) => text.replace(pattern, (match) => replacements.get(match) ?? match);
}

/** The tracked brands each cited page names, by the page's URL as the answers cite it. */
function pageMentions(cast: Cast, rewrite: (text: string) => string): Map<string, string[]> {
  const byUrl = new Map<string, string[]>();
  for (const [key, url] of Object.entries(SOURCES) as [SourceKey, string][]) {
    const cited = new URL(rewrite(url));
    cited.searchParams.delete("utm_source");
    byUrl.set(cited.href, PAGE_MENTIONS[key].flatMap((role) => cast.seeded.get(role)?.id ?? []));
  }
  return byUrl;
}

/** Unique cited URLs, without the utm_source=openai tag the search tool appends. */
function citations(text: string): Citation[] {
  const byUrl = new Map<string, Citation>();
  for (const [, raw] of text.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)) {
    const url = new URL(raw);
    url.searchParams.delete("utm_source");
    byUrl.set(url.href, { url: url.href, domain: url.hostname.replace(/^www\./, "") });
  }
  return [...byUrl.values()];
}

const round = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Results of the prompts the run asked, with mentions of the tracked brands only. Prompts it didn't ask are skipped. */
function resultsFor(
  prompts: Prompt[],
  run: MockRun,
  cast: Cast,
  rewrite: (text: string) => string,
): PromptResult[] {
  return prompts.flatMap((prompt) => {
    const seededId = run.answeredWith.get(prompt.id);
    const specs = seededId ? ANSWERS[seededId] : undefined;
    if (!specs) return [];
    const answers = specs.map((spec, i): Answer => {
      const text = rewrite(spec.text);
      return {
        sample: i + 1,
        text,
        // Untracked clinics take list positions but get no Mention
        mentions: spec.named.flatMap((named, index) => {
          const [brand, tone] =
            typeof named === "string" ? [cast.others.get(named), "neutral" as const] : [cast.seeded.get(named[0]), named[1]];
          return brand ? [{ brandId: brand.id, position: index + 1, tone }] : [];
        }),
        citations: citations(text),
      };
    });
    return [{ prompt, answers }];
  });
}

/** Sentiment is the mean of these over a brand's mentions. */
const TONE_POINTS: Record<Tone, number> = { positive: 100, neutral: 50, negative: 0 };

/** The seeded clinic a tracked brand plays. */
const roleOf = (cast: Cast, brand: Brand) =>
  [...cast.seeded].find(([, player]) => player.id === brand.id)?.[0];

function computeScores(
  tracked: Brand[],
  results: PromptResult[],
  cast: Cast,
  hasPrevious: boolean,
): BrandScore[] {
  const answers = results.flatMap((result) => result.answers);
  const totalMentions = answers.reduce((sum, a) => sum + a.mentions.length, 0);

  return tracked.map((brand) => {
    const mentions = answers.flatMap((a) => a.mentions.filter((m) => m.brandId === brand.id));
    const positions = mentions.map((m) => m.position);
    const named = answers.filter((a) => a.mentions.some((m) => m.brandId === brand.id)).length;
    const visibility = answers.length ? named / answers.length : 0;
    const role = roleOf(cast, brand);
    const previous = hasPrevious && role ? (PREVIOUS_VISIBILITY[BRANDS[role].id] ?? visibility) : visibility;
    return {
      brandId: brand.id,
      visibility: round(visibility),
      shareOfVoice: totalMentions ? round(positions.length / totalMentions) : 0,
      avgPosition: positions.length
        ? round(positions.reduce((sum, p) => sum + p, 0) / positions.length, 2)
        : null,
      sentiment: mentions.length
        ? Math.round(mentions.reduce((sum, m) => sum + TONE_POINTS[m.tone], 0) / mentions.length)
        : null,
      trend: round(visibility - previous),
    };
  });
}

/** Domains by number of answers citing them, each with its kind and the pages cited (and who those name). */
function topSources(
  brand: Brand,
  competitors: Brand[],
  results: PromptResult[],
  cast: Cast,
  mentions: ReadonlyMap<string, string[]>,
): Source[] {
  const answers = new Map<string, number>();
  const pages = new Map<string, Map<string, number>>();
  for (const answer of results.flatMap((result) => result.answers)) {
    for (const domain of new Set(answer.citations.map((c) => c.domain))) {
      answers.set(domain, (answers.get(domain) ?? 0) + 1);
    }
    for (const { url, domain } of answer.citations) {
      const cited = pages.get(domain) ?? new Map<string, number>();
      pages.set(domain, cited.set(url, (cited.get(url) ?? 0) + 1));
    }
  }
  const role = roleOf(cast, brand);
  const own = normalizeDomain(brand.domain);
  const listings = role
    ? (LISTINGS[BRANDS[role].id] ?? []).map((listed) => (listed === BRANDS[role].domain ? own : listed))
    : [own];
  const listed = new Set(listings);
  const rivals = new Set(competitors.map((competitor) => normalizeDomain(competitor.domain)));
  const typeOf = (domain: string): SourceType =>
    domain === own ? "own" : rivals.has(domain) ? "competitor" : (SOURCE_TYPES[domain] ?? "other");

  return [...answers]
    .map(([domain, count]) => ({
      domain,
      type: typeOf(domain),
      count,
      brandListed: listed.has(domain),
      pages: [...(pages.get(domain) ?? [])]
        .map(([url, count]) => ({ url, count, mentions: mentions.get(url) ?? null }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_WEEKS = 8;

const weeksBefore = (iso: string, weeks: number) => new Date(Date.parse(iso) - weeks * WEEK_MS).toISOString();

/**
 * The weekly runs leading to this one. The week before follows from each brand's trend;
 * earlier weeks drift the same way with a small wobble. Position and sentiment wobble
 * around today's values. A first run has no past.
 */
function history(scores: BrandScore[], run: MockRun): HistoryPoint[] {
  const weeks = run.hasPrevious ? HISTORY_WEEKS : 1;
  return Array.from({ length: weeks }, (_, index) => {
    const back = weeks - 1 - index;
    const visibilities = scores.map(({ visibility, trend }, brand) => {
      if (back === 0) return visibility;
      const drift = Math.sign(trend) * 0.015 * (back - 1);
      const wobble = back === 1 ? 0 : 0.025 * Math.sin(back * 1.7 + brand * 2.1);
      return Math.min(1, Math.max(0, visibility - trend - drift + wobble));
    });
    // Share of voice moves with visibility, and still adds up to 100%
    const weights = scores.map(({ visibility, shareOfVoice }, brand) =>
      visibility > 0 ? (shareOfVoice * (visibilities[brand] ?? 0)) / visibility : 0,
    );
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return {
      collectedAt: weeksBefore(run.collectedAt, back),
      scores: scores.map(({ brandId, avgPosition, sentiment }, brand) => {
        const named = (visibilities[brand] ?? 0) > 0;
        // A brand that gains visibility was named later in the lists, and less warmly, before
        const past = back === 0 ? 0 : Math.sign(scores[brand]?.trend ?? 0) * Math.min(back, 4);
        const sway = back === 0 ? 0 : Math.sin(back * 1.3 + brand * 1.9);
        return {
          brandId,
          visibility: round(visibilities[brand] ?? 0),
          shareOfVoice: total ? round((weights[brand] ?? 0) / total) : 0,
          avgPosition: named && avgPosition !== null ? round(Math.max(1, avgPosition + 0.08 * past + 0.15 * sway), 2) : null,
          sentiment: named && sentiment !== null ? Math.round(Math.min(100, Math.max(0, sentiment - 1.5 * past + 3 * sway))) : null,
        };
      }),
    };
  });
}

/** Clinics the answers name that the project doesn't track, by how many answers name them. */
function untrackedBrands(prompts: Prompt[], run: MockRun, cast: Cast): UntrackedBrand[] {
  const counts = new Map<string, number>();
  for (const prompt of prompts) {
    for (const spec of ANSWERS[run.answeredWith.get(prompt.id) ?? ""] ?? []) {
      for (const named of spec.named) {
        const tracked = typeof named === "string" ? cast.others.has(named) : cast.seeded.has(named[0]);
        const name = typeof named === "string" ? named : BRANDS[named[0]].name;
        if (!tracked) counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }
  return [...counts].map(([name, answers]) => ({ name, answers })).sort((a, b) => b.answers - a.answers);
}

/** Wrong facts about the clinic the brand plays, on the prompts the run asked. */
function wrongFacts(
  brand: Brand,
  results: PromptResult[],
  run: MockRun,
  cast: Cast,
  rewrite: (text: string) => string,
): WrongFact[] {
  const role = roleOf(cast, brand);
  if (!role) return [];
  return (WRONG_FACTS[BRANDS[role].id] ?? []).flatMap((fact) => {
    const result = results.find((r) => run.answeredWith.get(r.prompt.id) === fact.promptId);
    if (!result) return [];
    return [
      {
        claim: rewrite(fact.claim),
        correct: rewrite(fact.correct),
        promptId: result.prompt.id,
        foundAt: run.hasPrevious ? weeksBefore(run.collectedAt, fact.weeksAgo) : run.collectedAt,
      },
    ];
  });
}

export function buildReport(
  project: Project,
  allPrompts: Prompt[],
  period: ReportPeriod,
  run: MockRun,
  { language, topic }: ReportFilters = {},
): Report {
  const prompts = allPrompts.filter(
    (prompt) => (!language || prompt.language === language) && (!topic || prompt.topic === topic),
  );
  const tracked = [project.brand, ...project.competitors];
  const cast = castBrands(tracked);
  const rewrite = rewriter(cast);
  const results = resultsFor(prompts, run, cast, rewrite);
  const scores = computeScores(tracked, results, cast, run.hasPrevious);
  return {
    project,
    period,
    method: { ...METHOD, collectedAt: run.collectedAt },
    scores,
    prompts: results,
    topSources: topSources(project.brand, project.competitors, results, cast, pageMentions(cast, rewrite)),
    wrongFacts: wrongFacts(project.brand, results, run, cast, rewrite),
    history: results.length > 0 ? history(scores, run) : [],
    untrackedBrands: untrackedBrands(prompts, run, cast),
    // Depends on the clock: the mock backend fills it in
    nextRunAt: null,
  };
}

/** Mock "detects" every site as a Tashkent dental clinic and always uses that data. */
export function buildSnapshot(request: SnapshotRequest, id: string): Snapshot {
  const domain = normalizeDomain(request.domain);
  const seeded: Brand[] = Object.values(BRANDS);
  const label = domain.split(".")[0] ?? domain;
  const brand = seeded.find((b) => b.domain === domain) ?? {
    id: "brd_snapshot",
    name: label.charAt(0).toUpperCase() + label.slice(1),
    aliases: [],
    domain,
  };
  const competitors = seeded.filter((b) => b.id !== brand.id).slice(0, 3);
  const tracked = [brand, ...competitors];
  const cast = castBrands(tracked);
  const prompts = (["uz", "ru"] as const).flatMap((language) =>
    PROMPTS.filter((p) => p.language === language).slice(0, 5),
  );
  const rewrite = rewriter(cast);
  const results = resultsFor(prompts, SEEDED_RUN, cast, rewrite);
  return {
    id,
    domain,
    category: request.category ?? "dental_clinic",
    city: request.city ?? "tashkent",
    method: METHOD,
    brand,
    competitors,
    scores: computeScores(tracked, results, cast, false),
    prompts: results,
    topSources: topSources(brand, competitors, results, cast, pageMentions(cast, rewrite)),
    siteChecks: siteChecks(domain),
  };
}
