import type { Source } from "@/shared/types/api";

/** Whom a cited site works for: the client's own site, a site it is on, one it is missing from, a competitor's. */
export type SitePresence = "own" | "listed" | "missing" | "competitor";
/** Whom a cited page names: the client, only competitors, no tracked brand, or unknown (it couldn't be read). */
export type PagePresence = "you" | "rivals" | "nobody" | "unknown";

export interface PresenceRow<T extends string> {
  key: T;
  /** Citations: a site (or page) in an answer counts once. */
  count: number;
  /** Of all citations, 0–1. */
  share: number;
}

/** The citations added up by group, largest first; groups with none are left out. */
function rowsOf<T extends string>(items: { key: T; count: number }[]): PresenceRow<T>[] {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item.key, (counts.get(item.key) ?? 0) + item.count);
  return [...counts]
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * How the citations split by whether the sites work for the client, in the place of Peec's "domain types"
 * (the kinds of sites are on the Overview): an owner sees at once how much of what ChatGPT relies on is a
 * site they are missing from.
 */
export function sitePresence(sources: Source[]): PresenceRow<SitePresence>[] {
  const groupOf = (source: Source): SitePresence =>
    source.type === "own" ? "own" : source.type === "competitor" ? "competitor" : source.brandListed ? "listed" : "missing";
  return rowsOf(sources.map((source) => ({ key: groupOf(source), count: source.count })));
}

/** The same for the cited pages: whether each names the client, only competitors, or no tracked brand. */
export function pagePresence(sources: Source[], youId: string): PresenceRow<PagePresence>[] {
  const groupOf = (mentions: string[] | null): PagePresence =>
    mentions === null ? "unknown" : mentions.includes(youId) ? "you" : mentions.length > 0 ? "rivals" : "nobody";
  return rowsOf(sources.flatMap((source) => source.pages.map((page) => ({ key: groupOf(page.mentions), count: page.count }))));
}
