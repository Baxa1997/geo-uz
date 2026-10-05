import { answersNaming } from "@/shared/helpers/scores";
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
  /** The tracked brand named in the most answers (the client on a tie); undefined if nobody was named. */
  leader: Brand | undefined;
}

export function promptStats(result: PromptResult, brands: Brand[], youId: string): PromptStats {
  const mine = result.answers.flatMap((answer) => answer.mentions.filter((mention) => mention.brandId === youId));
  const leader = brands
    .map((brand) => ({ brand, count: answersNaming(result, brand.id) }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || Number(b.brand.id === youId) - Number(a.brand.id === youId))[0]?.brand;
  return {
    named: answersNaming(result, youId),
    total: result.answers.length,
    position: mine.length ? mine.reduce((sum, mention) => sum + mention.position, 0) / mine.length : null,
    tones: mine.map((mention) => mention.tone),
    leader,
  };
}
