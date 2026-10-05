import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";

/** Change in visibility vs the previous period, in percentage points. */
export function Trend({ trend, goodWhenUp }: { trend: number; goodWhenUp: boolean }) {
  const t = useTranslations("Headline");
  const format = useFormatter();
  const points = format.number(Math.abs(trend) * 100, { maximumFractionDigits: 0 });

  if (points === format.number(0)) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus aria-hidden className="size-3.5" />
        {t("trendFlat")}
      </p>
    );
  }

  const up = trend > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  // Only the client's own trend is judged good or bad; a competitor's stays neutral
  const tone = !goodWhenUp ? "text-muted-foreground" : up ? "text-positive" : "text-negative";
  return (
    <p className="flex items-start gap-1 text-xs text-muted-foreground">
      <Icon aria-hidden className={cn("mt-px size-3.5 shrink-0", tone)} />
      {up ? t("trendUp", { points }) : t("trendDown", { points })}
    </p>
  );
}
