import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import type {
  CompetitorSuggestion,
  CreateProjectRequest,
  PromptSuggestion,
  SiteAnalysis,
} from "@/shared/types/api";
import { MAX_COMPETITORS, OWN_QUESTION_TOPIC, PRESELECTED_COMPETITORS } from "../constants";
import type { CompetitorChoice, OnboardingErrors, QuestionDraft, SiteDraft, TopicDraft } from "../types";
import { isFilled, toNewBrand } from "./brand-draft";

export const siteDraft = (analysis: SiteAnalysis): SiteDraft => ({
  domain: analysis.domain,
  name: analysis.name,
  aliases: analysis.aliases,
  description: analysis.description,
  category: analysis.category,
  city: analysis.city,
  services: analysis.services,
});

/** The most relevant suggestions start ticked. */
export const competitorChoice = (suggestions: CompetitorSuggestion[]): CompetitorChoice => ({
  suggestions,
  selected: suggestions.map((_, index) => index < PRESELECTED_COMPETITORS),
  manual: null,
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

/** Ticked suggestions plus the manual one, if anything was typed into it. */
export const chosenCount = ({ selected, manual }: CompetitorChoice) =>
  selected.filter(Boolean).length + (manual && isFilled(manual) ? 1 : 0);

/** A chip's text as saved: single spaces, no repeats (case aside). */
export function addChip(values: string[], value: string): string[] {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || values.some((existing) => existing.toLowerCase() === text.toLowerCase())) return values;
  return [...values, text];
}

export function validateWebsite(website: string): OnboardingErrors {
  const domain = normalizeDomain(website);
  if (!domain) return { website: "websiteRequired" };
  return isValidDomain(domain) ? {} : { website: "websiteInvalid" };
}

export const validateSite = (site: SiteDraft): OnboardingErrors => (site.name.trim() ? {} : { name: "nameRequired" });

/** 1 to 5 competitors; the manual one needs a name, a valid website if any, and mustn't repeat a suggestion. */
export function validateChoice(choice: CompetitorChoice): OnboardingErrors {
  const errors: OnboardingErrors = {};
  const count = chosenCount(choice);
  if (count === 0) errors.competitors = "competitorRequired";
  if (count > MAX_COMPETITORS) errors.competitors = "competitorsMax";

  const { manual } = choice;
  if (!manual || !isFilled(manual)) return errors;
  const name = manual.name.trim().toLowerCase();
  const domain = normalizeDomain(manual.domain);
  if (!name) errors.manualName = "manualNameRequired";
  else if (choice.suggestions.some((s) => s.name.toLowerCase() === name || (domain && s.domain === domain))) {
    errors.manualName = "manualDuplicate";
  }
  if (domain && !isValidDomain(domain)) errors.manualDomain = "manualDomainInvalid";
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
): CreateProjectRequest => ({
  name: site.name.trim(),
  aliases: site.aliases,
  domain: site.domain,
  category: site.category,
  city: site.city,
  description: site.description.trim(),
  services: site.services,
  competitors: [
    ...choice.suggestions.filter((_, index) => choice.selected[index]),
    ...(choice.manual && isFilled(choice.manual) ? [toNewBrand(choice.manual)] : []),
  ],
  prompts: questionsInTopics(questions, topics)
    .filter((question) => question.selected)
    .map(({ text, language, topic }) => ({ text, language, topic })),
});
