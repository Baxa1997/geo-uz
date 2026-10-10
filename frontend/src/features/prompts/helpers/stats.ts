import { answersNaming, outOf100, TONE_POINTS } from "@/shared/helpers/scores";
import type { Brand, PromptResult, Tone } from "@/shared/types/api";

/** How the client did on one question in the latest run. */
export interface PromptStats {
  /** Answers naming the client, out of `total`. */
  named: number;
  total: number;
  /** Mean position over the answers naming the client; null if never named. */
  position: number | null;
  /** One tone per answer naming the client. */
  tones: Tone[];
  /** The client's mentions out of all the tracked brands' mentions in these answers, 0–1; null when nobody is named. */
  shareOfVoice: number | null;
  /** Answers for which ChatGPT searched the web. */
  searched: number;
  /** The tracked brand named in the most answers (the client on a tie); undefined if nobody was named. */
  leader: Brand | undefined;
}

export function promptStats(result: PromptResult, brands: Brand[], youId: string): PromptStats {
  const mine = result.answers.flatMap((answer) => answer.mentions.filter((mention) => mention.brandId === youId));
  const leader = brands
    .map((brand) => ({ brand, count: answersNaming(result, brand.id) }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || Number(b.brand.id === youId) - Number(a.brand.id === youId))[0]?.brand;
  const mentions = result.answers.reduce((sum, answer) => sum + answer.mentions.length, 0);
  return {
    named: answersNaming(result, youId),
    total: result.answers.length,
    position: mine.length ? mine.reduce((sum, mention) => sum + mention.position, 0) / mine.length : null,
    tones: mine.map((mention) => mention.tone),
    shareOfVoice: mentions ? mine.length / mentions : null,
    searched: result.answers.filter((answer) => answer.searches.length > 0).length,
    leader,
  };
}

/** The tone of the answers naming the client as a score out of 100 (as the report's sentiment); null when none names it. */
export const toneScore = (tones: Tone[]) =>
  tones.length ? Math.round(tones.reduce((sum, tone) => sum + TONE_POINTS[tone], 0) / tones.length) : null;

/** The client's numbers over a set of questions, as shown: visibility in percent, tone 0–100, mean position. */
export interface PromptsSummary {
  visibility: number | null;
  sentiment: number | null;
  position: number | null;
}

/**
 * The client's numbers over the questions on screen, by the same formulas as the report's scores, so
 * the line above the list follows the search and the filters. All null when none of them has been asked.
 */
export function promptsSummary(results: PromptResult[], youId: string): PromptsSummary {
  const answers = results.flatMap((result) => result.answers);
  if (answers.length === 0) return { visibility: null, sentiment: null, position: null };
  const mine = answers.flatMap((answer) => answer.mentions.filter((mention) => mention.brandId === youId));
  const named = answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === youId)).length;
  return {
    visibility: outOf100(named / answers.length),
    sentiment: mine.length ? Math.round(mine.reduce((sum, mention) => sum + TONE_POINTS[mention.tone], 0) / mine.length) : null,
    position: mine.length ? mine.reduce((sum, mention) => sum + mention.position, 0) / mine.length : null,
  };
}

/** Which questions the list shows: all, those whose answers never name the client, or those that do. */
export type PromptsFilter = "all" | "missing" | "named";

export const PROMPTS_FILTERS: PromptsFilter[] = ["all", "missing", "named"];

/** A question that hasn't been asked yet matches "all" only. */
export function matchesFilter(stats: PromptStats | undefined, filter: PromptsFilter) {
  if (filter === "all") return true;
  if (!stats) return false;
  return filter === "missing" ? stats.named === 0 : stats.named > 0;
}
