import { listingKind } from "@/shared/components/actions/action-title";
import type { Action, ActionImpact, SourceType } from "@/shared/types/api";

/**
 * What to do, a level under the goal, as Peec's "Technical SEO fix" and "AI agent readiness": a listing
 * by the kind of site, a page to write or one to rework, the AI bots let in or the site's facts made
 * readable. Labels in messages/Actions.categories.
 */
export type Category = "fact" | "directory" | "news" | "social" | "other" | "newPage" | "rework" | "access" | "markup";

export const CATEGORIES: Category[] = ["fact", "directory", "news", "social", "other", "newPage", "rework", "access", "markup"];

export function categoryOf(action: Action): Category {
  switch (action.kind) {
    case "fact":
      return "fact";
    case "listing":
      return listingKind(action.sourceType);
    case "content":
      return action.url !== null || action.pageType !== null ? "rework" : "newPage";
    case "technical":
      return action.check === "ai_bots_blocked" ? "access" : "markup";
  }
}

/**
 * Where the work is done, as Peec's "owned vs earned": on the client's own website, on other sites, or
 * both (a wrong fact is corrected on the site and wherever ChatGPT read it). Labels in messages/Actions.owners.
 */
export type Owner = "own" | "earned" | "everywhere";

export const OWNERS: Owner[] = ["own", "earned", "everywhere"];

export const ownerOf = (action: Action): Owner => (action.kind === "listing" ? "earned" : action.kind === "fact" ? "everywhere" : "own");

/** An action's topic: its page's, or the commonest among its questions'; null when it has no question. */
export function topicOf(action: Action, topicOfPrompt: Map<string, string>): string | null {
  if (action.kind === "content") return action.topic;
  const counts = new Map<string, number>();
  for (const promptId of action.promptIds) {
    const topic = topicOfPrompt.get(promptId);
    if (topic) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** How the list is grouped under each status, as Peec's "Group by". Labels in messages/Actions.groupBy. */
export type GroupBy = "goal" | "category" | "impact" | "owner" | "topic";

export const GROUP_BYS: GroupBy[] = ["goal", "category", "impact", "owner", "topic"];

export const IMPACTS: ActionImpact[] = ["high", "medium", "low"];

/** The filters of "All filters"; an empty list lets everything through. */
export interface ActionFilters {
  topics: string[];
  owners: Owner[];
  sourceTypes: SourceType[];
  categories: Category[];
}

export const NO_FILTERS: ActionFilters = { topics: [], owners: [], sourceTypes: [], categories: [] };

export const filterCount = (filters: ActionFilters) => filters.topics.length + filters.owners.length + filters.sourceTypes.length + filters.categories.length;

/** Whether an action passes the filters; a site-kind filter keeps only listings of those kinds. */
export function passes(action: Action, filters: ActionFilters, topic: string | null): boolean {
  if (filters.topics.length > 0 && (!topic || !filters.topics.includes(topic))) return false;
  if (filters.owners.length > 0 && !filters.owners.includes(ownerOf(action))) return false;
  if (filters.sourceTypes.length > 0 && (action.kind !== "listing" || !filters.sourceTypes.includes(listingKind(action.sourceType)))) return false;
  if (filters.categories.length > 0 && !filters.categories.includes(categoryOf(action))) return false;
  return true;
}
