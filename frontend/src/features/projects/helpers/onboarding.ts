import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import type { BrandQuestion, CompetitorSuggestion, CreateProjectRequest, FirstRunResult, PromptSuggestion, SiteAnalysis } from "@/shared/types/api";
import { DEFAULT_COUNTRY } from "@/shared/constants/countries";
import { BRAND_QUESTION_TEMPLATES, MAX_BRAND_QUESTIONS, MAX_COMPETITORS, OWN_QUESTION_TOPIC, PRESELECTED_COMPETITORS } from "../constants";
import type { BrandDraft, BrandQuestionDraft, CompetitorChoice, OnboardingErrorKey, OnboardingErrors, QuestionDraft, SiteDraft, TopicDraft } from "../types";
import { isFilled, toNewBrand } from "./brand-draft";

export const siteDraft = (analysis: SiteAnalysis): SiteDraft => ({
  domain: analysis.domain,
  name: analysis.name,
  aliases: analysis.aliases,
  description: analysis.description,
  category: analysis.category,
  country: analysis.country || DEFAULT_COUNTRY,
  city: analysis.city,
  services: analysis.services,
});

/**
 * The wizard's first answers from a first run, so nothing is asked twice: the profile read from the website,
 * the businesses the answers named beside the client as competitors, and the questions that were asked.
 * `inputs` are what the wizard compares before asking the backend again (see OnboardingWizard).
 */
export function draftsFromFirstRun(run: FirstRunResult) {
  const site: SiteDraft = {
    domain: run.domain,
    name: run.brand.name,
    aliases: run.brand.aliases,
    description: run.description,
    category: run.category,
    country: run.country || DEFAULT_COUNTRY,
    city: run.city,
    services: run.services,
  };
  const questions = questionDrafts(run.prompts.map(({ prompt }) => ({ text: prompt.text, language: prompt.language, topic: prompt.topic })));
  return {
    site,
    // Every generated brand question starts ticked, the general ones first
    brandQuestions: run.brandQuestions ? brandQuestionDrafts(run.brandQuestions) : null,
    choice: {
      ...competitorChoice(run.competitors.map(({ name, aliases, domain }) => ({ name, aliases, domain }))),
      inputs: JSON.stringify([site.domain, site.category, site.country, site.city]),
    },
    suggested: { questions, topics: topicDrafts(questions), inputs: JSON.stringify([site.category, site.country, site.city, site.services]) },
  };
}

export const brandQuestionDrafts = (questions: BrandQuestion[]): BrandQuestionDraft[] =>
  questions.slice(0, MAX_BRAND_QUESTIONS).map(({ text, language }, index) => ({ key: `generated-${index}`, text, language, selected: true }));

/** Without a first run: the two general brand questions, written with the business's name and city. */
export const generalBrandQuestions = (name: string, city: string): BrandQuestionDraft[] =>
  brandQuestionDrafts(
    (["ru", "uz"] as const).map((language) => ({
      language,
      text: BRAND_QUESTION_TEMPLATES[language].replace("{name}", name.trim()).replace("{place}", city.trim() ? ` (${city.trim()})` : ""),
    })),
  );

/** The most relevant suggestions start ticked. */
export const competitorChoice = (suggestions: CompetitorSuggestion[]): CompetitorChoice => ({
  suggestions,
  selected: suggestions.map((_, index) => index < PRESELECTED_COMPETITORS),
  manual: [],
});

/** Every suggested question starts ticked. */
export const questionDrafts = (suggestions: PromptSuggestion[]): QuestionDraft[] =>
  suggestions.map((suggestion, index) => ({ ...suggestion, key: `suggested-${index}`, selected: true }));

/** The suggested questions' topics, in the order they first appear, all ticked. */
export const topicDrafts = (questions: QuestionDraft[]): TopicDraft[] =>
  [...new Set(questions.map((question) => question.topic))].map((topic) => ({ topic, selected: true, custom: false }));

/** Questions by topic, topics in the order they first appear. */
export function groupByTopic(questions: QuestionDraft[]): { topic: string; questions: QuestionDraft[] }[] {
  const topics = [...new Set(questions.map((question) => question.topic))];
  return topics.map((topic) => ({ topic, questions: questions.filter((question) => question.topic === topic) }));
}

