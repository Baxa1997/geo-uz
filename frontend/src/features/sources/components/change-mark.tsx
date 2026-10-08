import { ArrowDown, ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";

/**
 * How a share moved since the previous check: an arrow with the size of the change in percentage points,
 * green when the share grew and red when it fell (a site's change is colored in its own direction, like a
 * brand's). Nothing when it held. Hovering says what the share was before.
 */
export function ChangeMark({ now, before, className }: { now: number; before: number; className?: string }) {
  const t = useTranslations("SourcesPage.movers");
  const locale = useLocale();
  if (now === before) return null;
  const up = now > before;
  const Icon = up ? ArrowUp : ArrowDown;
  const was = t("was", { before: formatPercent(before / 100, locale) });
  return (
    // Never color alone: the arrow says the same as the green or red
    <Hint
      text={was}
      focusable={false}
      described={false}
      className={cn("shrink-0 items-center gap-0.5 text-sm font-medium tabular-nums", up ? "text-better" : "text-worse", className)}
    >
      <Icon aria-hidden className="size-3.5" />
      <span aria-hidden>{Math.abs(now - before)}</span>
      <span className="sr-only">{was}</span>
    </Hint>
  );
}
