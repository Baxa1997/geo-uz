import { useLocale, useTranslations } from "next-intl";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { outOf100, rankedBrands, seriesBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Report } from "@/shared/types/api";
import { BlockTitle, Change, PercentBar, ReportCard, ReportTable } from "./report-parts";
import { ReportTrend } from "./report-trend";

/**
 * Where the client stands among the tracked brands: all of them in a table, the most visible first, on
 * the four numbers (the client's row marked; visibility also as a bar against the whole scale), and their
 * visibility over the checks as lines. A first check has no lines yet, and no change.
 */
export function CompetitivePosition({ report }: { report: Report }) {
  const t = useTranslations("Report.competitors");
  const labels = useTranslations("Kpi.labels");
  const locale = useLocale();
  const brands = seriesBrands(report.project);
  const colors = new Map(brands.map((brand) => [brand.id, brand.color]));
  const compared = report.history.length > 1;

  return (
    <div className="flex flex-col gap-3.5">
      <ReportCard className="@container print:break-inside-avoid">
        <ReportTable
          head={
            <>
              <th scope="col" className="w-9">
                #
              </th>
              <th scope="col">{t("brand")}</th>
              <th scope="col" className="w-20 @xl:w-48">
                {labels("visibility")}
              </th>
              <th scope="col" className="hidden w-18 @lg:table-cell">
                {t("change")}
              </th>
              <th scope="col" className="hidden w-28 @2xl:table-cell">
                {labels("shareOfVoice")}
              </th>
              <th scope="col" className="w-16 @lg:w-20">
                {labels("position")}
              </th>
              <th scope="col" className="hidden w-16 @lg:table-cell">
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
                <span className="flex items-center gap-2.5">
                  <PercentBar value={outOf100(score.visibility)} color={colors.get(brand.id)} className="hidden w-24 shrink-0 @xl:block" />
                  <span className="font-semibold tabular-nums">{formatPercent(score.visibility, locale)}</span>
                </span>
                {compared && <Change change={Math.round(score.trend * 100)} className="text-xs @lg:hidden" />}
              </td>
              <td className="hidden @lg:table-cell">
                <Change change={compared ? Math.round(score.trend * 100) : null} />
              </td>
              <td className="hidden tabular-nums @2xl:table-cell">{formatPercent(score.shareOfVoice, locale)}</td>
              <td className="tabular-nums">{score.avgPosition === null ? "—" : `#${formatDecimal(score.avgPosition, locale)}`}</td>
              <td className="hidden tabular-nums @lg:table-cell">{score.sentiment === null ? "—" : formatDecimal(score.sentiment, locale)}</td>
            </tr>
          ))}
        </ReportTable>
      </ReportCard>

      {compared && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle>{t("chart")}</BlockTitle>
          <ReportCard className="p-4">
            <ReportTrend history={report.history} brands={brands} label={t("chartLabel", { brands: brands.length, count: report.history.length })} youLabel={t("you")} />
          </ReportCard>
        </div>
      )}
    </div>
  );
}
