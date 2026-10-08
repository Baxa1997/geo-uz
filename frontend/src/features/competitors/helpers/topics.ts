import { answersNaming } from "@/shared/helpers/scores";
import type { PromptResult } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/** One brand's standing on a topic: the answers to the topic's questions that name it. */
export interface TopicEntry {
  brand: SeriesBrand;
  named: number;
}

export interface TopicRanking {
  topic: string;
  /** Answers to the topic's questions: what a brand's count is out of. */
  answers: number;
  /** The brands named on the topic, most named first; on a tie the client comes first, then the project's order. */
  ranked: TopicEntry[];
}

/** Who ChatGPT names most on each topic's questions, in the order the topics first appear. */
export function topicRankings(results: PromptResult[], brands: SeriesBrand[]): TopicRanking[] {
  const topics = [...new Set(results.map((result) => result.prompt.topic))];
  return topics.map((topic) => {
    const inTopic = results.filter((result) => result.prompt.topic === topic);
    const ranked = brands
      .map((brand) => ({ brand, named: inTopic.reduce((sum, result) => sum + answersNaming(result, brand.id), 0) }))
      .filter(({ named }) => named > 0)
      .sort((a, b) => b.named - a.named);
    return { topic, answers: inTopic.reduce((sum, result) => sum + result.answers.length, 0), ranked };
  });
}

/** The topics where the client is the brand ChatGPT names most. */
export const topicsLed = (rankings: TopicRanking[]) => rankings.filter(({ ranked }) => ranked[0]?.brand.isYou).length;
