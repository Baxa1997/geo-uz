import { Circle, CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/helpers/utils";
import type { ActionStatus } from "@/shared/types/api";

/** In progress, as Peec marks it: a ring with its right half filled, in amber. Drawn like the lucide circles beside it. */
function HalfCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ICONS: Record<ActionStatus, { icon: LucideIcon | typeof HalfCircle; className: string }> = {
  new: { icon: Circle, className: "text-muted-foreground" },
  in_progress: { icon: HalfCircle, className: "text-progress" },
  done: { icon: CircleCheck, className: "text-positive" },
  declined: { icon: CircleX, className: "text-negative" },
};

/** A status as Peec marks it in the list and the status menu: an empty circle, half full, ticked, crossed out. */
export function StatusIcon({ status, className }: { status: ActionStatus; className?: string }) {
  const { icon: Icon, className: color } = ICONS[status];
  return <Icon aria-hidden className={cn("size-4 shrink-0", color, className)} />;
}
