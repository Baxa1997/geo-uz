import { Circle, CircleCheck, CircleX, Contrast, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/helpers/utils";
import type { ActionStatus } from "@/shared/types/api";

const ICONS: Record<ActionStatus, { icon: LucideIcon; className: string }> = {
  new: { icon: Circle, className: "text-muted-foreground" },
  in_progress: { icon: Contrast, className: "text-you" },
  done: { icon: CircleCheck, className: "text-positive" },
  declined: { icon: CircleX, className: "text-negative" },
};

/** A status as Peec marks it in the list and the status menu: an empty circle, half full, ticked, crossed out. */
export function StatusIcon({ status, className }: { status: ActionStatus; className?: string }) {
  const { icon: Icon, className: color } = ICONS[status];
  return <Icon aria-hidden className={cn("size-4 shrink-0", color, className)} />;
}
