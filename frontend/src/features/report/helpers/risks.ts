import { rankedBrands, scoreOf } from "@/shared/helpers/scores";
import { shareOf } from "@/shared/hooks/use-count-words";
import type { Action, Report, WaveResponse } from "@/shared/types/api";
import { orderedAnswers, type WaveAnswer } from "./evidence";
import { openActions } from "./report";

/** How much a risk can cost, or an opportunity can bring. */
export type Level = "high" | "medium" | "low";

interface Entry {
  level: Level;
  /** The number, in the plan, of the open action that answers it; null when the plan has none. */
  action: number | null;
  /** The buyer answers it stands on, by id: the evidence a reader opens (Phase 0 item 0.5). */
  evidence: string[];
}

/** What may cost the client customers, each with the counts its sentence needs (no percentage: Phase 0 item 0.3). */
export type Risk = Entry &
  (
    | { kind: "facts"; count: number; claim: string }
    | { kind: "lostTopics"; topics: string[]; leaders: string[] }
    | { kind: "leaderGap"; leader: string; leaderNamed: number; you: number; answers: number }
    | { kind: "rivalRising"; name: string; points: number; named: number; answers: number }
    | { kind: "falling"; points: number; named: number; answers: number }
    | { kind: "tone"; negative: number; mentions: number }
  );

/** Where the client can gain, the same way. */
export type Opportunity = Entry &
  (
    | { kind: "listings"; count: number; answers: number; sites: { domain: string; cited: number }[] }
    | { kind: "closeTopics"; topics: string[]; gap: number }
    | { kind: "ownSite"; you: number; rivals: string[]; rivalCited: number; answers: number }
    | { kind: "rivalFalling"; name: string; id: string; points: number }
    | { kind: "language"; weak: string; weakNamed: number; weakAnswers: number; strong: string; strongNamed: number; strongAnswers: number }
  );

/** A topic is lost when the client is never named there and a competitor is in at least this share of its answers. */
const LOST_FROM = 50;
/** A topic is within reach when the competitors named most are ahead by no more than this many points. */
const CLOSE_WITHIN = 34;
/** The leader's lead, in points, that is a risk, and one that is a high risk. */
const GAP = { medium: 10, high: 30 };
/** A week's change of visibility, in points, worth telling, and a large one. */
const MOVE = { medium: 3, high: 8 };
/** The client's own site against a competitor's, and one question language against the other: points apart worth telling. */
const SITE_GAP = 5;
const LANGUAGE_GAP = 10;
/** The register names at most this many topics and sites in an entry, and holds this many entries a side. */
const NAMED = 3;
const ENTRIES = 4;
/** The plan numbers the first open actions (Recommendations shows this many). */
export const ACTIONS_SHOWN = 8;

const ORDER: Record<Level, number> = { high: 0, medium: 1, low: 2 };
const byLevel = <T extends Entry>(entries: T[]) => [...entries].sort((a, b) => ORDER[a.level] - ORDER[b.level]).slice(0, ENTRIES);

/** A count's share in whole points by the one rounding rule, 0 when there is nothing to count over. */
const points = (k: number, n: number) => shareOf(k, n) ?? 0;

/**
 * The report's register of risks and opportunities, made from the check's counts (its data object, Phase 0
 * item 0.3), the gravest first: what may cost the client customers (wrong facts, topics it is absent from, a
 * leader's lead, a competitor gaining, its own visibility or tone falling) and where it can gain (sites it can
 * get onto, topics within reach, its own site, a competitor losing ground, the weaker question language).
 * Ties lead nobody, and every entry says its counts, never a percentage. A week's change is the report's
 * history until the change log (spec §4.12). Each entry points at the open action that answers it, and at the
 * buyer answers it stands on (its evidence, Phase 0 item 0.5); wrong facts come from the brand questions, whose
 * answers are the accuracy section's.
 */
