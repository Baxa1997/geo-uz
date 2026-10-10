import type { Prompt, PromptLanguage } from "@/shared/types/api";

/** A question the weekly check asks; an archived one isn't asked and doesn't count toward the plan's limit. */
export const isTracked = (prompt: Prompt) => prompt.archivedAt === null;

/**
 * The language a question is written in, from its letters: Uzbek written in Cyrillic has letters Russian
 * lacks (ў, қ, ғ, ҳ); other Cyrillic text is Russian; Latin is Uzbek. A guess the client can change.
 */
export function languageOfText(text: string): PromptLanguage {
  if (/[ўқғҳ]/i.test(text)) return "uz";
  return /[а-яё]/i.test(text) ? "ru" : "uz";
}

/** The same question written differently (case, spaces) is the same question. */
export const sameText = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
