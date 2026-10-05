import { Frown, Meh, Smile } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";
import type { Tone } from "@/shared/types/api";

const ICONS = { positive: Smile, neutral: Meh, negative: Frown } as const;

const COLORS = {
  positive: "text-positive",
  neutral: "text-muted-foreground",
  negative: "text-negative",
} as const;

/** Tone as icon shape + color, with the label for hover and screen readers. */
export function ToneIcon({ tone, className }: { tone: Tone; className?: string }) {
  const t = useTranslations("Tone");
  const Icon = ICONS[tone];
  return (
    <span title={t(tone)} className="inline-flex">
      <Icon aria-hidden className={cn("size-3.5 shrink-0", COLORS[tone], className)} />
      <span className="sr-only">{t(tone)}</span>
    </span>
  );
}
