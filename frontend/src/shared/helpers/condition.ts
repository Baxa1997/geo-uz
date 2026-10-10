// The condition score: how the status report rates a project. The backend computes it for every run
// (`Report.conditionHistory`); the mocks use the same formula, and the report writes its sentences from
// the same facts.
import type { Condition, ConditionArea, Report, Source } from "@/shared/types/api";
import { answersNaming, scoreOf } from "./scores";

/** The areas in the order a report lists them. */
export const CONDITION_AREAS: ConditionArea[] = ["visibility", "competition", "coverage", "sources", "accuracy"];

/** How a score out of 100 reads. */
export type ConditionStatus = "good" | "fair" | "weak";

/** A score reads "good" from here, "fair" from FAIR_FROM, and "weak" under it. */
export const GOOD_FROM = 70;
export const FAIR_FROM = 40;

export const conditionStatus = (score: number): ConditionStatus => (score >= GOOD_FROM ? "good" : score >= FAIR_FROM ? "fair" : "weak");

/** Each wrong fact ChatGPT states about the client takes this many points off the accuracy area. */
export const WRONG_FACT_PENALTY = 10;

/** Tone counts as neutral for a brand no answer names. */
const NEUTRAL_TONE = 50;

/** A site a business can get listed on: neither its own nor a competitor's. */
export const isListable = (source: Pick<Source, "type">) => source.type !== "own" && source.type !== "competitor";

/** The numbers a run's condition is made from: what each area's sentence tells, and what its score is counted from. */
export interface ConditionFacts {
  /** The client's visibility, 0–1. */
  visibility: number;
  /** The most visible tracked brand's visibility, 0–1: the client's own when it leads. */
  leaderVisibility: number;
  /** Questions with at least one answer naming the client, out of all the questions asked. */
  questionsNamed: number;
  questions: number;
  /** Citations of the sites a business can be listed on: those going to sites that list the client, and all. */
  listedCitations: number;
  listableCitations: number;
  /** The client's tone, 0–100; null when no answer names it. */
  sentiment: number | null;
  /** Wrong facts ChatGPT states about the client. */
  wrongFacts: number;
}

/** A report's facts for its condition. A site's citations are the answers citing it. */
export function conditionFacts(report: Pick<Report, "project" | "scores" | "prompts" | "topSources" | "wrongFacts">): ConditionFacts {
  const { brand } = report.project;
  const you = scoreOf(report.scores, brand.id);
  const listable = report.topSources.filter(isListable);
  const citations = (sources: Source[]) => sources.reduce((sum, source) => sum + source.count, 0);
  return {
    visibility: you?.visibility ?? 0,
    leaderVisibility: Math.max(0, ...report.scores.map((score) => score.visibility)),
    questionsNamed: report.prompts.filter((result) => answersNaming(result, brand.id) > 0).length,
    questions: report.prompts.length,
    listedCitations: citations(listable.filter((source) => source.brandListed)),
    listableCitations: citations(listable),
    sentiment: you?.sentiment ?? null,
    wrongFacts: report.wrongFacts.length,
  };
}

const outOf100 = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

/**
 * The condition from its facts. Each area is a whole number from 0 to 100:
 * visibility: the share of answers naming the client;
 * competition: its visibility as a share of the most visible tracked brand's (100 when it leads);
 * coverage: the share of questions that name it at least once;
 * sources: of the citations of sites a business can be listed on, the share going to sites that list it
 *   (100 when no such site is cited);
 * accuracy: its tone, less WRONG_FACT_PENALTY for every wrong fact.
 * The score is their mean.
 */
export function rateCondition(facts: ConditionFacts): Condition {
  const areas: Record<ConditionArea, number> = {
    visibility: outOf100(facts.visibility * 100),
    competition: facts.leaderVisibility > 0 ? outOf100((facts.visibility / facts.leaderVisibility) * 100) : 0,
    coverage: facts.questions > 0 ? outOf100((facts.questionsNamed / facts.questions) * 100) : 0,
    sources: facts.listableCitations > 0 ? outOf100((facts.listedCitations / facts.listableCitations) * 100) : 100,
    accuracy: outOf100((facts.sentiment ?? NEUTRAL_TONE) - WRONG_FACT_PENALTY * facts.wrongFacts),
  };
  return { score: Math.round(CONDITION_AREAS.reduce((sum, area) => sum + areas[area], 0) / CONDITION_AREAS.length), areas };
}

/** The area rated best and the one rated worst, the earlier in the report's order on a tie. */
export function extremes(condition: Condition): { strongest: ConditionArea; weakest: ConditionArea } {
  const [first = "visibility"] = CONDITION_AREAS;
  let strongest = first;
  let weakest = first;
  for (const area of CONDITION_AREAS) {
    if (condition.areas[area] > condition.areas[strongest]) strongest = area;
    if (condition.areas[area] < condition.areas[weakest]) weakest = area;
  }
  return { strongest, weakest };
}
