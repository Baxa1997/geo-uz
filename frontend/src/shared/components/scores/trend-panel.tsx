"use client";

import { useTimeZone, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Panel } from "@/shared/components/panel";
import { TIME_ZONE } from "@/shared/constants";
import { groupHistory } from "@/shared/helpers/history";
import { METRICS } from "@/shared/helpers/scores";
import { useInView } from "@/shared/hooks/use-in-view";
import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";
import type { HistoryPoint } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { GrainSwitch } from "./grain-switch";
import { MetricChart, type ChartView } from "./metric-chart";
import { MetricTabs } from "./metric-tabs";
import { StandingLine } from "./standing-line";

/** How long the landing page's chart rests on each point. */
const AUTOPLAY_MS = 1400;

/**
 * The chart card of the Overview (and of the landing page's preview), laid out like Peec's: the title,
 * the metric tabs and the day/week/month switch in the header, the plot, then a footer line that explains
 * the metric and switches lines and bars. The switch groups the checks into the chart's points: with
 * weekly checks, day and week give a point per check and month gives each month's average.
 * `expandable` adds ⤢: the chart large, showing what the card shows, with where the client stands in
 * words, the numbers as a table and how to read the chart. `autoplay` is for the landing page: the chart
 * reads out point after point and moves on to the next metric by itself.
 */
export function TrendPanel({
  title,
  hint,
  history,
  brands,
  expandable = false,
  autoplay = false,
  className,
}: {
  title: string;
  hint?: string;
  history: HistoryPoint[];
  brands: SeriesBrand[];
  expandable?: boolean;
  autoplay?: boolean;
  className?: string;
}) {
  const t = useTranslations("MetricChart");
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const reducedMotion = useReducedMotion();
  const [chosen, setChosen] = useState<ChartView>({ metric: "visibility", mode: "line", grain: "week" });
  // Autoplay: null until it starts, then one step per point shown
  const [tick, setTick] = useState<number | null>(null);

  const points = groupHistory(history, chosen.grain, timeZone);
  const playing = autoplay && inView && !reducedMotion && points.length > 1;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setTick((current) => (current ?? -1) + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const view: ChartView =
    autoplay && tick !== null
      ? { ...chosen, metric: METRICS[Math.floor(tick / points.length) % METRICS.length] ?? chosen.metric }
      : chosen;
  // The landing page's chart always reads out a point: the latest until autoplay starts
  const readout = autoplay ? (tick === null ? points.length - 1 : tick % points.length) : undefined;

  return (
    <Panel
      title={title}
      hint={hint}
      className={className}
      actions={
        <>
          <MetricTabs metric={view.metric} onChange={(metric) => setChosen({ ...chosen, metric })} />
          <GrainSwitch grain={view.grain} onChange={(grain) => setChosen({ ...chosen, grain })} />
        </>
      }
      expand={
        expandable
          ? {
              // The latest check against the one before it, whatever the grouping
              takeaway: <StandingLine history={history} brands={brands} metric={view.metric} />,
              guide: (
                <>
                  <p>{t(`hints.${view.metric}`)}</p>
                  <p>{t(view.mode === "line" ? "guide.line" : view.metric === "position" ? "guide.barPosition" : "guide.bar")}</p>
                  <p>{t("guide.grain")}</p>
                </>
              ),
              content: <MetricChart large history={points} runs={history.length} brands={brands} view={view} onView={setChosen} />,
            }
          : undefined
      }
    >
      <div ref={root} className="flex flex-1 flex-col">
        <MetricChart history={points} runs={history.length} brands={brands} view={view} onView={setChosen} readout={readout} />
      </div>
    </Panel>
  );
}
