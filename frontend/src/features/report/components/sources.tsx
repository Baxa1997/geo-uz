import { CheckCircleIcon as CircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { XCircleIcon as CircleX } from "@phosphor-icons/react/dist/ssr/XCircle";
import { useTranslations } from "next-intl";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { shareOf, useCountWords } from "@/shared/hooks/use-count-words";
import type { SitePart, WaveMetrics } from "@/shared/types/api";
import { BlockTitle, PercentBar, ReportCard, ReportTable, Share } from "./report-parts";

/** The sites the report lists; the rest are counted under the table. */
const SITES_SHOWN = 8;

/** Whom a cited site works for, for the client: the four parts of the split bar, in its order. */
const SPLIT: { key: SitePart; color: string }[] = [
  { key: "own", color: "var(--you)" },
  { key: "listed", color: "var(--positive)" },
  { key: "missing", color: "var(--negative)" },
  { key: "competitors", color: "var(--rival)" },
];

/**
 * The sites AI relies on, from the check's data object (Phase 0 item 0.3). First the cited sites split by
 * whether they work for the client (its own site, sites that list it, sites that don't, competitors' sites),
 * counted in sites, as one bar with its legend; then the most cited sites, each with its kind, the answers
 * citing it (once an answer) of the answers that cite any site (spec §6.3) as a bar, and whether the client
 * is on it (its own site and competitors' sites say so instead). Every share stands beside its count.
 */
export function Sources({ metrics }: { metrics: WaveMetrics }) {
  const t = useTranslations("Report.sources");
  const types = useTranslations("SourcesPage.types");
  const words = useCountWords();
  const { sources } = metrics;
  const shown = sources.rows.slice(0, SITES_SHOWN);
  const split = SPLIT.flatMap(({ key, color }) => {
    const sites = sources.split[key] ?? 0;
    return sites > 0 ? [{ key, color, sites }] : [];
  });

  return (
    <div className="flex flex-col gap-3.5">
      {split.length > 0 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle>{t("split")}</BlockTitle>
          <ReportCard className="flex flex-col gap-3 p-4">
            <div
              role="img"
              aria-label={t("splitLabel", { parts: split.map((part) => `${t(`parts.${part.key}`)}: ${t("sitesOf", { count: part.sites, total: sources.sites })}`).join(", ") })}
              className="flex h-3 gap-0.5 overflow-hidden rounded-full"
            >
              {split.map((part) => (
                <span key={part.key} className="h-full min-w-1" style={{ width: `${(part.sites / sources.sites) * 100}%`, background: part.color }} />
              ))}
            </div>
            <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 print:grid-cols-2">
              {split.map((part) => (
                <li key={part.key} className="flex items-baseline gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 translate-y-px rounded-[3px]" style={{ background: part.color }} />
                  <span className="min-w-0 flex-1 text-pretty">{t(`parts.${part.key}`)}</span>
                  <Share k={part.sites} n={sources.sites} text={`${t("sitesOf", { count: part.sites, total: sources.sites })} · ${words.percent(part.sites, sources.sites)}`} className="font-semibold" />
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
                      <PercentBar value={shareOf(source.cited, sources.cited_answers) ?? 0} color="var(--rival-strong)" className="hidden w-20 shrink-0 @xl:block" />
                      <Share k={source.cited} n={sources.cited_answers} className="font-semibold whitespace-nowrap" />
                    </span>
                  </td>
                  <td>
                    {source.type === "own" || source.type === "competitor" ? (
                      <span className="text-muted-foreground">{t(source.type)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {source.listed ? <CircleCheck aria-hidden className="size-4 text-positive" /> : <CircleX aria-hidden className="size-4 text-negative" />}
                        {t(source.listed ? "listed" : "notListed")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </ReportTable>
          <p className="border-t px-4 py-2 text-xs text-pretty text-muted-foreground">
            {t("usedOf", { answers: sources.cited_answers })}
            {sources.rows.length > SITES_SHOWN && ` ${t("more", { count: sources.rows.length - SITES_SHOWN })}`}
          </p>
        </ReportCard>
      </div>
    </div>
  );
}
