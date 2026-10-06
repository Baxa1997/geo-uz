import type { Report } from "@/shared/types/api";
import type { AnswerRow } from "@/shared/types/scores";
import type { AnswersFilter } from "../types";

/** Every answer of the report, question by question, in sample order. */
export const answerRows = (report: Report): AnswerRow[] =>
  report.prompts.flatMap((result) => result.answers.map((answer) => ({ result, answer })));

export const rowKey = ({ result, answer }: AnswerRow) => `${result.prompt.id}:${answer.sample}`;

/** "missing": the answer doesn't name the client; "negative": it names the client in a negative tone. */
export function matchesStatus({ answer }: AnswerRow, filter: AnswersFilter, youId: string) {
  if (filter === "missing") return !answer.mentions.some((mention) => mention.brandId === youId);
  if (filter === "negative") return answer.mentions.some((mention) => mention.brandId === youId && mention.tone === "negative");
  return true;
}

/** "" any answer; NO_BRAND an answer naming no tracked brand; otherwise answers naming that brand. */
export const NO_BRAND = "none";

export function matchesBrand({ answer }: AnswerRow, brandId: string) {
  if (!brandId) return true;
  if (brandId === NO_BRAND) return answer.mentions.length === 0;
  return answer.mentions.some((mention) => mention.brandId === brandId);
}

export const matchesQuery = ({ result }: AnswerRow, query: string) =>
  result.prompt.text.toLowerCase().includes(query.trim().toLowerCase());
