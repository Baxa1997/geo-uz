import type { Answer, PromptResult } from "@/shared/types/api";

/** Status filter of the answers table; labels in messages/AnswersPage.table.status. */
export type AnswersFilter = "all" | "missing" | "negative";

/** One answer with the question it answers: a row of the answers table. */
export interface AnswerRow {
  result: PromptResult;
  answer: Answer;
}
