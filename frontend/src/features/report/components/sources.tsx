import { ArrowSquareOutIcon as ExternalLink } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { CheckCircleIcon as CircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { XCircleIcon as CircleX } from "@phosphor-icons/react/dist/ssr/XCircle";
import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { shareOf, useCountWords } from "@/shared/hooks/use-count-words";
import type { DomainType, WaveMetrics, WaveSource } from "@/shared/types/api";
import { BlockTitle, PercentBar, ReportCard, ReportTable, Share } from "./report-parts";

/**
 * The spec's site types in the report's order, each with its color. The types a business can get onto share the
 * app's colors for directories, news and social sites; UGC and Telegram share one, as the spec groups them; the
 * types nobody acts on are gray, and an unclassified site the palest.
 */
export const DOMAIN_TYPES: { type: DomainType; color: string }[] = [
  { type: "client_owned", color: "var(--you)" },
  { type: "client_managed", color: "var(--you-soft)" },
  { type: "competitor_site", color: "var(--rival-strong)" },
  { type: "directory", color: "var(--source-directory)" },
  { type: "media", color: "var(--source-news)" },
  { type: "ugc", color: "var(--source-social)" },
  { type: "telegram", color: "var(--source-social)" },
  { type: "reference", color: "var(--rival)" },
  { type: "platform_docs", color: "var(--rival)" },
  { type: "unclassified", color: "var(--rival-soft)" },
];
const COLOR = Object.fromEntries(DOMAIN_TYPES.map(({ type, color }) => [type, color])) as Record<DomainType, string>;
/** The types a "get listed" step may name (spec §7): on these, whether the client is there is checked. */
const PLACEABLE: DomainType[] = ["directory", "media", "ugc", "telegram"];

function TypeDot({ type }: { type: DomainType }) {
  return <span aria-hidden className="size-2 shrink-0 rounded-full ring-1 ring-border ring-inset" style={{ background: COLOR[type] }} />;
}

/** Whether the client is on a site: its own and competitors' sites say what they are; a type nobody acts on isn't checked. */
function Presence({ source }: { source: WaveSource }) {
  const t = useTranslations("Report.sources");
  if (source.type === "client_owned") return <span className="text-muted-foreground">{t("own")}</span>;
  if (source.type === "competitor_site") return <span className="text-muted-foreground">{t("competitor")}</span>;
  if (!PLACEABLE.includes(source.type)) {
    // A dash, explained on hover and under the table: a long word didn't fit the column on a phone
    return (
      <Hint text={t("notCheckedHint")} focusable={false} className="text-muted-foreground">
        <span aria-hidden>—</span>
        <span className="sr-only">{t("notChecked")}</span>
      </Hint>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      {source.listed ? <CircleCheck aria-hidden className="size-4 text-positive" /> : <CircleX aria-hidden className="size-4 text-negative" />}
      {t(source.listed ? "listed" : "notListed")}
    </span>
  );
}

/**
 * The sites AI relies on, from the check's data object (Phase 0 items 0.3 and 0.4). First the cited sites by the
 * spec's type (§4.6), counted in sites, as one bar with its legend; then the placement target list, the only
 * sites a "get listed" step may name (§7: a directory, media or community site with a known way onto it, where
 * the answers name competitors and not the client), each with that way; then every cited site with its type, who
 * controls it and who typed it, the answers citing it (once an answer) of the answers that cite any site (§6.3),
 * whether the client is on it and the competitors beside it. Every share stands beside its count.
 */
export function Sources({ metrics }: { metrics: WaveMetrics }) {
  const t = useTranslations("Report.sources");
  const types = useTranslations("DomainTypes");
  const words = useCountWords();
  const { sources } = metrics;
  const split = DOMAIN_TYPES.flatMap(({ type, color }) => {
    const sites = sources.types[type] ?? 0;
    return sites > 0 ? [{ type, color, sites }] : [];
  });
  const targets = sources.rows.filter((row) => row.target);
  const typeLine = (source: WaveSource) =>
    [types(`control.${source.control}`), ...(source.review === "automated" ? [types("review.automated")] : [])].join(" · ");

  return (
    <div className="flex flex-col gap-3.5">
      {split.length > 0 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle>{t("typesTitle")}</BlockTitle>
          <ReportCard className="flex flex-col gap-3 p-4">
            <div
              role="img"
              aria-label={t("typesLabel", { parts: split.map((part) => `${types(`names.${part.type}`)}: ${t("sitesOf", { count: part.sites, total: sources.sites })}`).join(", ") })}
              className="flex h-3 gap-0.5 overflow-hidden rounded-full"
            >
              {split.map((part) => (
                <span key={part.type} className="h-full min-w-1" style={{ width: `${(part.sites / sources.sites) * 100}%`, background: part.color }} />
              ))}
            </div>
            <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 print:grid-cols-2">
              {split.map((part) => (
                <li key={part.type} className="flex items-baseline gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 translate-y-px rounded-[3px] ring-1 ring-border ring-inset" style={{ background: part.color }} />
                  <Hint text={types(`about.${part.type}`)} className="min-w-0 flex-1 text-pretty">
                    {types(`names.${part.type}`)}
                  </Hint>
                  <Share k={part.sites} n={sources.sites} text={`${t("sitesOf", { count: part.sites, total: sources.sites })} · ${words.percent(part.sites, sources.sites)}`} className="font-semibold" />
                </li>
              ))}
            </ul>
            <p className="text-xs text-pretty text-muted-foreground">{t("typesNote")}</p>
          </ReportCard>
        </div>
      )}

      {sources.rows.length > 0 && (
      <div data-block="targets" className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("targetsTitle")}</BlockTitle>
        <ReportCard className="flex flex-col gap-2 p-4 text-sm">
          {targets.length === 0 ? (
            <p className="text-pretty text-muted-foreground">{t("targetsNone")}</p>
          ) : (
            <>
              <p className="text-pretty text-muted-foreground">{t("targetsLead")}</p>
              <ul className="divide-y">
                {targets.map((source) => (
                  <li key={source.domain} data-target={source.domain} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
                      <TypeDot type={source.type} />
                      <span className="truncate">{source.domain}</span>
                    </span>
                    <span className="text-muted-foreground">{types(`names.${source.type}`)}</span>
                    <Share k={source.cited} n={sources.cited_answers} className="font-semibold whitespace-nowrap" />
                    {source.route && (
                      <a href={source.route.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline">
                        {t(`route.${source.route.how}`)}
                        <ExternalLink aria-hidden className="size-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </ReportCard>
      </div>
      )}

      <div className="flex flex-col gap-2">
        <BlockTitle>{t("allTitle")}</BlockTitle>
        {/* An explicit empty state, never a table of headings alone (spec defect 13, Phase 0 item 0.9) */}
        {sources.rows.length === 0 ? (
          <ReportCard className="px-4 py-3 text-sm text-pretty text-muted-foreground">
            {t("noSites")}
          </ReportCard>
        ) : (
        <ReportCard className="@container">
          {/* Fixed columns: a long address is cut, never the columns after it (on a phone they ran off the card) */}
          <ReportTable
            className="table-fixed"
            head={
              <>
                <th scope="col" className="hidden w-11 @md:table-cell">
                  #
                </th>
                <th scope="col" className="@max-md:pl-4!">
                  {t("site")}
                </th>
                <th scope="col" className="hidden w-48 @2xl:table-cell print:w-40">
                  {t("type")}
                </th>
                <th scope="col" className="w-22 @xl:w-44 print:w-40">
                  {t("used")}
                </th>
                <th scope="col" className="w-26 @lg:w-36">
                  {t("you")}
                </th>
                <th scope="col" className="hidden w-24 text-right @lg:table-cell print:w-28">
                  {t("rivals")}
                </th>
              </>
            }
          >
            {sources.rows.map((source, index) => (
              <tr key={source.domain} data-domain={source.domain} data-type={source.type} className="print:break-inside-avoid">
                <td className="hidden pl-4! text-muted-foreground tabular-nums @md:table-cell">{index + 1}</td>
                <th scope="row" className="text-left font-medium @max-md:pl-4!">
                  {/* Cut on a screen, with the whole address on hover; written out in full on paper */}
                  <span title={source.domain} className="block truncate print:overflow-visible print:whitespace-normal print:wrap-anywhere">
                    {source.domain}
                  </span>
                  {/* On a narrow screen the type goes under the site */}
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs font-normal text-muted-foreground @2xl:hidden">
                    <TypeDot type={source.type} />
                    {types(`names.${source.type}`)}
                  </span>
                </th>
                <td className="hidden @2xl:table-cell">
                  <Hint text={types(`about.${source.type}`)} focusable={false} className="inline-flex items-center gap-1.5">
                    <TypeDot type={source.type} />
                    {types(`names.${source.type}`)}
                  </Hint>
                  <span className="block text-xs text-muted-foreground">{typeLine(source)}</span>
                </td>
                <td>
                  <span className="flex items-center gap-2.5">
                    <PercentBar value={shareOf(source.cited, sources.cited_answers) ?? 0} color="var(--rival-strong)" className="hidden w-20 shrink-0 @xl:block" />
                    <Share k={source.cited} n={sources.cited_answers} className="font-semibold whitespace-nowrap" />
                  </span>
                </td>
                <td>
                  <Presence source={source} />
                </td>
                <td className="hidden text-right tabular-nums @lg:table-cell">{source.rivals > 0 ? source.rivals : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            ))}
          </ReportTable>
          <p className="border-t px-4 py-2 text-xs text-pretty text-muted-foreground">
            {t("usedOf", { answers: sources.cited_answers })}
            {sources.rows.some((row) => !PLACEABLE.includes(row.type) && row.type !== "client_owned" && row.type !== "competitor_site") && ` ${t("dashNote")}`}
          </p>
        </ReportCard>
        )}
      </div>
    </div>
  );
}
