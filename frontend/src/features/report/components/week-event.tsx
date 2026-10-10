import { ArrowDown, ArrowUp, CircleCheck, Plus, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";
import type { WeekEvent } from "../helpers/weeks";

/** How each kind of event is marked: the way it moved, colored by what it means for the client. */
const ICONS: Record<WeekEvent["kind"], LucideIcon> = {
  placeUp: ArrowUp,
  placeDown: ArrowDown,
  passedYou: ArrowDown,
  youPassed: ArrowUp,
  factsNew: TriangleAlert,
  done: CircleCheck,
  visibilityUp: ArrowUp,
  visibilityDown: ArrowDown,
  competitorUp: ArrowUp,
  siteNew: Plus,
};
const COLORS: Record<WeekEvent["tone"], string> = { good: "text-better", bad: "text-worse", neutral: "text-muted-foreground" };

/** One thing that happened in a week, as a marked line: in the summary's highlights and in a report's row. */
export function WeekEventLine({ event, className }: { event: WeekEvent; className?: string }) {
  const t = useTranslations("Report.events");
  const Icon = ICONS[event.kind];
  return (
    <span className={cn("flex items-start gap-2", className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", COLORS[event.tone])} />
      <span className="min-w-0 text-pretty">{t(event.kind, event.values)}</span>
    </span>
  );
}
