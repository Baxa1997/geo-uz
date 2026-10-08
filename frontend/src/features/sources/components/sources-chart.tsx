"use client";

import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useState } from "react";
import { Panel } from "@/shared/components/panel";
import { GrainSwitch } from "@/shared/components/scores/grain-switch";
import { lineScale, LinePlot, PLOT, type Series } from "@/shared/components/scores/metric-chart";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatMonth, formatShortDate } from "@/shared/helpers/dates";
import type { Grain } from "@/shared/helpers/history";
import { cn } from "@/shared/helpers/utils";
import type { SourceHistoryPoint } from "@/shared/types/api";
import { percentIn } from "@/shared/helpers/sources";
import { groupSourceHistory } from "../helpers/history";

/** One line of the chart: a cited site, or one page of a site. */
export interface ChartLine {
  key: string;
  name: string;
  /** A CSS color, e.g. "var(--series-2)". */
  color: string;
  /** Drawn thicker: the client's own site among the sites, the whole site among its pages. */
  strong?: boolean;
  domain: string;
  /** A page of the site; without it the line is the site as a whole. */
  url?: string;
  /** Where the line's name in the legend leads: the site's own page. */
  href?: string;
}

/**
 * How much ChatGPT relied on a few sites (or on a site's pages) check after check, laid out like Peec's
 * "source retrievals over time": the lines over the checks with the day / week / month switch, and a legend
 * whose names open each site's page. A point is the share of that check's answers that cite the site, in
 * whole percent, the same number the tables show. The plot is the brands chart's, so hovering (or the
 * arrow keys) reads out one check for all lines; screen readers get the numbers as a table.
 */
export function SourcesChart({
  title,
  hint,
  footer,
  history,
  lines,
  label,
  className,
}: {
  title: string;
  hint: string;
  /** What the lines are and how to read a point, under the plot. */
  footer: string;
  history: SourceHistoryPoint[];
  lines: ChartLine[];
  /** The chart in words, for screen readers. */
  label: string;
  className?: string;
}) {
  const t = useTranslations("MetricChart");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const [grain, setGrain] = useState<Grain>("week");
  const [hovered, setHovered] = useState<number | null>(null);

  const points = groupSourceHistory(history, grain, timeZone);
  const series: (Series & { href?: string })[] = lines.map((line) => ({
    id: line.key,
    name: line.name,
    color: line.color,
    isYou: Boolean(line.strong),
    href: line.href,
    values: points.map((point) => percentIn(point, line.domain, line.url)),
  }));
  const text = (value: number | null) => (value === null ? "—" : `${value}%`);
  // A month is named; a day or a week is dated by its check
  const tick = (iso: string) => (grain === "month" ? formatMonth(iso, locale, timeZone, "short") : formatShortDate(iso, locale, timeZone));
  const heading = (iso: string) => (grain === "month" ? formatMonth(iso, locale, timeZone, "long") : formatLongDate(iso, locale, timeZone));

  return (
    <Panel
      title={title}
      hint={hint}
      className={className}
      actions={<GrainSwitch grain={grain} onChange={setGrain} />}
      footer={
        <p className="min-w-0 text-pretty">
          {footer}
          {/* Fewer points than checks: some points stand for several checks */}
          {history.length > points.length && ` ${t("averaged")}`}
        </p>
      }
    >
      <div className="@container flex flex-1 flex-col gap-3 p-4">
        <LinePlot
          // Lines draw again when the grouping changes
          key={grain}
          series={series}
          scale={lineScale("visibility", series)}
          unit="%"
          size={PLOT.card}
          active={hovered}
          interactive
          onActive={setHovered}
          label={label}
          ticks={points.map((point) => tick(point.collectedAt))}
          text={text}
          tooltip={(index) => (
            <>
              <p className="font-medium">{heading(points[index]?.collectedAt ?? "")}</p>
              {[...series]
                .sort((a, b) => (b.values[index] ?? 0) - (a.values[index] ?? 0))
                .map((line) => (
                  <p key={line.id} className="flex items-center gap-2">
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: line.color }} />
                    <span className="min-w-0 flex-1 truncate text-background/75">{line.name}</span>
                    <span className="font-semibold tabular-nums">{text(line.values[index] ?? null)}</span>
                  </p>
                ))}
            </>
          )}
        />
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {series.map((line) => {
            const chip = cn("inline-flex max-w-56 items-center gap-1.5 rounded-md bg-muted px-2 py-1", line.isYou && "font-medium");
            const name = (
              <>
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: line.color }} />
                <span className="truncate">{line.name}</span>
              </>
            );
            return (
              <li key={line.id} className="flex min-w-0">
                {line.href ? (
                  <Link href={line.href} className={cn(chip, "outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-3 focus-visible:ring-ring/50")}>
                    {name}
                  </Link>
                ) : (
                  <span className={chip}>{name}</span>
                )}
              </li>
            );
          })}
        </ul>
        {history.length === 1 && <p className="text-xs text-pretty text-muted-foreground">{t("firstRun")}</p>}
      </div>

      {/* The chart's numbers as a table for screen readers (in a wrapper: a table itself can't be clipped to 1px) */}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{t("date")}</th>
              {series.map((line) => (
                <th key={line.id} scope="col">
                  {line.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => (
              <tr key={point.collectedAt}>
                <th scope="row">{heading(point.collectedAt)}</th>
                {series.map((line) => (
                  <td key={line.id}>{text(line.values[index] ?? null)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
