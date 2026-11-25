import type { BrandDraft } from "../types";

/** Onboarding lets users pick up to 5 of the suggested competitors; the first 3 start ticked. */
export const MAX_COMPETITORS = 5;
export const PRESELECTED_COMPETITORS = 3;

export const EMPTY_BRAND: BrandDraft = { name: "", aliases: "", domain: "" };

/**
 * Onboarding wizard steps, in order: the website, the brand profile read from it, competitors, topics,
 * then the questions in those topics. Message keys in Onboarding.steps.
 */
export const ONBOARDING_STEPS = ["website", "profile", "competitors", "topics", "questions"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Topics a project starts with: every suggested one is ticked, and the client can add their own. */
export const MAX_TOPICS = 15;

/** Brand profile chips: other spellings of the name, and the services the business offers. */
export const MAX_ALIASES = 10;
export const MAX_SERVICES = 12;
export const MAX_DESCRIPTION_LENGTH = 400;

/** Topic of questions typed in during onboarding (the Questions page lets users set their own). */
export const OWN_QUESTION_TOPIC = "other";
/** The general brand question, as the backend writes it (`firstrun.BRAND_QUESTIONS`): one plain question. */
export const BRAND_QUESTION_TEMPLATES = {
  ru: "Что вы знаете о «{name}»{place}?",
  uz: "{name}{place} haqida nima bilasiz?",
} as const;

/** The questions step's topic list: every ticked topic at once. */
export const ALL_TOPICS = "";

/** 40px tall inputs: comfortable touch targets on phones. */
export const INPUT_CLASS = "h-10";

/** How often a running check is asked what it has so far. */
export const PARTIAL_POLL_MS = 3000;

/** How often the progress screen asks how the first run is going. */
export const RUN_POLL_MS = 1000;
/** How often an open page of a check in the queue asks whether its check has started (25 Nov 2026). */
export const QUEUE_POLL_MS = 30_000;

/**
 * The first check's steps, in order (the user's correction, 16 Nov 2026: confirm first, check after): the
 * website and country, then what we read from it to correct: the business, its competitors, the questions.
 * Only then is anybody asked. Texts in messages/FirstRun.setup.
 */
export const FIRST_CHECK_STEPS = ["website", "profile", "competitors", "questions"] as const;

/** The check's own stages once the questions are confirmed, as the backend names them; texts in messages/FirstRun.steps. */
export const FIRST_RUN_STEPS = ["asking", "reading_answers"] as const;

/** How many questions without the client the first statistics list. */
export const FIRST_RUN_MISSED = 5;
