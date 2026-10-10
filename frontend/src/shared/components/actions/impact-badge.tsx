import { SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";
import type { ActionImpact } from "@/shared/types/api";

const ICONS = { high: SignalHigh, medium: SignalMedium, low: SignalLow } as const;

/**
 * Expected effect of an action, as signal bars and a label. Not a status color: a low impact isn't bad.
 * `compact` keeps only the bars (the label goes to screen readers; a list row wraps them in a Hint).
 */
export function ImpactBadge({ impact, compact = false }: { impact: ActionImpact; compact?: boolean }) {
  const t = useTranslations("Actions.impact");
  const Icon = ICONS[impact];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap",
        impact === "high" ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon aria-hidden className={compact ? "size-4" : "size-3.5"} />
      <span className={cn(compact && "sr-only")}>{t(impact)}</span>
    </span>
  );
}
