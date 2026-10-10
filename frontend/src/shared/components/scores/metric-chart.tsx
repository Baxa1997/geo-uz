"use client";

import { ChartColumn, ChartLine } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { Segmented, SegmentedButton } from "@/shared/components/segmented";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatMonth, formatShortDate } from "@/shared/helpers/dates";
import type { Grain } from "@/shared/helpers/history";
import { formatDecimal } from "@/shared/helpers/numbers";
import { byMetric, metricUnit, metricValue, scoreOf } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import { BrandLogo } from "./brand-logo";
import type { HistoryPoint } from "@/shared/types/api";
import type { Metric, SeriesBrand } from "@/shared/types/scores";
import { GrainSwitch } from "./grain-switch";
import { MetricTabs } from "./metric-tabs";

export type Mode = "line" | "bar";

/**
 * What the chart shows: one of the four metrics, as lines over time or as bars of the latest point, with
 * the checks grouped by day, week or month.
 */
export interface ChartView {
  metric: Metric;
  mode: Mode;
  grain: Grain;
}

/** A line of the plot: a brand, or anything else drawn the same way (a cited site, one of its pages). */
export interface Series extends SeriesBrand {
  /** One value per run; null where the brand was never named. */
  values: (number | null)[];
}

interface Scale {
  min: number;
  max: number;
  ticks: number[];
  /** Position: 1 is the best, so it sits at the top. */
  flipped: boolean;
}

/** The plot's height in a card and in the large view; the labels at the lines' ends are spaced by it. */
export const PLOT = { card: { box: "h-56", px: 224 }, large: { box: "h-72", px: 288 } } as const;

type PlotSize = (typeof PLOT)[keyof typeof PLOT];

/** With more runs than this, a dot on every run would crowd the lines: only the week being read keeps its dots. */
const DOTTED_RUNS = 26;

/** The numbers at the lines' ends keep at least this much room each. */
const LABEL_GAP_PX = 15;

/**
 * What follows the week being read (the marker line, the dots on it, the tooltip) moves by `translate`,
 * not by `left` and `top`: each is a box the size of the plot, shifted by a percentage of itself, with
 * its content pinned to its corner. The graphics card slides such a box by itself; a change of `left`
 * makes the browser lay the page out again on every frame of the glide, and the landing page's chart
 * glides every second and a half for as long as it is on screen.
 */
const FOLLOWS = "pointer-events-none absolute inset-0 transition-[translate] duration-300 ease-out motion-reduce:transition-none";

/**
 * The plot of the chart card (TrendPanel): every tracked brand over time on one metric. `history` is the
 * chart's points, already grouped by day, week or month. Lines with a dot on every point and each
 * brand's latest number at the line's end, over dashed gridlines and a y-axis that ends just above the
 * largest value; or one bar per brand for the latest point. Hovering (or the arrow keys) reads out a
 * point for all brands at once. The footer says what the metric means and switches lines and bars.
 * `readout` is for the landing page: the chart reads out that point by itself and can't be hovered.
 * `large` is the card opened in a window: a taller plot, the metric tabs and the day/week/month switch
 * above it, and the numbers as a table under it.
 */
