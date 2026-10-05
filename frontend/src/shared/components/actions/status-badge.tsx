import { Ban, CircleCheck, CircleDot, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";
import type { ActionStatus } from "@/shared/types/api";

const STYLES = {
  new: { icon: CircleDot, className: "text-muted-foreground" },
  in_progress: { icon: Play, className: "bg-you-soft/60 text-foreground" },
  done: { icon: CircleCheck, className: "text-foreground [&>svg]:text-positive" },
  declined: { icon: Ban, className: "text-muted-foreground" },
} as const;

/** An action's status as icon and label; done is the only one in a status color. */
export function StatusBadge({ status, className }: { status: ActionStatus; className?: string }) {
  const t = useTranslations("Actions.status");
  const { icon: Icon, className: style } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        style,
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {t(status)}
    </span>
  );
}
