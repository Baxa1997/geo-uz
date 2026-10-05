"use client";

import { ChartColumn, ChartLine, Eye, ListOrdered, PieChart, Smile, type LucideIcon } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Segmented, SegmentedButton } from "@/shared/components/segmented";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { formatDecimal } from "@/shared/helpers/numbers";
import { byMetric, METRICS, metricUnit, metricValue, scoreOf } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import { useInView } from "@/shared/hooks/use-in-view";
import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import type { HistoryPoint } from "@/shared/types/api";
import type { Metric, SeriesBrand } from "@/shared/types/scores";

type Mode = "line" | "bar";

interface Series extends SeriesBrand {
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

const ICONS: Record<Metric, LucideIcon> = { visibility: Eye, shareOfVoice: PieChart, sentiment: Smile, position: ListOrdered };

/** How long the crosshair of the landing page's chart rests on each week. */
const AUTOPLAY_MS = 1400;

/**
 * Every tracked brand over the past weekly runs, on one of the four metrics, as lines or as bars of the
 * latest run. Tabs on top pick the metric (the chosen one shows its name, the others their icon); the
 * footer says what the metric means and switches lines and bars. Hovering (or the arrow keys) reads out
 * a week for all brands at once. `autoplay` is for the landing page: the crosshair walks through the
 * weeks and metrics by itself.
 */
export function MetricChart({
  history,
  brands,
  autoplay = false,
  className,
}: {
  history: HistoryPoint[];
  brands: SeriesBrand[];
  autoplay?: boolean;
  className?: string;
}) {
  const t = useTranslations("MetricChart");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const reducedMotion = useReducedMotion();
  const [chosen, setChosen] = useState<Metric>("visibility");
  const [chosenMode, setChosenMode] = useState<Mode>("line");
  const [hovered, setHovered] = useState<number | null>(null);
  // Autoplay: null until it starts, then one step per week shown
  const [tick, setTick] = useState<number | null>(null);

  const weeks = history.length;
  const last = weeks - 1;
  const playing = autoplay && inView && !reducedMotion && weeks > 1;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setTick((current) => (current ?? -1) + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const metric = autoplay && tick !== null ? (METRICS[Math.floor(tick / weeks) % METRICS.length] ?? chosen) : chosen;
  // A single run can't make a line
  const mode: Mode = weeks > 1 ? chosenMode : "bar";
  // The landing page's chart always reads out a week: the latest until autoplay starts
  const active = autoplay ? (tick === null ? last : tick % weeks) : hovered;

  const series: Series[] = brands.map((brand) => ({
    ...brand,
    values: history.map((point) => metricValue(scoreOf(point.scores, brand.id), metric)),
  }));
  const scale = scaleOf(metric, series);
  const text = (value: number | null) => (value === null ? "—" : `${formatDecimal(value, locale)}${metricUnit(metric)}`);
  const ranked = (index: number) =>
    [...series].sort((a, b) => byMetric(a.values[index] ?? null, b.values[index] ?? null, metric));

  return (
    <div ref={root} className={cn("@container flex flex-col", className)}>
      <div className="flex flex-col gap-4 p-4">
        <Segmented label={t("metricLabel")}>
          {METRICS.map((option) => {
            const Icon = ICONS[option];
            const pressed = metric === option;
            return (
              <SegmentedButton key={option} pressed={pressed} onClick={() => setChosen(option)} label={pressed ? undefined : t(`metrics.${option}`)}>
                <Icon aria-hidden className="size-4" />
                {pressed && t(`metrics.${option}`)}
              </SegmentedButton>
            );
          })}
        </Segmented>

        {mode === "line" ? (
          <>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {series.map((line) => (
                <li key={line.id} className="flex items-center gap-1.5">
                  <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: line.color }} />
                  {line.isYou ? t("you", { name: line.name }) : line.name}
                </li>
              ))}
            </ul>
            <LinePlot
              // Lines draw again when the metric changes
              key={metric}
              series={series}
              scale={scale}
              active={active}
              interactive={!autoplay}
              onActive={setHovered}
              label={t("chartLabel", { metric: t(`metrics.${metric}`), weeks, brands: series.length })}
              ticks={history.map((point) => formatShortDate(point.collectedAt, locale, timeZone))}
              tooltip={(index) => (
                <>
                  <p className="font-medium">{formatLongDate(history[index]?.collectedAt ?? "", locale, timeZone)}</p>
                  {ranked(index).map((line) => (
                    <p key={line.id} className="flex items-center gap-2">
                      <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: line.color }} />
                      <span className="min-w-0 flex-1 truncate text-background/75">{line.name}</span>
                      <span className="font-semibold tabular-nums">{text(line.values[index] ?? null)}</span>
                    </p>
                  ))}
                </>
              )}
            />
          </>
        ) : (
          <BarList key={metric} series={ranked(last)} index={last} scale={scale} text={text} youLabel={(name) => t("you", { name })} />
        )}

        {weeks === 1 && <p className="text-xs text-pretty text-muted-foreground">{t("firstRun")}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
        {/* The landing page's chart drops the explanation on a phone, to keep the lines in view */}
        <p className={cn("min-w-0 text-xs text-pretty text-muted-foreground", autoplay && "hidden @md:block")}>
          {t(`hints.${metric}`)} {t("weeks", { weeks })}
        </p>
        {weeks > 1 && (
          <Segmented label={t("viewLabel")} className="ml-auto shrink-0">
            <SegmentedButton pressed={mode === "line"} onClick={() => setChosenMode("line")} label={t("line")}>
              <ChartLine aria-hidden className="size-4" />
            </SegmentedButton>
            <SegmentedButton pressed={mode === "bar"} onClick={() => setChosenMode("bar")} label={t("bar")}>
              <ChartColumn aria-hidden className="size-4" />
            </SegmentedButton>
          </Segmented>
        )}
      </div>

      {/* Text twin of the chart for screen readers. In a wrapper: a table itself can't be clipped to 1px */}
      <div className="sr-only">
        <table>
          <caption>{t(`metrics.${metric}`)}</caption>
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
            {history.map((point, index) => (
              <tr key={point.collectedAt}>
                <th scope="row">{formatLongDate(point.collectedAt, locale, timeZone)}</th>
                {series.map((line) => (
                  <td key={line.id}>{text(line.values[index] ?? null)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Scores and tone run 0–100; position starts at 1 and grows down the chart. */
function scaleOf(metric: Metric, series: Series[]): Scale {
  if (metric !== "position") return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100], flipped: false };
  const values = series.flatMap((line) => line.values).filter((value) => value !== null);
  const max = Math.max(3, Math.ceil(Math.max(1, ...values)));
  const step = Math.ceil((max - 1) / 4);
  return { min: 1, max, ticks: Array.from({ length: Math.floor((max - 1) / step) + 1 }, (_, i) => 1 + i * step), flipped: true };
}

/** Distance from the top of the plot, 0–100. */
function yOf(value: number, { min, max, flipped }: Scale) {
  const share = (value - min) / (max - min);
  return (flipped ? share : 1 - share) * 100;
}

const point = (value: number) => Math.round(value * 100) / 100;

/** A smooth path through the points that never overshoots them (monotone cubic). */
function smoothPath(points: [number, number][]): string {
  const [first, ...rest] = points;
  if (!first) return "";
  if (rest.length < 2) return [first, ...rest].map(([x, y], i) => `${i ? "L" : "M"}${point(x)},${point(y)}`).join("");
  const slopes = rest.map(([x, y], i) => {
    const [px, py] = points[i] ?? first;
    return (y - py) / (x - px);
  });
  const tangents = points.map((_, i) => {
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before === undefined) return after ?? 0;
    if (after === undefined) return before;
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  return rest.reduce((path, [x, y], i) => {
    const [px, py] = points[i] ?? first;
    const third = (x - px) / 3;
    const c1 = `${point(px + third)},${point(py + (tangents[i] ?? 0) * third)}`;
    const c2 = `${point(x - third)},${point(y - (tangents[i + 1] ?? 0) * third)}`;
    return `${path}C${c1} ${c2} ${point(x)},${point(y)}`;
  }, `M${point(first[0])},${point(first[1])}`);
}

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

function LinePlot({
  series,
  scale,
  active,
  interactive,
  onActive,
  label,
  ticks,
  tooltip,
}: {
  series: Series[];
  scale: Scale;
  /** The week being read out. */
  active: number | null;
  interactive: boolean;
  onActive: (index: number | null) => void;
  label: string;
  ticks: string[];
  tooltip: (index: number) => React.ReactNode;
}) {
  const last = ticks.length - 1;
  const x = (index: number) => (index / Math.max(1, last)) * 100;
  // Without a week being read, the latest one still shows its dots
  const marked = active ?? last;

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
        <div aria-hidden className="relative h-52 w-6 shrink-0 text-xs text-muted-foreground tabular-nums">
          {scale.ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${yOf(tick, scale)}%` }}>
              {tick}
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
          // The dots at both ends stick out by their radius
          className="relative mr-1.5 h-52 min-w-0 flex-1 touch-pan-y rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {scale.ticks.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="100"
                y1={yOf(tick, scale)}
                y2={yOf(tick, scale)}
                stroke="var(--color-border)"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible motion-safe:animate-chart-draw"
          >
            {series.map((line) =>
              segments(line.values, x, scale).map((run, index) => (
                <path
                  key={`${line.id}-${index}`}
                  d={smoothPath(run)}
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

          {active !== null && (
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-foreground/25 transition-[left] duration-300 ease-out motion-reduce:transition-none"
              style={{ left: `${x(active)}%` }}
            />
          )}
          {series.map((line) => {
            const value = line.values[marked] ?? null;
            return (
              value !== null && (
                <span
                  key={line.id}
                  aria-hidden
                  className="absolute size-2.5 -translate-1/2 rounded-full ring-2 ring-card transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
                  style={{ left: `${x(marked)}%`, top: `${yOf(value, scale)}%`, background: line.color }}
                />
              )
            );
          })}
          {active !== null && (
            <div
              // Beside the crosshair, on the side with more room, and never past the plot's edges
              className="pointer-events-none absolute top-1 z-10 flex w-44 flex-col gap-1.5 rounded-xl bg-foreground p-3 text-xs text-background shadow-xl transition-[left] duration-300 ease-out motion-reduce:transition-none"
              style={{
                left:
                  x(active) <= 50
                    ? `min(calc(${x(active)}% + 0.75rem), calc(100% - 11rem))`
                    : `max(calc(${x(active)}% - 11.75rem), 0rem)`,
              }}
            >
              {tooltip(active)}
            </div>
          )}
        </div>
      </div>
      <div aria-hidden className="relative mr-1.5 ml-8 h-4 text-xs text-muted-foreground">
        {ticks.map((tick, index) => {
          // Counting back from the latest week: every third on a phone, every other on a narrow chart
          const back = last - index;
          return (
            <span
              key={index}
              className={cn(
                "absolute whitespace-nowrap @xl:block",
                index === 0 ? "" : index === last ? "-translate-x-full" : "-translate-x-1/2",
                back % 3 !== 0 && "hidden",
                back % 2 === 0 ? "@md:block" : "@md:hidden",
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
  scale,
  text,
  youLabel,
}: {
  series: Series[];
  index: number;
  scale: Scale;
  text: (value: number | null) => string;
  youLabel: (name: string) => string;
}) {
  return (
    <ul className="flex min-h-[13.5rem] flex-col justify-center gap-3 text-sm">
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
                  style={{ width: `calc((100% - 3rem) * ${point(value / scale.max)})`, background: bar.color }}
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