/** The questions step shows those in a ticked topic, and the client's own ones without a topic. */
export function questionsInTopics(questions: QuestionDraft[], topics: TopicDraft[]): QuestionDraft[] {
  const ticked = new Set(topics.filter((topic) => topic.selected).map((topic) => topic.topic));
  return questions.filter((question) => ticked.has(question.topic) || question.topic === OWN_QUESTION_TOPIC);
}

/** Ticked suggestions plus the ones typed in by hand (a row left empty doesn't count). */
export const chosenCount = ({ selected, manual }: CompetitorChoice) => selected.filter(Boolean).length + manual.filter(isFilled).length;

export function validateWebsite(website: string): OnboardingErrors {
  const domain = normalizeDomain(website);
  if (!domain) return { website: "websiteRequired" };
  return isValidDomain(domain) ? {} : { website: "websiteInvalid" };
}

/**
 * The profile's fields are needed (the user's rule, 15 Nov): the questions and the fixes are written from
 * them. Other spellings and the city stay optional: a business may serve its whole country.
 */
export function validateSite(site: SiteDraft): OnboardingErrors {
  const errors: OnboardingErrors = {};
  if (!site.name.trim()) errors.name = "nameRequired";
  if (!site.description.trim()) errors.description = "descriptionRequired";
  if (!site.category.trim()) errors.category = "categoryRequired";
  if (site.services.length === 0) errors.services = "servicesRequired";
  return errors;
}

/** What is wrong with a competitor typed in by hand: it needs a name, a valid website if any, and mustn't repeat another. */
export function manualProblems(choice: CompetitorChoice, index: number): { name?: OnboardingErrorKey; domain?: OnboardingErrorKey } {
  const draft: BrandDraft = choice.manual[index];
  if (!isFilled(draft)) return {};
  const name = draft.name.trim().toLowerCase();
  const domain = normalizeDomain(draft.domain);
  const repeats =
    choice.suggestions.some((s) => s.name.toLowerCase() === name || (domain && s.domain === domain)) ||
    choice.manual.some((other, i) => i < index && other.name.trim().toLowerCase() === name);
  return {
    ...(!name ? { name: "manualNameRequired" as const } : repeats ? { name: "manualDuplicate" as const } : {}),
    ...(domain && !isValidDomain(domain) ? { domain: "manualDomainInvalid" as const } : {}),
  };
}

/** Competitors are optional (the user's rule, 15 Nov): none to 5, and each typed in by hand has to be sound. */
export function validateChoice(choice: CompetitorChoice): OnboardingErrors {
  const errors: OnboardingErrors = {};
  if (chosenCount(choice) > MAX_COMPETITORS) errors.competitors = "competitorsMax";
  for (const index of choice.manual.keys()) {
    const { name, domain } = manualProblems(choice, index);
    if (name) errors.manualName ??= name;
    if (domain) errors.manualDomain ??= domain;
  }
  return errors;
}

export const validateTopics = (topics: TopicDraft[]): OnboardingErrors =>
  topics.some((topic) => topic.selected) ? {} : { topics: "topicsRequired" };

export const validateQuestions = (questions: QuestionDraft[], topics: TopicDraft[]): OnboardingErrors =>
  questionsInTopics(questions, topics).some((question) => question.selected) ? {} : { questions: "questionsRequired" };

export const onboardingRequest = (
  site: SiteDraft,
  choice: CompetitorChoice,
  topics: TopicDraft[],
  questions: QuestionDraft[],
  brandQuestions: BrandQuestionDraft[] | null = null,
): CreateProjectRequest => ({
  ...(brandQuestions ? { brandQuestions: brandQuestions.filter((question) => question.selected).map(({ text, language }) => ({ text, language })) } : {}),
  name: site.name.trim(),
  aliases: site.aliases,
  domain: site.domain,
  category: site.category,
  country: site.country,
  city: site.city.trim(),
  description: site.description.trim(),
  services: site.services,
  competitors: [
    ...choice.suggestions.filter((_, index) => choice.selected[index]),
    ...choice.manual.filter(isFilled).map(toNewBrand),
  ],
  prompts: questionsInTopics(questions, topics)
    .filter((question) => question.selected)
    .map(({ text, language, topic }) => ({ text, language, topic })),
});
