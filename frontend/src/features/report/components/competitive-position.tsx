import { useLocale, useTranslations } from "next-intl";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { rankedBrands, seriesBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Report } from "@/shared/types/api";
import { Change, ReportCard, ReportTable } from "./report-parts";
import { ReportTrend } from "./report-trend";

/**
 * Where the client stands among the tracked brands: all of them in a table, the most visible first, on
 * the four numbers (the client's row marked), and their visibility over the checks as lines. A first check
 * has no lines yet, and no change.
 */
export function CompetitivePosition({ report }: { report: Report }) {
  const t = useTranslations("Report.competitors");
  const labels = useTranslations("Kpi.labels");
  const locale = useLocale();
  const brands = seriesBrands(report.project);
  const colors = new Map(brands.map((brand) => [brand.id, brand.color]));
  const compared = report.history.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <ReportCard>
        <ReportTable
          head={
            <>
              <th scope="col" className="w-9">
                #
              </th>
              <th scope="col">{t("brand")}</th>
              <th scope="col" className="w-24 sm:w-28">
                {labels("visibility")}
              </th>
              <th scope="col" className="hidden w-28 sm:table-cell">
                {t("change")}
              </th>
              <th scope="col" className="hidden w-28 sm:table-cell">
                {labels("shareOfVoice")}
              </th>
              <th scope="col" className="w-16 sm:w-20">
                {labels("position")}
              </th>
              <th scope="col" className="hidden w-20 sm:table-cell">
                {labels("sentiment")}
              </th>
            </>
          }
        >
          {rankedBrands(report).map(({ brand, score, isYou }, index) => (
            <tr key={brand.id} className={cn(isYou && "bg-you-soft/40")}>
              <td className="pl-4! text-muted-foreground tabular-nums">{index + 1}</td>
              <th scope="row" className="text-left">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colors.get(brand.id) }} />
                  <span className={cn("truncate", isYou ? "font-semibold" : "font-medium")}>
                    {brand.name}
                    {isYou && <span className="font-normal text-muted-foreground"> · {t("you")}</span>}
                  </span>
                </span>
              </th>
              <td>
                <span className="block font-semibold tabular-nums">{formatPercent(score.visibility, locale)}</span>
                {compared && <Change change={Math.round(score.trend * 100)} className="text-xs sm:hidden" />}
              </td>
              <td className="hidden sm:table-cell">
                <Change change={compared ? Math.round(score.trend * 100) : null} />
              </td>
              <td className="hidden tabular-nums sm:table-cell">{formatPercent(score.shareOfVoice, locale)}</td>
              <td className="tabular-nums">{score.avgPosition === null ? "—" : `#${formatDecimal(score.avgPosition, locale)}`}</td>
              <td className="hidden tabular-nums sm:table-cell">{score.sentiment === null ? "—" : formatDecimal(score.sentiment, locale)}</td>
            </tr>
          ))}
        </ReportTable>
      </ReportCard>

      {compared && (
        <ReportCard className="flex flex-col gap-3 p-4 print:break-inside-avoid">
          <h3 className="text-sm font-medium">{t("chart")}</h3>
          <ReportTrend history={report.history} brands={brands} label={t("chartLabel", { brands: brands.length, count: report.history.length })} youLabel={t("you")} />
        </ReportCard>
      )}
    </div>
  );
}
