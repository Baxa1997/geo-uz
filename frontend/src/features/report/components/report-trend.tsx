"use client";

import { useLocale, useTimeZone } from "next-intl";
import { lineScale, LinePlot, PLOT, type Series } from "@/shared/components/scores/metric-chart";
import { TIME_ZONE } from "@/shared/constants";
import { formatShortDate } from "@/shared/helpers/dates";
import { formatPercent } from "@/shared/helpers/numbers";
import { metricValue, scoreOf } from "@/shared/helpers/scores";
import type { HistoryPoint } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/**
 * Every tracked brand's visibility over the checks, as the app's chart draws it but standing still, so it
 * reads the same on paper: a line per brand with its latest number at the end, the client's thicker. The
 * numbers are in the table beside it.
 */
export function ReportTrend({ history, brands, label, youLabel }: { history: HistoryPoint[]; brands: SeriesBrand[]; label: string; youLabel: string }) {
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const series: Series[] = brands.map((brand) => ({
    ...brand,
    values: history.map((point) => metricValue(scoreOf(point.scores, brand.id), "visibility")),
  }));

  return (
    <div className="@container flex flex-col gap-3">
      <LinePlot
        series={series}
        scale={lineScale("visibility", series)}
        unit="%"
        size={PLOT.card}
        active={null}
        interactive={false}
        onActive={() => {}}
        label={label}
        ticks={history.map((point) => formatShortDate(point.collectedAt, locale, timeZone))}
        text={(value) => (value === null ? "—" : formatPercent(value / 100, locale))}
        tooltip={() => null}
      />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((line) => (
          <li key={line.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: line.color }} />
            <span className={line.isYou ? "font-semibold" : undefined}>
              {line.name}
              {line.isYou && ` (${youLabel})`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
