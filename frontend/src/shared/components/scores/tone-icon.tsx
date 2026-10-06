import { Frown, Meh, Smile } from "lucide-react";
import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { cn } from "@/shared/helpers/utils";
import type { Tone } from "@/shared/types/api";

const ICONS = { positive: Smile, neutral: Meh, negative: Frown } as const;

const COLORS = {
  positive: "text-positive",
  neutral: "text-muted-foreground",
  negative: "text-negative",
} as const;

/** Tone as icon shape + color, with the label on hover (or a tap) and for screen readers. */
export function ToneIcon({ tone, className }: { tone: Tone; className?: string }) {
  const t = useTranslations("Tone");
  const Icon = ICONS[tone];
  return (
    <Hint text={t(tone)} focusable={false} described={false}>
      <Icon aria-hidden className={cn("size-3.5 shrink-0", COLORS[tone], className)} />
      <span className="sr-only">{t(tone)}</span>
    </Hint>
  );
}
