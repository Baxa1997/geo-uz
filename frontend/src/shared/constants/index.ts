import type { Plan, ProjectLimits, PromptLanguage } from "@/shared/types/api";

/** All dates are shown in Uzbekistan time. */
export const TIME_ZONE = "Asia/Tashkent";

/** httpOnly cookie the backend sets on login (the mocks set the same one). */
export const SESSION_COOKIE = "geo_session";

/** Phone login: Uzbek numbers for now, +998 and 9 digits. */
export const PHONE_PREFIX = "+998";
export const PHONE_LOCAL_DIGITS = 9;

/**
 * Recommended size of a first prompt set (onboarding, before the project has a plan). After that the most
 * a project may track comes from its plan: `Project.limits.prompts`.
 */
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

/** The engine a report names (`method.engine`); ChatGPT for a name this version doesn't know. */
export const engineOf = (name: string): EngineKey => ENGINES.find((engine) => engine.key === name)?.key ?? "chatgpt";

/** The plans in their order, each with its monthly price in soums. Names in messages/Plans. */
export const PLANS: Plan[] = ["start", "business", "agency"];
export const PLAN_PRICES: Record<Plan, number> = { start: 199_000, business: 490_000, agency: 1_490_000 };
/** Managed GEO: the Business plan with the fixes done by our team, from this a month. */
export const MANAGED_PRICE_FROM = 3_000_000;

/**
 * What each plan allows a project: questions tracked at once, competitors, brand facts to check against.
 * Start has no wrong-fact checks (the landing page's plan table), so no facts either.
 */
export const PLAN_LIMITS: Record<Plan, ProjectLimits> = {
  start: { prompts: 25, competitors: 3, facts: 0 },
  business: { prompts: 75, competitors: 5, facts: 20 },
  agency: { prompts: 300, competitors: 5, facts: 50 },
};

/** Brands (projects) an account may have on each plan. */
export const PLAN_BRANDS: Record<Plan, number> = { start: 1, business: 1, agency: 5 };

/**
 * A year paid ahead costs this many months: two months free (the user's decision, Oct 10). The Plan page's
 * Monthly / Yearly switch shows it, as Peec's does.
 */
export const YEARLY_MONTHS_PAID = 10;

/** A brand fact is one statement, at most this long. */
export const FACT_MAX_LENGTH = 300;
