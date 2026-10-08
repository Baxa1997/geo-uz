import { periodKey, type Grain } from "@/shared/helpers/history";
import { percentIn } from "@/shared/helpers/sources";
import type { SourceHistoryPoint, SourceType } from "@/shared/types/api";

/**
 * The checks as a chart's points, oldest first: one per day, week or month. A period with several checks
 * becomes one point over all their answers (the counts and the answers are added up), dated by its latest
 * check. With one check per period, the points are the checks themselves.
 */
export function groupSourceHistory(history: SourceHistoryPoint[], grain: Grain, timeZone: string): SourceHistoryPoint[] {
  const periods = new Map<string, SourceHistoryPoint[]>();
  for (const point of history) {
    const key = periodKey(point.collectedAt, grain, timeZone);
    periods.set(key, [...(periods.get(key) ?? []), point]);
  }
  return [...periods.values()].flatMap((checks) => {
    const latest = checks.at(-1);
    if (!latest) return [];
    if (checks.length === 1) return [latest];
    const sources = new Map<string, SourceHistoryPoint["sources"][number]>();
    for (const check of checks) {
      for (const source of check.sources) {
        const sum = sources.get(source.domain) ?? { domain: source.domain, type: source.type, count: 0, pages: [] };
        const pages = new Map(sum.pages.map((page) => [page.url, page.count]));
        for (const page of source.pages) pages.set(page.url, (pages.get(page.url) ?? 0) + page.count);
        sources.set(source.domain, { ...sum, count: sum.count + source.count, pages: [...pages].map(([url, count]) => ({ url, count })) });
      }
    }
    return [{ collectedAt: latest.collectedAt, answers: checks.reduce((sum, check) => sum + check.answers, 0), sources: [...sources.values()] }];
  });
}

/** A site whose use changed between the latest check and the one before it. */
export interface Mover {
  domain: string;
  type: SourceType;
  /** Percent of answers citing it in the latest check, and in the one before. */
  now: number;
  before: number;
}

export interface Movers {
  /** The check the latest one is compared with. */
  comparedWith: string;
  /** Used more than last time, largest gain first. A site that came back after a break is here too. */
  rising: Mover[];
  /** Used less than last time, largest loss first: down to 0% when the latest check didn't cite it at all. */
  falling: Mover[];
  /** Cited for the first time: no earlier check has it. */
  fresh: Mover[];
}

/**
 * What changed among the cited sites since the previous check, like Peec's domain movers (its "Top" tab is
 * left out: the table of sites under it is that list). Shares are compared as shown, in whole percent, so
 * a row's numbers add up. Null when there is no earlier check to compare with.
 */
export function sourceMovers(history: SourceHistoryPoint[]): Movers | null {
  const latest = history.at(-1);
  const previous = history.at(-2);
  if (!latest || !previous) return null;
  const earlier = new Set(history.slice(0, -1).flatMap((point) => point.sources.map((source) => source.domain)));
  const types = new Map([...previous.sources, ...latest.sources].map((source) => [source.domain, source.type]));
  const movers: Mover[] = [...types].map(([domain, type]) => ({
    domain,
    type,
    now: percentIn(latest, domain),
    before: percentIn(previous, domain),
  }));
  const cited = new Set(latest.sources.map((source) => source.domain));
  const isFresh = (mover: Mover) => cited.has(mover.domain) && !earlier.has(mover.domain);
  return {
    comparedWith: previous.collectedAt,
    rising: movers.filter((mover) => mover.now > mover.before && !isFresh(mover)).sort((a, b) => b.now - b.before - (a.now - a.before) || b.now - a.now),
    falling: movers.filter((mover) => mover.now < mover.before).sort((a, b) => a.now - a.before - (b.now - b.before) || b.before - a.before),
    fresh: movers.filter(isFresh).sort((a, b) => b.now - a.now),
  };
}
