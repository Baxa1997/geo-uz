"use client";

import { Eye, ListOrdered, PieChart, Smile, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Segmented, SegmentedButton } from "@/shared/components/segmented";
import { METRICS } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Metric } from "@/shared/types/scores";

const ICONS: Record<Metric, LucideIcon> = { visibility: Eye, shareOfVoice: PieChart, sentiment: Smile, position: ListOrdered };

/**
 * The four metrics as tabs, for a chart card's tools: the chosen one shows its name, the others their
 * icon. `named` gives every tab its name where the container is wide enough (the chart's large view).
 */
export function MetricTabs({ metric, onChange, named = false }: { metric: Metric; onChange: (metric: Metric) => void; named?: boolean }) {
  const t = useTranslations("MetricChart");
  return (
    <Segmented label={t("metricLabel")}>
      {METRICS.map((option) => {
        const Icon = ICONS[option];
        const pressed = metric === option;
        return (
          <SegmentedButton key={option} pressed={pressed} onClick={() => onChange(option)} label={pressed ? undefined : t(`metrics.${option}`)}>
            <Icon aria-hidden className="size-4" />
            {(pressed || named) && <span className={cn(!pressed && "hidden @2xl:inline")}>{t(`metrics.${option}`)}</span>}
          </SegmentedButton>
        );
      })}
    </Segmented>
  );
}
