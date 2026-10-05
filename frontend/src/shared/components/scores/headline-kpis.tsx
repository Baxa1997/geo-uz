import { useLocale, useTranslations } from "next-intl";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { headlineMetrics, lowerIsBetter, metricUnit, ownSourceShare, toneOf } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { KpiStrip, type Kpi } from "./kpi-strip";
import { ToneIcon } from "./tone-icon";

/**
 * The client's five numbers at the top of the Overview (and of the landing page's preview): visibility,
 * share of voice, tone, position, each with its change since the previous run, and how often ChatGPT
 * uses the client's own website as a source.
 */
export function HeadlineKpis({ report, className }: { report: Report; className?: string }) {
  const t = useTranslations("Kpi");
  const locale = useLocale();
  const { brand } = report.project;

  const items: Kpi[] = [
    ...headlineMetrics(report.history, brand.id).map(({ metric, value, change }) => ({
      key: metric,
      label: t(`labels.${metric}`),
      hint: t(`hints.${metric}`),
      value:
        value === null
          ? null
          : metric === "position"
            ? `#${formatDecimal(value, locale)}`
            : `${formatDecimal(value, locale)}${metricUnit(metric)}`,
      lead: metric === "sentiment" && value !== null ? <ToneIcon tone={toneOf(value)} className="size-4" /> : undefined,
      change:
        change === null
          ? null
          : { amount: formatDecimal(Math.abs(change), locale), better: lowerIsBetter(metric) ? change < 0 : change > 0 },
    })),
    {
      key: "source",
      label: t("labels.usedAsSource"),
      hint: t("hints.usedAsSource"),
      value: formatPercent(ownSourceShare(report.prompts, brand.domain), locale),
    },
  ];

  return <KpiStrip items={items} className={className} />;
}
