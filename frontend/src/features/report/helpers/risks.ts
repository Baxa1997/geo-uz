import { missingSources, outOf100, ownSourceShare, rankedBrands, scoreOf, totalAnswers } from "@/shared/helpers/scores";
import type { Action, Report } from "@/shared/types/api";
import { bestCompetitorSite, groupsAgainstLeader, openActions } from "./report";

/** How much a risk can cost, or an opportunity can bring. */
export type Level = "high" | "medium" | "low";

interface Entry {
  level: Level;
  /** The number, in the plan, of the open action that answers it; null when the plan has none. */
  action: number | null;
}

/** What may cost the client customers, each with the numbers its sentence needs. */
export type Risk = Entry &
  (
    | { kind: "facts"; count: number; claim: string }
    | { kind: "lostTopics"; topics: string[]; leader: string }
    | { kind: "leaderGap"; leader: string; gap: number; leaderValue: number; you: number }
    | { kind: "rivalRising"; name: string; points: number; value: number }
    | { kind: "falling"; points: number; value: number }
    | { kind: "tone"; score: number }
  );

/** Where the client can gain, the same way. Shares are whole percents. */
export type Opportunity = Entry &
  (
    | { kind: "listings"; count: number; sites: { domain: string; share: number }[] }
    | { kind: "closeTopics"; topics: string[]; gap: number }
    | { kind: "ownSite"; you: number; rival: string; rivalValue: number }
    | { kind: "rivalFalling"; name: string; points: number }
    | { kind: "language"; weak: string; weakValue: number; strong: string; strongValue: number }
  );

/** A topic is lost when the client is never named there and a competitor is in at least this share of its answers. */
const LOST_FROM = 50;
/** A topic is within reach when the leader is ahead by no more than this many points. */
const CLOSE_WITHIN = 34;
/** The leader's lead, in points, that is a risk, and one that is a high risk. */
const GAP = { medium: 10, high: 30 };
/** A week's change of visibility, in points, worth telling, and a large one. */
const MOVE = { medium: 3, high: 8 };
/** A tone at or under these is a risk. */
const TONE = { medium: 45, high: 30 };
/** A site missing the client is a large opportunity when at least this share of answers cites it. */
const LISTING_HIGH = 10;
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

/**
 * The report's register of risks and opportunities, made from its own numbers, the gravest first: what may
 * cost the client customers (wrong facts, topics it is absent from, the leader's lead, a competitor gaining,
 * its own visibility or tone falling) and where it can gain (sites that don't list it, topics within reach,
 * its own site, a competitor losing ground, the weaker question language). Each entry points at the open
 * action that answers it, when the plan has one.
 */
