import type { BrandDraft } from "../types";

/** The new-project form compares a brand with up to 3 competitors. */
export const COMPETITOR_SLOTS = 3;

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

/** The questions step's topic list: every ticked topic at once. */
export const ALL_TOPICS = "";

/** 40px tall inputs: comfortable touch targets on phones. */
export const INPUT_CLASS = "h-10";

/** How often the progress screen asks how the first run is going. */
export const RUN_POLL_MS = 1000;

/** A first run's stages in order, as the backend names them; texts in messages/FirstRun.steps. */
export const FIRST_RUN_STEPS = ["reading_site", "asking", "reading_answers"] as const;

/** How many questions without the client the first statistics list. */
export const FIRST_RUN_MISSED = 5;
