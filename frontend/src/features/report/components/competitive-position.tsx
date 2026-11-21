import { useTranslations } from "next-intl";
import { seriesBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Report, WaveMetrics } from "@/shared/types/api";
import { useCountWords } from "@/shared/hooks/use-count-words";
import { BlockTitle, PercentBar, ReportCard, ReportTable, Share } from "./report-parts";
import { ReportTrend } from "./report-trend";

/**
 * Where the client stands among the tracked brands (report spec §4.4, Phase 0 item 0.2): every one of them,
 * the most named first, each with the buyers' answers that name it, its rank (brands named equally often
 * share it, a brand named nowhere has none), its tone per mention, its place where an answer lists brands in
 * a numbered list, and its share of voice once the brands are mentioned often enough. Their visibility over
 * the checks follows as lines from the second check.
 */
export function CompetitivePosition({ report, metrics }: { report: Report; metrics: WaveMetrics }) {
  const t = useTranslations("Report.competitors");
  const words = useCountWords();
  const brands = seriesBrands(report.project);
  const colors = new Map(brands.map((brand) => [brand.id, brand.color]));
  const compared = report.history.length > 1;
  const { share_of_voice: share } = metrics.brands;
  // The most named first; the client first among those named as often, then the project's order
  const rows = [...metrics.brands.rows].sort((a, b) => b.named - a.named || Number(b.own) - Number(a.own));

  return (
    <div className="flex flex-col gap-3.5">
      <ReportCard className="@container print:break-inside-avoid">
        <ReportTable
          head={
            <>
              <th scope="col" className="w-24 @lg:w-28">
                {t("rank")}
              </th>
              <th scope="col">{t("brand")}</th>
              <th scope="col" className="w-24 @xl:w-48">
                {t("named")}
              </th>
              <th scope="col" className="hidden w-32 @lg:table-cell">
                {t("tone")}
              </th>
              <th scope="col" className="hidden w-36 @2xl:table-cell">
                {t("position")}
              </th>
              {share.shown && (
                <th scope="col" className="hidden w-28 @2xl:table-cell">
                  {t("shareOfVoice")}
                </th>
              )}
            </>
          }
        >
          {rows.map((row) => (
            <tr key={row.id} className={cn("align-top", row.own && "bg-you-soft/40")}>
              <td className="pl-4! text-muted-foreground">
                <span data-metric={`brand.${row.id}.rank`}>{words.rank(row)}</span>
              </td>
              <th scope="row" className="text-left">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colors.get(row.id) }} />
                  <span className={cn("truncate", row.own ? "font-semibold" : "font-medium")}>
                    {row.name}
                    {row.own && <span className="font-normal text-muted-foreground"> · {t("you")}</span>}
                  </span>
                </span>
                {/* Narrow: tone and place under the name */}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground @lg:hidden">{words.tone(row)}</span>
              </th>
              <td>
                <span className="flex items-center gap-2.5">
                  <PercentBar value={row.answers > 0 ? (row.named / row.answers) * 100 : 0} color={colors.get(row.id)} className="hidden w-24 shrink-0 @xl:block" />
                  <span data-metric={`brand.${row.id}.mentions`} data-k={row.named} data-n={row.answers} className="font-semibold tabular-nums">
                    {words.fraction(row.named, row.answers)}
                  </span>
                </span>
              </td>
              <td className="hidden @lg:table-cell">
                <span data-metric={`brand.${row.id}.sentiment`}>{words.tone(row)}</span>
              </td>
              <td className="hidden @2xl:table-cell">
                <span data-metric={`brand.${row.id}.position`}>{words.position(row)}</span>
              </td>
              {share.shown && <td className="hidden tabular-nums @2xl:table-cell">{share.shares?.[row.id] ? <Share k={share.shares[row.id]?.k ?? 0} n={share.shares[row.id]?.n ?? 0} /> : words.na}</td>}
            </tr>
          ))}
        </ReportTable>
      </ReportCard>
      {!share.shown && <p className="text-xs text-pretty text-muted-foreground">{t("noShareOfVoice", { mentions: share.mentions, minimum: share.minimum })}</p>}

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
