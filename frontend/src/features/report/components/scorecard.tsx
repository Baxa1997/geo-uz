import { useLocale, useTranslations } from "next-intl";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { headlineMetrics, lowerIsBetter, metricValue, outOf100, ownSourceShare, scoreOf } from "@/shared/helpers/scores";
import { percentIn } from "@/shared/helpers/sources";
import { cn } from "@/shared/helpers/utils";
import type { Report } from "@/shared/types/api";
import type { Metric } from "@/shared/types/scores";
import { bestCompetitor, bestCompetitorSite } from "../helpers/report";
import { Change, ReportCard, ReportTable } from "./report-parts";
import { SparkLine } from "./spark-line";

type Row = Metric | "usedAsSource";

/**
 * The report's five numbers as a scorecard: each with what it measures in a line, its value in this check
 * and in the previous one, the change, the strongest competitor's value with how far ahead or behind the
 * client is, and its line over the checks. A narrow sheet (a phone) keeps the number, the change under it
 * and the competitor; the other columns come as the sheet widens.
 */
export function Scorecard({ report }: { report: Report }) {
  const t = useTranslations("Report.scorecard");
  const labels = useTranslations("Kpi.labels");
  const locale = useLocale();
  const { brand } = report.project;
  const compared = report.history.length > 1;

  const show = (row: Row, value: number | null) =>
    value === null
      ? t("notNamed")
      : row === "position"
        ? `#${formatDecimal(value, locale)}`
        : row === "sentiment"
          ? `${formatDecimal(value, locale)}/100`
          : formatPercent(value / 100, locale);

  const own = outOf100(ownSourceShare(report.prompts, brand.domain));
  const ownBefore = compared ? percentIn(report.sourceHistory.at(-2), brand.domain) : null;
  const rows: { row: Row; value: number | null; change: number | null; best: { name: string; value: number } | null; series: (number | null)[] }[] = [
    ...headlineMetrics(report.history, brand.id).map(({ metric, value, change }) => ({
      row: metric as Row,
      value,
      change: compared ? change : null,
      best: bestCompetitor(report, metric),
      series: report.history.map((point) => metricValue(scoreOf(point.scores, brand.id), metric)),
    })),
    {
      row: "usedAsSource",
      value: own,
      change: ownBefore === null ? null : own - ownBefore,
      best: bestCompetitorSite(report),
      // The latest check's share is counted from the answers themselves, as the number beside it is
      series: report.sourceHistory.map((point, index, points) => (index === points.length - 1 ? own : percentIn(point, brand.domain))),
    },
  ];

  return (
    // The columns follow the sheet's own width, not the screen's: beside the contents, and on paper
    <ReportCard className="@container print:break-inside-avoid">
      <ReportTable
        head={
          <>
            <th scope="col">{t("metric")}</th>
            <th scope="col" className="w-20">
              {t("now")}
            </th>
            <th scope="col" className="hidden w-20 @3xl:table-cell">
              {t("before")}
            </th>
            <th scope="col" className="hidden w-18 @lg:table-cell">
              {t("change")}
            </th>
            <th scope="col" className="w-28 @lg:w-32">
              {t("best")}
            </th>
            <th scope="col" className="hidden w-26 @xl:table-cell">
              {t("gap")}
            </th>
            {compared && (
              <th scope="col" className="hidden w-22 @2xl:table-cell">
                {t("trend")}
              </th>
            )}
          </>
        }
      >
        {rows.map(({ row, value, change, best, series }) => {
          const reversed = row !== "usedAsSource" && lowerIsBetter(row);
          // How far the client is ahead of the strongest competitor: for position, a smaller number is ahead
          const lead = value === null || !best ? null : reversed ? best.value - value : value - best.value;
          const amount = lead === null ? "" : formatDecimal(Math.abs(lead), locale);
          return (
            <tr key={row} className="align-top">
              <th scope="row" className="text-left font-normal">
                <span className="block font-medium">{labels(row)}</span>
                <span className="block text-xs text-pretty text-muted-foreground">{t(`about.${row}`)}</span>
              </th>
              <td>
                <span className="block text-base font-semibold tabular-nums">{show(row, value)}</span>
                {change !== null && <Change change={change} lowerIsBetter={reversed} className="text-xs @lg:hidden" />}
              </td>
              <td className="hidden text-muted-foreground tabular-nums @3xl:table-cell">
                {value !== null && change !== null ? show(row, value - change) : "—"}
              </td>
              <td className="hidden @lg:table-cell">
                <Change change={change} lowerIsBetter={reversed} />
              </td>
              <td>
                {best ? (
                  <>
                    <span className="block tabular-nums">{show(row, best.value)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{best.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="hidden @xl:table-cell">
                {lead === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : amount === "0" ? (
                  <span className="text-muted-foreground">{t("level")}</span>
                ) : (
                  <span className={cn("font-medium whitespace-nowrap", lead > 0 ? "text-better" : "text-worse")}>{t(lead > 0 ? "ahead" : "behind", { amount })}</span>
                )}
              </td>
              {compared && (
                <td className="hidden @2xl:table-cell">
                  <SparkLine
                    values={series}
                    lowerIsBetter={reversed}
                    label={t("trendLabel", { metric: labels(row), count: series.length, from: show(row, series[0] ?? null), to: show(row, value) })}
                  />
                </td>
              )}
            </tr>
          );
        })}
      </ReportTable>
    </ReportCard>
  );
}
