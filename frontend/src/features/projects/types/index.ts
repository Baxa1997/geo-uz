import type { CompetitorSuggestion, CreatePromptRequest } from "@/shared/types/api";

/** A brand as typed into the form, before it becomes a NewBrand. */
export interface BrandDraft {
  name: string;
  /** Comma-separated spellings. */
  aliases: string;
  domain: string;
}

/** The brand profile (onboarding step 2): what the backend read from the website, as edited. */
export interface SiteDraft {
  /** The analyzed domain; changing the address asks for a new analysis. */
  domain: string;
  name: string;
  aliases: string[];
  description: string;
  category: string;
  /** Two-letter country code. */
  country: string;
  /** "" when the business serves the whole country. */
  city: string;
  services: string[];
}

/** A topic in onboarding step 4: a suggested one (its code) or one the client typed in. */
export interface TopicDraft {
  topic: string;
  selected: boolean;
  custom: boolean;
}

/** Onboarding step 3: the suggested competitors with their ticks, and the ones typed in by hand. None is fine. */
export interface CompetitorChoice {
  suggestions: CompetitorSuggestion[];
  selected: boolean[];
  /** One per press of "Add manually". */
  manual: BrandDraft[];
}

/** A question in the onboarding list; unticked ones are not saved. */
export interface QuestionDraft extends CreatePromptRequest {
  key: string;
  selected: boolean;
}

/** Message keys (namespace Onboarding) of the wizard's errors. */
export type OnboardingErrorKey =
  | "websiteRequired"
  | "websiteInvalid"
  | "nameRequired"
  | "descriptionRequired"
  | "categoryRequired"
  | "servicesRequired"
  | "competitorsMax"
  | "manualNameRequired"
  | "manualDomainInvalid"
  | "manualDuplicate"
  | "topicsRequired"
  | "questionsRequired";

export type OnboardingErrors = Partial<
  Record<"website" | "name" | "description" | "category" | "services" | "competitors" | "manualName" | "manualDomain" | "topics" | "questions", OnboardingErrorKey>
>;
