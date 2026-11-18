import type { BrandView } from "@/shared/types/api";

/** A text in the interface's three languages, as the brand answers carry it. */
export type ThreeLanguages = BrandView["statements"][number]["text"];

export type StatementCheck = BrandView["statements"][number]["check"];
export type StatementTopic = BrandView["statements"][number]["topic"];
export type Known = BrandView["known"];

/** The topics in the order an owner reads about a business: what it is, prices, where, how to reach it, its name. */
export const TOPICS: StatementTopic[] = ["what", "prices", "place", "contacts", "reputation", "other"];

/** One thing AI said about the business, said once however many answers said it. */
export interface Statement {
  topic: StatementTopic;
  text: ThreeLanguages;
  check: StatementCheck;
  correct: ThreeLanguages | null;
  /** The assistants that said it, by name ("ChatGPT"). */
  engines: string[];
}

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Every statement of the brand answers, once: the same words from two answers or two assistants are one
 * statement with both assistants beside it. Compared in the interface's language, in which they are shown.
 */
export function statementsOf(views: BrandView[], language: keyof ThreeLanguages): Statement[] {
  const byText = new Map<string, Statement>();
  for (const view of views) {
    for (const said of view.statements) {
      const key = `${said.check}:${normalize(said.text[language])}`;
      const known = byText.get(key);
      if (known) {
        if (!known.engines.includes(view.name)) known.engines.push(view.name);
      } else {
        byText.set(key, { topic: said.topic, text: said.text, check: said.check, correct: said.correct, engines: [view.name] });
      }
    }
  }
  return [...byText.values()];
}

/** Statements by topic, in the topics' order; topics without any are left out. */
export function byTopic(statements: Statement[]): { topic: StatementTopic; statements: Statement[] }[] {
  return TOPICS.flatMap((topic) => {
    const here = statements.filter((statement) => statement.topic === topic);
    return here.length > 0 ? [{ topic, statements: here }] : [];
  });
}

/**
 * How each assistant knows the business over all its brand answers: it confuses it with another if any answer
 * did (the worst case is the one to act on), knows it if any answer described it, and doesn't otherwise.
 */
export function knownBy(views: BrandView[]): { engine: string; known: Known }[] {
  const engines = [...new Set(views.map((view) => view.name))];
  return engines.map((engine) => {
    const own = views.filter((view) => view.name === engine).map((view) => view.known);
    return { engine, known: own.includes("confuses") ? "confuses" : own.includes("knows") ? "knows" : "unknown" };
  });
}
