import type { BrandScore, HistoryPoint } from "@/shared/types/api";
import { formatIsoDay } from "./dates";

/** How a chart groups the checks: each on its own day, one point per week, or one point per month. */
export type Grain = "day" | "week" | "month";

export const GRAINS: Grain[] = ["day", "week", "month"];

type Scored = Omit<BrandScore, "trend">;

/** The Monday of the week a day ("2026-09-30") falls in: "2026-09-28". Weeks start on Monday, like the weekly check. */
function monday(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** The period a check falls in: its day, the Monday of its week, or its month ("2026-09"), in the given time zone. */
export function periodKey(iso: string, grain: Grain, timeZone: string): string {
  const day = formatIsoDay(iso, timeZone);
  return grain === "day" ? day : grain === "week" ? monday(day) : day.slice(0, 7);
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * The checks as the chart's points, oldest first: one per day, week or month in the given time zone. A
 * period with several checks becomes one point with the mean of their numbers (a brand never named in a
 * check doesn't pull its position or tone down), dated by its latest check. With one check per period,
 * the points are the checks themselves.
 */
export function groupHistory(history: HistoryPoint[], grain: Grain, timeZone: string): HistoryPoint[] {
  const periods = new Map<string, HistoryPoint[]>();
  for (const point of history) {
    const key = periodKey(point.collectedAt, grain, timeZone);
    periods.set(key, [...(periods.get(key) ?? []), point]);
  }
  return [...periods.values()].flatMap((checks) => {
    const latest = checks.at(-1);
    if (!latest) return [];
    if (checks.length === 1) return [latest];
    const brandIds = [...new Set(checks.flatMap((check) => check.scores.map((score) => score.brandId)))];
    return [
      {
        collectedAt: latest.collectedAt,
        scores: brandIds.map((brandId): Scored => {
          const scores = checks.flatMap((check) => check.scores.filter((score) => score.brandId === brandId));
          const positions = scores.flatMap((score) => score.avgPosition ?? []);
          const tones = scores.flatMap((score) => score.sentiment ?? []);
          return {
            brandId,
            visibility: mean(scores.map((score) => score.visibility)),
            shareOfVoice: mean(scores.map((score) => score.shareOfVoice)),
            avgPosition: positions.length ? mean(positions) : null,
            sentiment: tones.length ? Math.round(mean(tones)) : null,
          };
        }),
      },
    ];
  });
}