export function outlook(report: Report, actions: Action[], wave: WaveResponse): { risks: Risk[]; opportunities: Opportunity[] } {
  const { metrics } = wave;
  const { brand, competitors } = report.project;
  const open = openActions(actions);
  const numberOf = (matches: (action: Action) => boolean) => {
    const index = open.findIndex(matches);
    return index >= 0 && index < ACTIONS_SHOWN ? index + 1 : null;
  };
  const { rows, leaders } = metrics.brands;
  const answers = metrics.visibility.answers;
  const client = rows.find((row) => row.own);
  const rowOf = (id: string) => rows.find((row) => row.id === id);
  const nameOf = (id: string) => rowOf(id)?.name ?? id;
  const compared = report.history.length > 1;
  // The evidence: the buyer answers that meet a test, by id
  const buyerAnswers = orderedAnswers(wave.wave);
  const topicOf = new Map(wave.wave.prompts.map((prompt) => [prompt.id, prompt.topic]));
  const where = (test: (answer: WaveAnswer) => boolean) => buyerAnswers.filter(test).map((answer) => answer.id);
  const names = (answer: WaveAnswer, ids: string[]) => answer.mentions.some((mention) => mention.brand_id !== null && ids.includes(mention.brand_id));
  const rivalIds = competitors.map((competitor) => competitor.id);
  const cites = (answer: WaveAnswer, domains: string[]) => answer.citations.some((citation) => domains.includes(citation.domain));
  const trend = (id: string) => Math.round((scoreOf(report.scores, id)?.trend ?? 0) * 100);

  const risks: Risk[] = [];
  const [firstFact] = report.wrongFacts;
  if (firstFact) risks.push({ kind: "facts", level: "high", count: report.wrongFacts.length, claim: firstFact.claim, action: numberOf((action) => action.kind === "fact"), evidence: [] });

  const lost = metrics.topics.filter((topic) => topic.named === 0 && topic.rivals.value > 0 && points(topic.rivals.value, topic.answers) >= LOST_FROM);
  const [worst] = lost;
  if (worst) {
    const keys = lost.map((topic) => topic.key);
    risks.push({
      kind: "lostTopics",
      level: "high",
      topics: keys.slice(0, NAMED),
      leaders: worst.rivals.ids.map(nameOf),
      action: numberOf((action) => action.kind === "content" && keys.includes(action.topic)),
      evidence: where((answer) => keys.includes(topicOf.get(answer.prompt_id) ?? "") && names(answer, rivalIds)),
    });
  }

  // A leader's lead only when one brand is named more often than every other: tied brands lead nobody
  const [only] = leaders.length === 1 ? leaders.flatMap((id) => rows.filter((row) => row.id === id)) : [];
  if (client && only && !only.own) {
    const gap = points(only.named, answers) - points(client.named, answers);
    if (gap >= GAP.medium) {
      risks.push({ kind: "leaderGap", level: gap >= GAP.high ? "high" : "medium", leader: only.name, leaderNamed: only.named, you: client.named, answers, action: null, evidence: where((answer) => names(answer, [only.id])) });
    }
  }

  if (compared && client) {
    const rising = competitors
      .map((competitor) => ({ id: competitor.id, points: trend(competitor.id) }))
      .sort((a, b) => b.points - a.points)[0];
    const row = rising && rowOf(rising.id);
    if (rising && row && rising.points >= MOVE.medium) {
      risks.push({ kind: "rivalRising", level: rising.points >= MOVE.high ? "high" : "medium", name: row.name, points: rising.points, named: row.named, answers, action: null, evidence: where((answer) => names(answer, [row.id])) });
    }
    const fell = -trend(brand.id);
    if (fell >= MOVE.medium) {
      risks.push({ kind: "falling", level: fell >= MOVE.high ? "high" : "medium", points: fell, named: client.named, answers, action: null, evidence: where((answer) => names(answer, [client.id])) });
    }
  }

  // Tone counted per mention, summed up only from three mentions (report spec §6.3): mostly negative is a high
  // risk, a mixed tone with negative mentions a medium one
  const tone = client?.tone;
  const negative = tone?.counts.negative ?? 0;
  if (tone && negative > 0 && (tone.summary === "negative" || tone.summary === "mixed")) {
    risks.push({
      kind: "tone",
      level: tone.summary === "negative" ? "high" : "medium",
      negative,
      mentions: tone.mentions,
      action: null,
      evidence: where((answer) => answer.mentions.some((mention) => mention.brand_id === client?.id && mention.tone === "negative")),
    });
  }

  const opportunities: Opportunity[] = [];
  const { sources } = metrics;
  // The placement targets (spec §7, Phase 0 item 0.4): directories, media, UGC and Telegram with a known way onto
  // them that name competitors and not the client, the most cited first. Its level is the first one's action's
  // impact, so the register and the plan never disagree (defect 4: "medium" in one place, "big" in another)
  const missing = sources.rows.filter((row) => row.target);
  const [topMissing] = missing;
  if (topMissing) {
    const domains = missing.map((row) => row.domain);
    const first = open.find((action) => action.kind === "listing" && action.domain === topMissing.domain);
    opportunities.push({
      kind: "listings",
      level: first?.impact ?? "medium",
      count: missing.length,
      answers: sources.cited_answers,
      sites: missing.slice(0, NAMED).map((row) => ({ domain: row.domain, cited: row.cited })),
      action: numberOf((action) => action.kind === "listing" && domains.includes(action.domain)),
      evidence: where((answer) => cites(answer, domains)),
    });
  }

  const close = metrics.topics
    .flatMap((topic) => {
      const gap = points(topic.rivals.value, topic.answers) - points(topic.named, topic.answers);
      return topic.named > 0 && topic.rivals.value > topic.named && gap <= CLOSE_WITHIN ? [{ key: topic.key, gap }] : [];
    })
    .sort((a, b) => a.gap - b.gap);
  const [nearest] = close;
  if (nearest) {
    const keys = close.map((topic) => topic.key);
    opportunities.push({
      kind: "closeTopics",
      level: "medium",
      topics: keys.slice(0, NAMED),
      gap: nearest.gap,
      action: numberOf((action) => action.kind === "content" && keys.includes(action.topic)),
      evidence: where((answer) => keys.includes(topicOf.get(answer.prompt_id) ?? "") && names(answer, rivalIds)),
    });
  }

  const rivalSite = metrics.brands.rivals_top.cited;
  if (rivalSite.ids.length > 0 && points(rivalSite.value, sources.cited_answers) - points(metrics.visibility.client_cited, sources.cited_answers) >= SITE_GAP) {
    opportunities.push({
      kind: "ownSite",
      level: "medium",
      you: metrics.visibility.client_cited,
      rivals: rivalSite.ids.map(nameOf),
      rivalCited: rivalSite.value,
      answers: sources.cited_answers,
      action: numberOf((action) => action.kind === "technical"),
      evidence: where((answer) => cites(answer, rivalSite.ids.flatMap((id) => wave.wave.project.competitors.find((brand) => brand.id === id)?.domains ?? []))),
    });
  }

  if (compared) {
    // A competitor ahead of the client that is losing ground
    const ranked = rankedBrands(report);
    const place = ranked.findIndex((row) => row.isYou);
    const falling = ranked
      .slice(0, Math.max(0, place))
      .map((row) => ({ name: row.brand.name, id: row.brand.id, points: -trend(row.brand.id) }))
      .sort((a, b) => b.points - a.points)[0];
    if (falling && falling.points >= MOVE.medium) opportunities.push({ kind: "rivalFalling", level: "low", ...falling, action: null, evidence: where((answer) => names(answer, [falling.id])) });
  }

  const languages = [...metrics.languages].sort((a, b) => points(a.named, a.answers) - points(b.named, b.answers));
  const weak = languages[0];
  const strong = languages.at(-1);
  if (weak && strong && weak.key !== strong.key && points(strong.named, strong.answers) - points(weak.named, weak.answers) >= LANGUAGE_GAP) {
    opportunities.push({
      kind: "language",
      level: "low",
      weak: weak.key,
      weakNamed: weak.named,
      weakAnswers: weak.answers,
      strong: strong.key,
      strongNamed: strong.named,
      strongAnswers: strong.answers,
      action: null,
      evidence: where((answer) => answer.lang === weak.key),
    });
  }

  return { risks: byLevel(risks), opportunities: byLevel(opportunities) };
}