export function MetricChart({
  history,
  runs,
  brands,
  view,
  onView,
  large = false,
  readout,
  className,
}: {
  history: HistoryPoint[];
  /** How many checks the points were made from. */
  runs: number;
  brands: SeriesBrand[];
  /** The metric, chart type and grouping: the card and its large view show the same, so their parent keeps them. */
  view: ChartView;
  onView: (view: ChartView) => void;
  large?: boolean;
  /** A point (by index) to read out without the pointer. */
  readout?: number;
  className?: string;
}) {
  const t = useTranslations("MetricChart");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const [hovered, setHovered] = useState<number | null>(null);

  const { metric, mode, grain } = view;
  const last = history.length - 1;
  // A month is named; a day or a week is dated by its check
  const tick = (iso: string) => (grain === "month" ? formatMonth(iso, locale, timeZone, "short") : formatShortDate(iso, locale, timeZone));
  const heading = (iso: string) => (grain === "month" ? formatMonth(iso, locale, timeZone, "long") : formatLongDate(iso, locale, timeZone));
  const interactive = readout === undefined;
  const active = interactive ? hovered : readout;
  const size = large ? PLOT.large : PLOT.card;

  const series: Series[] = brands.map((brand) => ({
    ...brand,
    values: history.map((point) => metricValue(scoreOf(point.scores, brand.id), metric)),
  }));
  const text = (value: number | null) => (value === null ? "—" : `${formatDecimal(value, locale)}${metricUnit(metric)}`);
  const ranked = (index: number) =>
    [...series].sort((a, b) => byMetric(a.values[index] ?? null, b.values[index] ?? null, metric));
  // The large view lists the latest week first; the screen reader's table follows the chart, oldest first
  const tableRows = history.map((_, index) => (large ? last - index : index));
  const viewSwitch = (
    <Segmented label={t("viewLabel")} className="ml-auto shrink-0">
      <SegmentedButton pressed={mode === "line"} onClick={() => onView({ ...view, mode: "line" })} label={t("line")}>
        <ChartLine aria-hidden className="size-4" />
      </SegmentedButton>
      <SegmentedButton pressed={mode === "bar"} onClick={() => onView({ ...view, mode: "bar" })} label={t("bar")}>
        <ChartColumn aria-hidden className="size-4" />
      </SegmentedButton>
    </Segmented>
  );

  return (
    <div className={cn("@container flex flex-1 flex-col", className)}>
      <div className={cn("flex flex-1 flex-col gap-3 p-4", large && "sm:px-5")}>
        {/* The card has these in its header; the large view has them here, written out */}
        {large && (
          <div className="flex flex-wrap items-center gap-2">
            <MetricTabs named metric={metric} onChange={(next) => onView({ ...view, metric: next })} />
            <GrainSwitch named grain={grain} onChange={(next) => onView({ ...view, grain: next })} />
            {viewSwitch}
          </div>
        )}

        {mode === "line" ? (
          <>
            <LinePlot
              // Lines draw again when the metric or the grouping changes
              key={`${metric}-${grain}`}
              series={series}
              scale={lineScale(metric, series)}
              unit={metricUnit(metric)}
              size={size}
              active={active}
              interactive={interactive}
              onActive={setHovered}
              label={t("chartLabel", { metric: t(`metrics.${metric}`), weeks: runs, brands: series.length })}
              ticks={history.map((point) => tick(point.collectedAt))}
              text={text}
              tooltip={(index) => (
                <>
                  <p className="font-medium">{heading(history[index]?.collectedAt ?? "")}</p>
                  {ranked(index).map((line) => (
                    <p key={line.id} className="flex items-center gap-2">
                      <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: line.color }} />
                      <BrandLogo name={line.name} logo={line.logo} className="size-4 rounded bg-background" />
                      <span className="min-w-0 flex-1 truncate pr-2 text-background/75">{line.name}</span>
                      <span className="font-semibold tabular-nums">{text(line.values[index] ?? null)}</span>
                    </p>
                  ))}
                </>
              )}
            />
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {series.map((line) => (
                <li key={line.id} className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: line.color }} />
                  {line.isYou ? t("you", { name: line.name }) : line.name}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <BarList key={metric} series={ranked(last)} index={last} max={barMax(metric, series)} size={size} text={text} youLabel={(name) => t("you", { name })} />
        )}

        {runs === 1 && <p className="text-xs text-pretty text-muted-foreground">{t("firstRun")}</p>}
      </div>

      {/* The large view explains itself in its window: the takeaway above, how to read it below */}
      {!large && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
          {/* The landing page's chart drops the explanation on a phone, to keep the lines in view */}
          <p className={cn("min-w-0 text-xs text-pretty text-muted-foreground", !interactive && "hidden @md:block")}>
            {t(`hints.${metric}`)} {t("weeks", { weeks: runs })}
            {/* Fewer points than checks: some points stand for several checks */}
            {runs > history.length && ` ${t("averaged")}`}
          </p>
          {viewSwitch}
        </div>
      )}

      {/*
        The chart's numbers as a table: on screen in the large view, otherwise the chart's text twin for
        screen readers (in a wrapper: a table itself can't be clipped to 1px). The landing page's chart
        is a picture hidden from screen readers, so it has none.
      */}
      {(large || interactive) && (
        <div className={large ? "flex flex-col gap-2.5 border-t p-4 sm:px-5" : "sr-only"}>
          {large && (
            <p aria-hidden className="text-sm font-medium">
              {t("table", { metric: t(`metrics.${metric}`) })}
            </p>
          )}
          {/* relative + min-w-0: with many brands the table scrolls here, not the window */}
          <div className={large ? "relative min-w-0 overflow-x-auto rounded-lg ring-1 ring-foreground/10" : undefined}>
            <table className={large ? "w-full table-fixed text-sm" : undefined} style={large ? { minWidth: `${11 + series.length * 8}rem` } : undefined}>
              <caption className="sr-only">{t(`metrics.${metric}`)}</caption>
              <thead>
                <tr className={large ? "border-b text-left text-xs text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium" : undefined}>
                  <th scope="col" className={large ? "w-44" : undefined}>
                    {t("date")}
                  </th>
                  {series.map((line) => (
                    <th key={line.id} scope="col">
                      <span className="flex items-center gap-1.5">
                        {large && <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: line.color }} />}
                        <span className="truncate">{large && line.isYou ? t("you", { name: line.name }) : line.name}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={large ? "divide-y" : undefined}>
                {tableRows.map((index) => (
                  <tr key={history[index]?.collectedAt ?? index}>
                    <th scope="row" className={large ? "px-3 py-2.5 text-left font-normal whitespace-nowrap text-muted-foreground" : undefined}>
                      {heading(history[index]?.collectedAt ?? "")}
                    </th>
                    {series.map((line) => (
                      <td key={line.id} className={large ? cn("px-3 py-2.5 tabular-nums", line.isYou && "bg-you-soft/25 font-semibold") : undefined}>
                        {text(line.values[index] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** Round steps an axis can count in. */
const AXIS_STEPS = [1, 2, 5, 10, 15, 20, 25];

/**
 * The y-axis of the lines. Scores, shares and tone start at zero and end on a round number just above the
 * largest value (never past 100), so low numbers aren't pressed flat against the bottom. Position starts
 * at 1 and grows down the chart.
 */
export function lineScale(metric: Metric, series: Series[]): Scale {
  const values = series.flatMap((line) => line.values).filter((value) => value !== null);
  if (metric === "position") {
    const max = Math.max(3, Math.ceil(Math.max(1, ...values)));
    const step = Math.ceil((max - 1) / 4);
    return { min: 1, max, ticks: Array.from({ length: Math.floor((max - 1) / step) + 1 }, (_, i) => 1 + i * step), flipped: true };
  }
  // A little air over the top line
  const reach = Math.min(100, Math.max(1, ...values) * 1.05);
  let best = { max: 100, step: 25 };
  for (const step of AXIS_STEPS) {
    for (const count of [4, 5]) {
      if (step * count >= reach && step * count < best.max) best = { max: step * count, step };
    }
  }
  return { min: 0, max: best.max, ticks: Array.from({ length: best.max / best.step + 1 }, (_, i) => i * best.step), flipped: false };
}

/** Bars have no axis: a score's bar is drawn against the whole scale, a position's against the last place named. */
function barMax(metric: Metric, series: Series[]): number {
  if (metric !== "position") return 100;
  const values = series.flatMap((line) => line.values).filter((value) => value !== null);
  return Math.max(3, Math.ceil(Math.max(1, ...values)));
}

/** Distance from the top of the plot, 0–100. */
function yOf(value: number, { min, max, flipped }: Scale) {
  const share = (value - min) / (max - min);
  return (flipped ? share : 1 - share) * 100;
}

const point = (value: number) => Math.round(value * 100) / 100;

/** Runs of consecutive weeks with a value: a brand that wasn't named leaves a gap in its line. */
function segments(values: (number | null)[], x: (index: number) => number, scale: Scale): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push([x(index), yOf(value, scale)]);
  });
  if (run.length) runs.push(run);
  return runs;
}

/**
 * Where each brand's latest number goes beside its line's end: at the line's height, moved down (then
 * back up from the bottom) where two lines end too close for both numbers to be read.
 */
function endLabels(series: Series[], index: number, scale: Scale, height: number) {
  const gap = (LABEL_GAP_PX / height) * 100;
  const tops = series
    .flatMap((line) => {
      const value = line.values[index] ?? null;
      return value === null ? [] : [{ id: line.id, value, top: yOf(value, scale) }];
    })
    .sort((a, b) => a.top - b.top);
  const down = tops.reduce<number[]>((placed, { top }) => [...placed, Math.max(top, (placed.at(-1) ?? -Infinity) + gap)], []);
  const up = down.reduceRight<number[]>((placed, top) => [Math.min(top, (placed[0] ?? 100 + gap) - gap), ...placed], []);
  return tops.map((label, i) => ({ ...label, top: up[i] ?? label.top }));
}

/**
 * The plot itself: the y-axis, dashed gridlines, a straight line per series with a dot on every point and its
 * latest number at its end, the dates under it, and a tooltip that reads out one point for all the lines.
 * Exported for the charts that draw something other than the brands' four metrics (the cited sites).
 */
export function LinePlot({
  series,
  scale,
  unit,
  size,
  active,
  interactive,
  onActive,
  label,
  ticks,
  text,
  tooltip,
}: {
  series: Series[];
  scale: Scale;
  /** After each number on the y-axis, e.g. "%". */
  unit: string;
  size: PlotSize;
  /** The week being read out. */
  active: number | null;
  interactive: boolean;
  onActive: (index: number | null) => void;
  label: string;
  ticks: string[];
  text: (value: number | null) => string;
  tooltip: (index: number) => React.ReactNode;
}) {
  const last = ticks.length - 1;
  // A single run sits in the middle of the plot
  const x = (index: number) => (last === 0 ? 50 : (index / last) * 100);
  // Without a week being read, the latest one still shows its dots
  const marked = active ?? last;
  const dotted = ticks.length <= DOTTED_RUNS;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - box.left) / box.width;
    onActive(Math.min(last, Math.max(0, Math.round(share * last))));
  }

  function onKeyDown(event: KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    onActive(Math.min(last, Math.max(0, (active ?? last) + step)));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div aria-hidden className={cn("relative w-8 shrink-0 text-xs text-muted-foreground tabular-nums", size.box)}>
          {scale.ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${yOf(tick, scale)}%` }}>
              {tick}
              {unit}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={label}
          tabIndex={interactive ? 0 : undefined}
          onPointerMove={interactive ? onPointerMove : undefined}
          onPointerLeave={interactive ? () => onActive(null) : undefined}
          onFocus={interactive ? () => onActive(active ?? last) : undefined}
          onBlur={interactive ? () => onActive(null) : undefined}
          onKeyDown={interactive ? onKeyDown : undefined}
          // The right margin holds the numbers at the lines' ends
          className={cn("relative mr-10 min-w-0 flex-1 touch-pan-y rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50", size.box)}
        >
          {scale.ticks.map((tick) => (
            <span key={tick} aria-hidden className="absolute inset-x-0 border-t border-dashed border-foreground/15" style={{ top: `${yOf(tick, scale)}%` }} />
          ))}

          {/* The lines and their dots appear from left to right */}
          <div aria-hidden className="absolute inset-0 motion-safe:animate-chart-draw">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              {series.map((line) =>
                segments(line.values, x, scale).map((run, index) => (
                  <path
                    key={`${line.id}-${index}`}
                    // Straight from run to run: a curve would suggest values between two weekly checks
                    d={run.map(([px, py], i) => `${i ? "L" : "M"}${point(px)},${point(py)}`).join("")}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.isYou ? 2.5 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )),
              )}
            </svg>
            {dotted &&
              series.flatMap((line) =>
                line.values.map(
                  (value, index) =>
                    value !== null &&
                    index !== marked && (
                      <span
                        key={`${line.id}-${index}`}
                        className="absolute size-1.5 -translate-1/2 rounded-full ring-[1.5px] ring-card"
                        style={{ left: `${x(index)}%`, top: `${yOf(value, scale)}%`, background: line.color }}
                      />
                    ),
                ),
              )}
          </div>

          {active !== null && (
            <span aria-hidden className={FOLLOWS} style={{ translate: `${x(active)}% 0` }}>
              <span className="absolute inset-y-0 left-0 w-0 border-l border-dashed border-foreground/40" />
            </span>
          )}
          {series.map((line) => {
            const value = line.values[marked] ?? null;
            return (
              value !== null && (
                <span key={line.id} aria-hidden className={FOLLOWS} style={{ translate: `${x(marked)}% ${yOf(value, scale)}%` }}>
                  <span className="absolute top-0 left-0 size-2.5 -translate-1/2 rounded-full ring-2 ring-card" style={{ background: line.color }} />
                </span>
              )
            );
          })}
          {/* Each brand's latest number, where its line ends (beside its dot, when there is one run) */}
          {endLabels(series, last, scale, size.px).map(({ id, value, top }) => (
            <span
              key={id}
              aria-hidden
              className="absolute ml-2.5 -translate-y-1/2 text-xs font-medium whitespace-nowrap tabular-nums"
              style={{ left: `${x(last)}%`, top: `${top}%` }}
            >
              {text(value)}
            </span>
          ))}
          {active !== null && (
            <div className={cn(FOLLOWS, "z-10")} style={{ translate: `${x(active)}% 0` }}>
              <div
                // Beside the marker line, on the side with more room
                className="absolute top-1 flex w-max max-w-64 min-w-44 flex-col gap-1.5 rounded-xl bg-foreground p-3 text-xs text-background shadow-xl"
                style={x(active) <= 50 ? { left: "0.75rem" } : { right: "calc(100% + 0.75rem)" }}
              >
                {tooltip(active)}
              </div>
            </div>
          )}
        </div>
      </div>
      <div aria-hidden className="relative mr-10 ml-10 h-4 text-xs text-muted-foreground">
        {ticks.map((tick, index) => {
          // Counting back from the latest point: every third on a phone, every other on a narrow chart.
          // A few points (two months, say) all keep their dates
          const back = last - index;
          const few = ticks.length <= 4;
          return (
            <span
              key={index}
              className={cn(
                "absolute whitespace-nowrap @xl:block",
                last === 0 ? "-translate-x-1/2" : index === 0 ? "" : index === last ? "-translate-x-full" : "-translate-x-1/2",
                !few && back % 3 !== 0 && "hidden",
                !few && (back % 2 === 0 ? "@md:block" : "@md:hidden"),
              )}
              style={{ left: `${x(index)}%` }}
            >
              {tick}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The latest run as one bar per brand, best first, each labelled with its value. */
function BarList({
  series,
  index,
  max,
  size,
  text,
  youLabel,
}: {
  series: Series[];
  index: number;
  /** The value a full-length bar stands for. */
  max: number;
  size: PlotSize;
  text: (value: number | null) => string;
  youLabel: (name: string) => string;
}) {
  return (
    // As tall as the lines with their dates, so switching the chart type doesn't move the card
    <ul className="flex flex-col justify-center gap-3 text-sm" style={{ minHeight: size.px + 22 }}>
      {series.map((bar) => {
        const value = bar.values[index] ?? null;
        return (
          <li key={bar.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3 @md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
            <span className="truncate">{bar.isYou ? youLabel(bar.name) : bar.name}</span>
            <span className="flex items-center gap-2 border-l py-0.5">
              {value !== null && (
                <span
                  aria-hidden
                  className="h-3 origin-left rounded-r motion-safe:animate-bar-grow"
                  style={{ width: `calc((100% - 3rem) * ${point(value / max)})`, background: bar.color }}
                />
              )}
              <span className={cn("tabular-nums", value === null ? "pl-2 text-muted-foreground" : "font-semibold")}>
                {text(value)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
