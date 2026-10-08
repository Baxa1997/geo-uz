import { CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { formatPercent } from "@/shared/helpers/numbers";
import { missingSources, ownSourceShare, totalAnswers } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { ReportCard, ReportTable } from "./report-parts";

/** The sites the report lists; the rest are counted under the table. */
const SITES_SHOWN = 8;

/**
 * The sites ChatGPT relies on most: each with its kind, the share of answers that cite it, and whether the
 * client is on it (its own site and competitors' sites say so instead). A sentence first: how often the
 * client's own site is cited, and how many of the other sites it is missing from.
 */
export function Sources({ report }: { report: Report }) {
  const t = useTranslations("Report.sources");
  const types = useTranslations("SourcesPage.types");
  const locale = useLocale();
  const { brand, competitors } = report.project;
  const total = totalAnswers(report.prompts);
  const shown = report.topSources.slice(0, SITES_SHOWN);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-pretty">
        {t("summary", {
          own: formatPercent(ownSourceShare(report.prompts, brand.domain), locale),
          missing: missingSources(report.topSources, competitors).length,
        })}
      </p>
      <ReportCard>
        <ReportTable
          head={
            <>
              <th scope="col" className="w-9">
                #
              </th>
              <th scope="col">{t("site")}</th>
              <th scope="col" className="hidden w-44 sm:table-cell">
                {t("kind")}
              </th>
              <th scope="col" className="w-20 sm:w-28">
                {t("used")}
              </th>
              <th scope="col" className="w-28 sm:w-40">
                {t("you")}
              </th>
            </>
          }
        >
          {shown.map((source, index) => (
            <tr key={source.domain}>
              <td className="pl-4! text-muted-foreground tabular-nums">{index + 1}</td>
              <th scope="row" className="text-left font-medium">
                <span className="block truncate">{source.domain}</span>
              </th>
              <td className="hidden sm:table-cell">
                <span className="inline-flex items-center gap-1.5">
                  <SourceTypeDot type={source.type} />
                  {types(source.type)}
                </span>
              </td>
              <td className="font-semibold tabular-nums">{formatPercent(total ? source.count / total : 0, locale)}</td>
              <td>
                {source.type === "own" || source.type === "competitor" ? (
                  // The kind's column says whose site it is; on a phone that column is hidden
                  <>
                    <span className="text-muted-foreground sm:hidden">{t(source.type)}</span>
                    <span className="hidden text-muted-foreground sm:inline">—</span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {source.brandListed ? <CircleCheck aria-hidden className="size-4 text-positive" /> : <CircleX aria-hidden className="size-4 text-negative" />}
                    {t(source.brandListed ? "listed" : "notListed")}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </ReportTable>
        {report.topSources.length > SITES_SHOWN && (
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">{t("more", { count: report.topSources.length - SITES_SHOWN })}</p>
        )}
      </ReportCard>
    </div>
  );
}
