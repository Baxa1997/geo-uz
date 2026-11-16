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

export const PROMPT_LANGUAGES: PromptLanguage[] = ["uz", "ru", "en"];

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
  { key: "gemini", live: true },
  { key: "yandex", live: false },
] as const;

export type EngineKey = (typeof ENGINES)[number]["key"];

/** The engine a report names (`method.engine`); ChatGPT for a name this version doesn't know. */
export const engineOf = (name: string): EngineKey => ENGINES.find((engine) => engine.key === name)?.key ?? "chatgpt";

/**
 * The plans in their order, each with its monthly price in US dollars (the user's decision, 15 Nov 2026):
 * "start" is Standard, "business" is Pro, "agency" is Enterprise, for several projects and priced by
 * agreement (null). Names in messages/Plans. Managed GEO (Pro with the fixes done by our team) is by agreement too.
 */
export const PLANS: Plan[] = ["start", "business", "agency"];
export const PLAN_PRICES: Record<Plan, number | null> = { start: 39.99, business: 89.99, agency: null };
/** How often a paid plan's questions are asked: Standard on Mondays, Pro and Enterprise on Mondays and Thursdays. */
export const PLAN_CHECKS_A_WEEK: Record<Plan, number> = { start: 1, business: 2, agency: 2 };
/** A price as shown: "$39.99"; whole dollars without cents. */
export const formatPrice = (amount: number) => `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

/**
 * What each plan allows a project: questions tracked at once, competitors, brand facts to check against.
 * Start has no wrong-fact checks (the landing page's plan table), so no facts either.
 */
export const PLAN_LIMITS: Record<Plan, ProjectLimits> = {
  start: { prompts: 25, competitors: 5, facts: 0 },
  business: { prompts: 50, competitors: 5, facts: 20 },
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

/** How many brand questions a project keeps (the backend's `BRAND_QUESTION_LIMIT`): each is one more answer per assistant per check. */
export const MAX_BRAND_QUESTIONS = 6;
