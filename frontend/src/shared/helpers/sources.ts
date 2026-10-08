import type { SourceHistoryPoint } from "@/shared/types/api";

/** Answers of a check that cite a site, or one page of it; 0 when the check didn't cite it. */
export function citingIn(point: SourceHistoryPoint | undefined, domain: string, url?: string): number {
  const source = point?.sources.find((candidate) => candidate.domain === domain);
  if (!source) return 0;
  return url ? (source.pages.find((page) => page.url === url)?.count ?? 0) : source.count;
}

/** The same as a share of the check's answers, in percent as shown (a whole number). */
export function percentIn(point: SourceHistoryPoint | undefined, domain: string, url?: string): number {
  return point && point.answers > 0 ? Math.round((citingIn(point, domain, url) / point.answers) * 100) : 0;
}
