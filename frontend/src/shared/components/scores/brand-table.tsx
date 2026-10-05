"use client";

import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Panel } from "@/shared/components/panel";
import { formatDecimal } from "@/shared/helpers/numbers";
import { byMetric, lowerIsBetter, METRICS, metricUnit, metricValue, scoreOf, toneOf } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { HistoryPoint } from "@/shared/types/api";
import type { Metric, SeriesBrand } from "@/shared/types/scores";
import { ToneIcon } from "./tone-icon";

/**
 * Column widths by the table's own width. Share of voice shows once the table is wide enough; the
 * narrowest phones (320px) also drop the tone column, so the brand's name keeps enough room.
 */
const COLUMNS: Record<Metric, string> = {
  visibility: "w-20 @sm:w-[5.25rem] @md:w-[5.875rem] @lg:w-[5.25rem] @xl:w-24 @2xl:w-28",
  shareOfVoice: "hidden @lg:table-cell @lg:w-[5.25rem] @xl:w-24 @2xl:w-28",
  sentiment: "hidden w-14 @xs:table-cell @sm:w-[4.5rem] @md:w-[5.875rem] @lg:w-[5.25rem] @xl:w-24 @2xl:w-28",
  position: "w-[4.25rem] @sm:w-[4.5rem] @md:w-[5.875rem] @lg:w-[5.25rem] @xl:w-24 @2xl:w-28",
};

/** Cells that hide with their column. */
const HIDDEN_CELLS: Partial<Record<Metric, string>> = {
  shareOfVoice: "hidden @lg:table-cell",
  sentiment: "hidden @xs:table-cell",
};

/**
 * The tracked brands side by side on the four metrics, each with its change since the previous
 * run. A column's heading sorts by it, best first; a second click turns the order around.
 */
export function BrandTable({
  history,
  brands,
  title,
  description,
  action,
  className,
}: {
  history: HistoryPoint[];
  brands: SeriesBrand[];
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("BrandTable");
  const locale = useLocale();
  const [sort, setSort] = useState<{ metric: Metric; reversed: boolean }>({ metric: "visibility", reversed: false });
  const latest = history.at(-1)?.scores ?? [];
  const previous = history.at(-2)?.scores;

  const rows = brands
    .map((brand) => ({
      brand,
      cells: METRICS.map((metric) => {
        const value = metricValue(scoreOf(latest, brand.id), metric);
        const before = previous ? metricValue(scoreOf(previous, brand.id), metric) : null;
        return { metric, value, change: value !== null && before !== null ? value - before : 0 };
      }),
    }))
    .sort((a, b) => {
      const value = (row: typeof a) => row.cells.find((cell) => cell.metric === sort.metric)?.value ?? null;
      return byMetric(value(a), value(b), sort.metric) * (sort.reversed ? -1 : 1);
    });

  return (
    <Panel title={title} hint={description} actions={action} className={cn("@container", className)}>
      {/* Fixed columns: the numbers keep their width and the brand's name takes the rest */}
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground [&>th]:font-medium">
            <th scope="col" className="w-9 py-2.5 pl-4">
              <span aria-hidden>#</span>
              <span className="sr-only">{t("rank")}</span>
            </th>
            <th scope="col" className="py-2.5 pr-2">
              {t("brand")}
            </th>
            {METRICS.map((metric) => {
              const sorted = sort.metric === metric;
              // Best first means the smallest number first for position, the largest for the others
              const ascending = sort.reversed !== lowerIsBetter(metric);
              const Icon = !sorted ? ChevronsUpDown : ascending ? ChevronUp : ChevronDown;
              return (
                <th
                  key={metric}
                  scope="col"
                  aria-sort={!sorted ? undefined : ascending ? "ascending" : "descending"}
                  className={cn("border-l p-0", COLUMNS[metric])}
                >
                  <button
                    type="button"
                    onClick={() => setSort({ metric, reversed: sorted && !sort.reversed })}
                    title={t("sortBy", { metric: t(metric) })}
                    className={cn(
                      "flex w-full items-center justify-between gap-1 px-1.5 py-2.5 font-medium transition-colors outline-none hover:text-foreground focus-visible:bg-muted @sm:px-2 @lg:px-2.5",
                      sorted && "text-foreground",
                    )}
                  >
                    <span className="truncate">{t(metric)}</span>
                    <Icon aria-hidden className="hidden size-3.5 shrink-0 @lg:block" />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(({ brand, cells }, index) => (
            <tr key={brand.id} className={cn(brand.isYou && "bg-you-soft/25")}>
              <td className="py-3 pl-4 text-muted-foreground tabular-nums">{index + 1}</td>
              <th scope="row" className="py-3 pr-2 text-left font-medium">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: brand.color }} />
                  <span className="truncate">{brand.name}</span>
                  {brand.isYou && <span className="hidden shrink-0 font-normal text-muted-foreground @md:inline">{t("you")}</span>}
                </span>
              </th>
              {cells.map(({ metric, value, change }) => (
                <td
                  key={metric}
                  className={cn("border-l px-1.5 py-3 whitespace-nowrap @sm:px-2 @lg:px-2.5", HIDDEN_CELLS[metric])}
                >
                  {value === null ? (
                    <span className="text-muted-foreground">
                      <span aria-hidden>—</span>
                      <span className="sr-only">{t("notNamed")}</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1 font-medium tabular-nums">
                        {metric === "sentiment" && <ToneIcon tone={toneOf(value)} />}
                        {metric === "position" && <span aria-hidden className="font-normal text-muted-foreground">#</span>}
                        {formatDecimal(value, locale)}
                        {metricUnit(metric)}
                      </span>
                      <Change metric={metric} change={change} judged={brand.isYou} />
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/**
 * Change since the previous run. The arrow points up when the brand did better, which for
 * position means a smaller number. Only the client's own change is colored good or bad.
 */
function Change({ metric, change, judged }: { metric: Metric; change: number; judged: boolean }) {
  const t = useTranslations("BrandTable");
  const locale = useLocale();
  const amount = formatDecimal(Math.abs(change), locale);
  if (amount === "0") return null;
  const better = lowerIsBetter(metric) ? change < 0 : change > 0;
  const Icon = better ? ArrowUp : ArrowDown;
  return (
    <span className="hidden items-center gap-0.5 text-xs text-muted-foreground tabular-nums @md:inline-flex">
      <Icon aria-hidden className={cn("size-3", judged && (better ? "text-positive" : "text-negative"))} />
      <span aria-hidden>{amount}</span>
      <span className="sr-only">{t(better ? "better" : "worse", { amount })}</span>
    </span>
  );
}
