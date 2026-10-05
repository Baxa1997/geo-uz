import type { CompetitorSuggestion, CreatePromptRequest } from "@/shared/types/api";

/** A brand as typed into the form, before it becomes a NewBrand. */
export interface BrandDraft {
  name: string;
  /** Comma-separated spellings. */
  aliases: string;
  domain: string;
}

/** The brand setup as typed, before it becomes a CreateProjectRequest. */
export interface ProjectDraft {
  brand: BrandDraft;
  category: string;
  city: string;
  competitors: BrandDraft[];
}

/** Message keys (namespace NewProject) of field errors. */
export type DraftErrorKey = "nameRequired" | "domainInvalid" | "competitorRequired" | "competitorName";

/** Field errors by field: "name", "domain", "competitors", "competitor-0-name", … */
export type DraftErrors = Record<string, DraftErrorKey>;

/** The brand profile (onboarding step 2): what the backend read from the website, as edited. */
export interface SiteDraft {
  /** The analyzed domain; changing the address asks for a new analysis. */
  domain: string;
  name: string;
  aliases: string[];
  description: string;
  category: string;
  city: string;
  services: string[];
}

/** A topic in onboarding step 4: a suggested one (its code) or one the client typed in. */
export interface TopicDraft {
  topic: string;
  selected: boolean;
  custom: boolean;
}

/** Onboarding step 2: the suggested competitors with their ticks, and one typed in by hand. */
export interface CompetitorChoice {
  suggestions: CompetitorSuggestion[];
  selected: boolean[];
  /** Null until "Add manually" is pressed. */
  manual: BrandDraft | null;
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
  | "competitorRequired"
  | "competitorsMax"
  | "manualNameRequired"
  | "manualDomainInvalid"
  | "manualDuplicate"
  | "topicsRequired"
  | "questionsRequired";

export type OnboardingErrors = Partial<
  Record<"website" | "name" | "competitors" | "manualName" | "manualDomain" | "topics" | "questions", OnboardingErrorKey>
>;
