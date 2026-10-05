import type { PromptLanguage } from "@/shared/types/api";

/** All dates are shown in Uzbekistan time. */
export const TIME_ZONE = "Asia/Tashkent";

/** httpOnly cookie the backend sets on login (the mocks set the same one). */
export const SESSION_COOKIE = "geo_session";

/** Phone login: Uzbek numbers for now, +998 and 9 digits. */
export const PHONE_PREFIX = "+998";
export const PHONE_LOCAL_DIGITS = 9;

/** Recommended size of a prompt set in the MVP (CLAUDE.md). */
export const MIN_PROMPTS = 20;
export const MAX_PROMPTS = 50;

export const PROMPT_LANGUAGES: PromptLanguage[] = ["uz", "ru"];

export const PROMPT_TEXT_MIN_LENGTH = 5;
export const PROMPT_TEXT_MAX_LENGTH = 300;

/** Every recommended action's how-to has this many steps (the texts are in messages/Actions.steps). */
export const ACTION_STEP_COUNT = 3;

/**
 * AI engines in the engine switcher. Only ChatGPT is measured (MVP); the others say "coming soon".
 * Names are in messages/Engines.
 */
export const ENGINES = [
  { key: "chatgpt", live: true },
  { key: "gemini", live: false },
  { key: "yandex", live: false },
] as const;

export type EngineKey = (typeof ENGINES)[number]["key"];
