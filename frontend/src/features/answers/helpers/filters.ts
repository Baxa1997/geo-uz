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

/** "" any answer; otherwise the answers that cite that site. */
export const matchesSource = ({ answer }: AnswerRow, domain: string) =>
  !domain || answer.citations.some((citation) => citation.domain === domain);

/** The sites the answers cite, each with the number of answers citing it, most cited first. */
export function citedSites(rows: AnswerRow[]): { domain: string; answers: number }[] {
  const counts = new Map<string, number>();
  for (const { answer } of rows) {
    for (const domain of new Set(answer.citations.map((citation) => citation.domain))) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return [...counts].map(([domain, answers]) => ({ domain, answers })).sort((a, b) => b.answers - a.answers);
}

export const matchesQuery = ({ result }: AnswerRow, query: string) =>
  result.prompt.text.toLowerCase().includes(query.trim().toLowerCase());
