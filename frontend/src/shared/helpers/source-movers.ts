import { percentIn } from "@/shared/helpers/sources";
import type { SourceHistoryPoint, SourceType } from "@/shared/types/api";

/** What a mover is: a whole site, or one page of a site (`url`). */
interface Cited {
  key: string;
  domain: string;
  url?: string;
  type: SourceType;
}

/** A site or a page whose use changed between the latest check and the one before it. */
export interface Mover extends Cited {
  /** Percent of answers citing it in the latest check, and in the one before. */
  now: number;
  before: number;
}

export interface Movers {
  /** The check the latest one is compared with. */
  comparedWith: string;
  /** Cited for the first time: no earlier check has it. */
  fresh: Mover[];
  /** Used more than last time, largest gain first. One that came back after a break is here too. */
  rising: Mover[];
  /** Used less than last time, largest loss first: down to 0% when the latest check didn't cite it at all. */
  falling: Mover[];
}

const sitesIn = (point: SourceHistoryPoint): Cited[] =>
  point.sources.map((source) => ({ key: source.domain, domain: source.domain, type: source.type }));

const pagesIn =
  (domain?: string) =>
  (point: SourceHistoryPoint): Cited[] =>
    point.sources
      .filter((source) => !domain || source.domain === domain)
      .flatMap((source) => source.pages.map((page) => ({ key: page.url, domain: source.domain, url: page.url, type: source.type })));

/**
 * What changed since the previous check, like Peec's domain and URL movers (its "Top" tab is left out:
 * the table under it is that list). Shares are compared as shown, in whole percent, so a row's numbers
 * add up. Null when there is no earlier check to compare with.
 */
function moversOf(history: SourceHistoryPoint[], citedIn: (point: SourceHistoryPoint) => Cited[]): Movers | null {
  const latest = history.at(-1);
  const previous = history.at(-2);
  if (!latest || !previous) return null;
  const earlier = new Set(history.slice(0, -1).flatMap((point) => citedIn(point).map((cited) => cited.key)));
  const all = new Map([...citedIn(previous), ...citedIn(latest)].map((cited) => [cited.key, cited]));
  const movers: Mover[] = [...all.values()].map((cited) => ({
    ...cited,
    now: percentIn(latest, cited.domain, cited.url),
    before: percentIn(previous, cited.domain, cited.url),
  }));
  const now = new Set(citedIn(latest).map((cited) => cited.key));
  const isFresh = (mover: Mover) => now.has(mover.key) && !earlier.has(mover.key);
  return {
    comparedWith: previous.collectedAt,
    fresh: movers.filter(isFresh).sort((a, b) => b.now - a.now),
    rising: movers.filter((mover) => mover.now > mover.before && !isFresh(mover)).sort((a, b) => b.now - b.before - (a.now - a.before) || b.now - a.now),
    falling: movers.filter((mover) => mover.now < mover.before).sort((a, b) => a.now - a.before - (b.now - b.before) || b.before - a.before),
  };
}

/** The cited sites that changed. */
export const siteMovers = (history: SourceHistoryPoint[]) => moversOf(history, sitesIn);

/** The cited pages that changed: of every site, or of one (`domain`). */
export const pageMovers = (history: SourceHistoryPoint[], domain?: string) => moversOf(history, pagesIn(domain));
