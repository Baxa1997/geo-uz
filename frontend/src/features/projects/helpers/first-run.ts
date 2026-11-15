import type { Brand, FirstRunResult } from "@/shared/types/api";

export interface BrandCount {
  brand: Brand;
  isYou: boolean;
  /** Answers that name the brand. */
  named: number;
  /** Answers that recommend it, not only name it. */
  recommended: number;
  /** Its mean place among the businesses an answer names; null if never named. */
  position: number | null;
}

/**
 * Every brand of a first run as counts of answers, the most named first (then the most recommended).
 * Counts, not percentages: a first run has few answers, and "3 of 10" can't be read as more than it is.
 */
export function brandCounts(result: FirstRunResult): BrandCount[] {
  const answers = result.prompts.flatMap((item) => item.answers);
  return [result.brand, ...result.competitors]
    .map((brand) => ({
      brand,
      isYou: brand.id === result.brand.id,
      named: answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === brand.id)).length,
      recommended: result.recommended[brand.id] ?? answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === brand.id && mention.recommended)).length,
      position: result.scores.find((score) => score.brandId === brand.id)?.avgPosition ?? null,
    }))
    .sort((a, b) => b.named - a.named || b.recommended - a.recommended || Number(b.isYou) - Number(a.isYou));
}

/** The client's place in that order, counting brands named as often as one place. */
export const placeOf = (counts: BrandCount[], you: BrandCount) => 1 + counts.filter((row) => row.named > you.named).length;
