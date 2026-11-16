import type { Prompt, PromptLanguage } from "@/shared/types/api";

/** A question the weekly check asks; an archived one isn't asked and doesn't count toward the plan's limit. */
export const isTracked = (prompt: Prompt) => prompt.archivedAt === null;

/** Marks of Uzbek in Latin letters: its apostrophe letters (oʻ, gʻ) and words a question rarely lacks. */
const UZBEK_LATIN = /[og][ʻʼ‘’'`]|\b(qaysi|qancha|qanday|qayer\w*|eng|uchun|bormi|haqida|narx\w*|yaxshi|kerak|bilan|nima|mumkin|qilish|olish|\w+dagi|\w+larda|\w+larni)\b/i;

/**
 * The language a question is written in, from its letters: Uzbek written in Cyrillic has letters Russian
 * lacks (ў, қ, ғ, ҳ); other Cyrillic text is Russian; Latin is Uzbek when it shows Uzbek's marks, else
 * English. A guess the client can change.
 */
export function languageOfText(text: string): PromptLanguage {
  if (/[ўқғҳ]/i.test(text)) return "uz";
  if (/[а-яё]/i.test(text)) return "ru";
  return UZBEK_LATIN.test(text) ? "uz" : "en";
}

/** The same question written differently (case, spaces) is the same question. */
export const sameText = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
