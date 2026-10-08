import { useLocale, useTranslations } from "next-intl";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { headlineMetrics, lowerIsBetter, outOf100, ownSourceShare } from "@/shared/helpers/scores";
import { percentIn } from "@/shared/helpers/sources";
import type { Report } from "@/shared/types/api";
import type { Metric } from "@/shared/types/scores";
import { bestCompetitor, bestCompetitorSite } from "../helpers/report";
import { Change, ReportCard, ReportTable } from "./report-parts";

type Row = Metric | "usedAsSource";

/**
 * The report's five numbers as a scorecard: each with what it measures in a line, its value in this check
 * and in the previous one, the change, and the strongest competitor's value to measure against. On a phone
 * the previous value and the change move under the number.
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
  const rows: { row: Row; value: number | null; change: number | null; best: { name: string; value: number } | null }[] = [
    ...headlineMetrics(report.history, brand.id).map(({ metric, value, change }) => ({
      row: metric as Row,
      value,
      change: compared ? change : null,
      best: bestCompetitor(report, metric),
    })),
    { row: "usedAsSource", value: own, change: ownBefore === null ? null : own - ownBefore, best: bestCompetitorSite(report) },
  ];

  return (
    <ReportCard>
      <ReportTable
        head={
          <>
            <th scope="col">{t("metric")}</th>
            <th scope="col" className="w-24 sm:w-32">
              {t("now")}
            </th>
            <th scope="col" className="hidden w-32 sm:table-cell">
              {t("before")}
            </th>
            <th scope="col" className="hidden w-28 sm:table-cell">
              {t("change")}
            </th>
            <th scope="col" className="w-28 sm:w-44">
              {t("best")}
            </th>
          </>
        }
      >
        {rows.map(({ row, value, change, best }) => {
          const reversed = row !== "usedAsSource" && lowerIsBetter(row);
          return (
            <tr key={row} className="align-top">
              <th scope="row" className="text-left font-normal">
                <span className="block font-medium">{labels(row)}</span>
                <span className="block text-xs text-pretty text-muted-foreground">{t(`about.${row}`)}</span>
              </th>
              <td>
                <span className="block text-base font-semibold tabular-nums">{show(row, value)}</span>
                {change !== null && <Change change={change} lowerIsBetter={reversed} className="text-xs sm:hidden" />}
              </td>
              <td className="hidden text-muted-foreground tabular-nums sm:table-cell">
                {value !== null && change !== null ? show(row, value - change) : "—"}
              </td>
              <td className="hidden sm:table-cell">
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
            </tr>
          );
        })}
      </ReportTable>
    </ReportCard>
  );
}
