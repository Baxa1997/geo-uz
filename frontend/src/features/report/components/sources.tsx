import { CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { isListable } from "@/shared/helpers/condition";
import { formatPercent } from "@/shared/helpers/numbers";
import { totalAnswers } from "@/shared/helpers/scores";
import type { Report, Source } from "@/shared/types/api";
import { BlockTitle, PercentBar, ReportCard, ReportTable } from "./report-parts";

/** The sites the report lists; the rest are counted under the table. */
const SITES_SHOWN = 8;

/** Whose a citation is, for the client: the four parts of the split bar, in its order. */
const SPLIT = [
  { key: "own", color: "var(--you)", has: (source: Source) => source.type === "own" },
  { key: "listed", color: "var(--positive)", has: (source: Source) => isListable(source) && source.brandListed },
  { key: "missing", color: "var(--negative)", has: (source: Source) => isListable(source) && !source.brandListed },
  { key: "competitors", color: "var(--rival)", has: (source: Source) => source.type === "competitor" },
] as const;

/**
 * The sites ChatGPT relies on. First how its citations split by whether they work for the client (its own
 * site, sites that list it, sites that don't, competitors' sites) as one bar with its legend; then the most
 * cited sites, each with its kind, the share of answers that cite it as a bar, and whether the client is
 * on it (its own site and competitors' sites say so instead).
 */
export function Sources({ report }: { report: Report }) {
  const t = useTranslations("Report.sources");
  const types = useTranslations("SourcesPage.types");
  const locale = useLocale();
  const total = totalAnswers(report.prompts);
  const shown = report.topSources.slice(0, SITES_SHOWN);
  const citations = report.topSources.reduce((sum, source) => sum + source.count, 0);
  const split = SPLIT.map(({ key, color, has }) => {
    const sites = report.topSources.filter(has);
    return { key, color, sites: sites.length, share: citations ? sites.reduce((sum, source) => sum + source.count, 0) / citations : 0 };
  }).filter((part) => part.sites > 0);

  return (
    <div className="flex flex-col gap-3.5">
      {split.length > 0 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle>{t("split")}</BlockTitle>
          <ReportCard className="flex flex-col gap-3 p-4">
            <div
              role="img"
              aria-label={t("splitLabel", { parts: split.map((part) => `${t(`parts.${part.key}`)} ${formatPercent(part.share, locale)}`).join(", ") })}
              className="flex h-3 gap-0.5 overflow-hidden rounded-full"
            >
              {split.map((part) => (
                <span key={part.key} className="h-full min-w-1" style={{ width: `${part.share * 100}%`, background: part.color }} />
              ))}
            </div>
            <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 print:grid-cols-2">
              {split.map((part) => (
                <li key={part.key} className="flex items-baseline gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 translate-y-px rounded-[3px]" style={{ background: part.color }} />
                  <span className="min-w-0 flex-1 text-pretty">
                    {t(`parts.${part.key}`)}
                    <span className="text-muted-foreground"> · {t("sites", { count: part.sites })}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPercent(part.share, locale)}</span>
                </li>
              ))}
            </ul>
          </ReportCard>
        </div>
      )}

      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("top")}</BlockTitle>
        <ReportCard className="@container print:break-inside-avoid">
          <ReportTable
            head={
              <>
                <th scope="col" className="w-9">
                  #
                </th>
                <th scope="col">{t("site")}</th>
                <th scope="col" className="hidden w-44 @2xl:table-cell">
                  {t("kind")}
                </th>
                <th scope="col" className="w-16 @xl:w-44">
                  {t("used")}
                </th>
                <th scope="col" className="w-28 @lg:w-36">
                  {t("you")}
                </th>
              </>
            }
          >
            {shown.map((source, index) => {
              const used = total ? source.count / total : 0;
              return (
                <tr key={source.domain}>
                  <td className="pl-4! text-muted-foreground tabular-nums">{index + 1}</td>
                  <th scope="row" className="text-left font-medium">
                    <span className="block truncate">{source.domain}</span>
                  </th>
                  <td className="hidden @2xl:table-cell">
                    <span className="inline-flex items-center gap-1.5">
                      <SourceTypeDot type={source.type} />
                      {types(source.type)}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <PercentBar value={used * 100} color="var(--rival-strong)" className="hidden w-20 shrink-0 @xl:block" />
                      <span className="font-semibold tabular-nums">{formatPercent(used, locale)}</span>
                    </span>
                  </td>
                  <td>
                    {source.type === "own" || source.type === "competitor" ? (
                      <span className="text-muted-foreground">{t(source.type)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {source.brandListed ? <CircleCheck aria-hidden className="size-4 text-positive" /> : <CircleX aria-hidden className="size-4 text-negative" />}
                        {t(source.brandListed ? "listed" : "notListed")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </ReportTable>
          {report.topSources.length > SITES_SHOWN && (
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">{t("more", { count: report.topSources.length - SITES_SHOWN })}</p>
          )}
        </ReportCard>
      </div>
    </div>
  );
}