export function outlook(report: Report, actions: Action[]): { risks: Risk[]; opportunities: Opportunity[] } {
  const { brand, competitors } = report.project;
  const open = openActions(actions);
  const numberOf = (matches: (action: Action) => boolean) => {
    const index = open.findIndex(matches);
    return index >= 0 && index < ACTIONS_SHOWN ? index + 1 : null;
  };
  const points = (share: number) => Math.round(share * 100);
  const you = scoreOf(report.scores, brand.id);
  const compared = report.history.length > 1;
  const topics = groupsAgainstLeader(report, (prompt) => prompt.topic);
  const ranked = rankedBrands(report);
  const leader = ranked[0];
  const place = ranked.findIndex((row) => row.isYou);
  const total = totalAnswers(report.prompts);

  const risks: Risk[] = [];
  const [firstFact] = report.wrongFacts;
  if (firstFact) risks.push({ kind: "facts", level: "high", count: report.wrongFacts.length, claim: firstFact.claim, action: numberOf((action) => action.kind === "fact") });

  const lost = topics.filter((topic) => topic.you === 0 && (topic.leader?.value ?? 0) >= LOST_FROM);
  const [worst] = lost;
  if (worst?.leader) {
    const keys = lost.map((topic) => topic.key);
    risks.push({ kind: "lostTopics", level: "high", topics: keys.slice(0, NAMED), leader: worst.leader.name, action: numberOf((action) => action.kind === "content" && keys.includes(action.topic)) });
  }

  if (you && leader && !leader.isYou) {
    const gap = points(leader.score.visibility) - points(you.visibility);
    if (gap >= GAP.medium) {
      risks.push({ kind: "leaderGap", level: gap >= GAP.high ? "high" : "medium", leader: leader.brand.name, gap, leaderValue: points(leader.score.visibility), you: points(you.visibility), action: null });
    }
  }

  if (compared) {
    const rising = competitors
      .map((competitor) => ({ name: competitor.name, score: scoreOf(report.scores, competitor.id) }))
      .flatMap(({ name, score }) => (score ? [{ name, points: points(score.trend), value: points(score.visibility) }] : []))
      .sort((a, b) => b.points - a.points)[0];
    if (rising && rising.points >= MOVE.medium) risks.push({ kind: "rivalRising", level: rising.points >= MOVE.high ? "high" : "medium", ...rising, action: null });
    const fell = you ? -points(you.trend) : 0;
    if (you && fell >= MOVE.medium) risks.push({ kind: "falling", level: fell >= MOVE.high ? "high" : "medium", points: fell, value: points(you.visibility), action: null });
  }

  if (you && you.sentiment !== null && you.sentiment <= TONE.medium) {
    risks.push({ kind: "tone", level: you.sentiment <= TONE.high ? "high" : "medium", score: Math.round(you.sentiment), action: null });
  }

  const opportunities: Opportunity[] = [];
  const missing = missingSources(report.topSources, competitors);
  const [topMissing] = missing;
  if (topMissing && total > 0) {
    const sites = missing.slice(0, NAMED).map((source) => ({ domain: source.domain, share: Math.round((source.count / total) * 100) }));
    const domains = missing.map((source) => source.domain);
    opportunities.push({
      kind: "listings",
      level: Math.round((topMissing.count / total) * 100) >= LISTING_HIGH ? "high" : "medium",
      count: missing.length,
      sites,
      action: numberOf((action) => action.kind === "listing" && domains.includes(action.domain)),
    });
  }

  const close = topics
    .flatMap((topic) => (topic.leader && topic.you > 0 && topic.leader.value > topic.you && topic.leader.value - topic.you <= CLOSE_WITHIN ? [{ key: topic.key, gap: topic.leader.value - topic.you }] : []))
    .sort((a, b) => a.gap - b.gap);
  const [nearest] = close;
  if (nearest) {
    const keys = close.map((topic) => topic.key);
    opportunities.push({ kind: "closeTopics", level: "medium", topics: keys.slice(0, NAMED), gap: nearest.gap, action: numberOf((action) => action.kind === "content" && keys.includes(action.topic)) });
  }

  const own = outOf100(ownSourceShare(report.prompts, brand.domain));
  const rivalSite = bestCompetitorSite(report);
  if (rivalSite && rivalSite.value - own >= SITE_GAP) {
    opportunities.push({ kind: "ownSite", level: "medium", you: own, rival: rivalSite.name, rivalValue: rivalSite.value, action: numberOf((action) => action.kind === "technical") });
  }

  if (compared && place > 0) {
    // A competitor ahead of the client that is losing ground
    const falling = ranked
      .slice(0, place)
      .map((row) => ({ name: row.brand.name, points: -points(row.score.trend) }))
      .sort((a, b) => b.points - a.points)[0];
    if (falling && falling.points >= MOVE.medium) opportunities.push({ kind: "rivalFalling", level: "low", ...falling, action: null });
  }

  const languages = groupsAgainstLeader(report, (prompt) => prompt.language).sort((a, b) => a.you - b.you);
  const weak = languages[0];
  const strong = languages.at(-1);
  if (weak && strong && weak.key !== strong.key && strong.you - weak.you >= LANGUAGE_GAP) {
    opportunities.push({ kind: "language", level: "low", weak: weak.key, weakValue: weak.you, strong: strong.key, strongValue: strong.you, action: null });
  }

  return { risks: byLevel(risks), opportunities: byLevel(opportunities) };
}
