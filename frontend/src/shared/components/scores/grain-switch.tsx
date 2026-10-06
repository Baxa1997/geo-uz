"use client";

import { useTranslations } from "next-intl";
import { Segmented, SegmentedButton } from "@/shared/components/segmented";
import { GRAINS, type Grain } from "@/shared/helpers/history";

/**
 * Day, week or month: how a chart groups the checks into points, as in Peec's "D W M". One letter each in
 * a card's header; `named` writes the words out (the chart's large view).
 */
export function GrainSwitch({ grain, onChange, named = false }: { grain: Grain; onChange: (grain: Grain) => void; named?: boolean }) {
  const t = useTranslations("MetricChart");
  return (
    <Segmented label={t("grainLabel")}>
      {GRAINS.map((option) => (
        <SegmentedButton key={option} pressed={grain === option} onClick={() => onChange(option)} label={t(`grainBy.${option}`)}>
          {t(named ? `grains.${option}` : `grainShort.${option}`)}
        </SegmentedButton>
      ))}
    </Segmented>
  );
}
