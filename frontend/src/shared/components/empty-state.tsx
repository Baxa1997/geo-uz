import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/helpers/utils";

/** Dashed card with an icon tile: nothing found, nothing yet, coming soon. */
export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-xl border bg-background shadow-sm">
        <Icon aria-hidden className="size-5 text-muted-foreground" />
      </span>
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-pretty text-muted-foreground">{text}</p>}
      {children}
    </div>
  );
}
