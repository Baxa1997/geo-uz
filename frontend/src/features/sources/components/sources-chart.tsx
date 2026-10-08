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
 * How much ChatGPT relied on a few sites (or pages) check after check, laid out like Peec's "source
 * retrievals over time": the title with the day / week / month switch, the lines over the checks, and the
 * legend in a strip under them, whose names open each site's page. A point is the share of that check's
 * answers that cite the site, in whole percent, the same number the tables show; the section's line above
 * the card says so. The plot is the brands chart's, so hovering (or the arrow keys) reads out one check for
 * all lines; screen readers get the numbers as a table.
 */
export function SourcesChart({
  title,
  hint,
  history,
  lines,
  label,
  className,
}: {
  title: string;
  hint: string;
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
  // Fewer points than checks: some points stand for several checks. One check: nothing to draw a line between.
  const note = history.length === 1 ? t("firstRun") : history.length > points.length ? t("averaged") : null;

  return (
    <Panel title={title} hint={hint} className={className} actions={<GrainSwitch grain={grain} onChange={setGrain} />}>
      <div className="@container flex flex-1 flex-col p-4 pb-3">
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
      </div>
      {/* The legend in a strip under the plot, as on Peec */}
      <div className="flex flex-col gap-2 border-t px-3 py-2.5">
        <ul className="flex flex-wrap gap-1.5 text-sm">
          {series.map((line) => {
            const chip = cn("inline-flex max-w-72 items-center gap-2 rounded-lg bg-muted px-2.5 py-1", line.isYou && "font-medium");
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
        {note && <p className="px-1 text-xs text-pretty text-muted-foreground">{note}</p>}
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
