import { periodKey, type Grain } from "@/shared/helpers/history";
import type { SourceHistoryPoint } from "@/shared/types/api";

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
