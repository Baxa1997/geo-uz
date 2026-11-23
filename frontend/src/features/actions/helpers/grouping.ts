import { listingKind } from "@/shared/components/actions/action-title";
import type { Action } from "@/shared/types/api";

/**
 * What to do, a level under the goal, as Peec's "Technical SEO fix" and "AI agent readiness": a listing
 * by the kind of site, a page to write or one to rework, the AI bots let in or the site's facts made
 * readable (the export's "category" column). Labels in messages/Actions.categories.
 */
export type Category = "fact" | "directory" | "news" | "social" | "other" | "newPage" | "rework" | "access" | "markup";

export function categoryOf(action: Action): Category {
  switch (action.kind) {
    case "fact":
      return "fact";
    case "listing":
      return listingKind(action.sourceType);
    case "content":
      return action.url !== null || action.pageType !== null ? "rework" : "newPage";
    case "technical":
      // Every fix on the website, the SEO audit's of 23 Nov 2026 too, is "markup": the page and rework categories
      // carry wording about one topic's questions, which a site-wide fix (a FAQ, prices) doesn't have
      return action.check === "ai_bots_blocked" ? "access" : "markup";
  }
}

/**
 * Where the work is done, as Peec's "owned vs earned": on the client's own website, on other sites, or
 * both (a wrong fact is corrected on the site and wherever ChatGPT read it). Labels in messages/Actions.owners.
 */
export type Owner = "own" | "earned" | "everywhere";

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
