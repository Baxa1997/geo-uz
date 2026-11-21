import type { Wave } from "@/shared/types/api";

/** One buyer answer of the check's data object. */
export type WaveAnswer = Wave["answers"][number];

const ENGINE_ORDER = ["chatgpt", "gemini"];
const engineIndex = (engine: string) => {
  const index = ENGINE_ORDER.indexOf(engine);
  return index < 0 ? ENGINE_ORDER.length : index;
};

/**
 * Every buyer answer of the check in the report's order (Phase 0 item 0.5): its question's order, then the
 * assistant, then the run. The brand questions' answers are the brand facts check's, not here. A finding names
 * an answer by its place in this list ("A3"), and the evidence section lists them all under that number.
 */
export function orderedAnswers(wave: Wave): WaveAnswer[] {
  const order = new Map(wave.prompts.filter((prompt) => prompt.group === "discovery").map((prompt, index) => [prompt.id, index]));
  return wave.answers
    .filter((answer) => order.has(answer.prompt_id))
    .sort(
      (a, b) =>
        (order.get(a.prompt_id) ?? 0) - (order.get(b.prompt_id) ?? 0) ||
        engineIndex(a.engine) - engineIndex(b.engine) ||
        a.run_index - b.run_index ||
        a.id.localeCompare(b.id),
    );
}

/** Each answer's number in the report ("A3" is 3), by its id. */
export function answerNumbers(wave: Wave): Map<string, number> {
  return new Map(orderedAnswers(wave).map((answer, index) => [answer.id, index + 1]));
}

/** The answer's place in the evidence section, for a link. */
export const answerAnchor = (id: string) => `answer-${id}`;

/** The answers' numbers, in order, written "A1, A4". */
export function answerLabels(ids: string[], numbers: Map<string, number>): string {
  return ids
    .flatMap((id) => (numbers.has(id) ? [numbers.get(id) as number] : []))
    .sort((a, b) => a - b)
    .map((number) => `A${number}`)
    .join(", ");
}

/** About two lines of an answer around where it first names a tracked brand (its beginning when it names none), as plain text. */
export function excerptOf(text: string, names: string[], length = 220): string {
  const plain = text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>`|]+|-{3,}:?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const lower = plain.toLowerCase();
  const found = names.map((name) => lower.indexOf(name.toLowerCase())).filter((index) => index >= 0);
  const at = found.length > 0 ? Math.min(...found) : 0;
  // From the start of the sentence the name is in
  const start = at === 0 ? 0 : Math.max(0, plain.lastIndexOf(". ", at) + 2, plain.lastIndexOf(": ", at) + 2);
  const cut = plain.slice(start, start + length);
  const end = cut.length < plain.length - start ? cut.slice(0, Math.max(cut.lastIndexOf(" "), length - 40)) : cut;
  return `${start > 0 ? "… " : ""}${end}${start + end.length < plain.length ? " …" : ""}`;
}
