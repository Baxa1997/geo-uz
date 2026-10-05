"use client";

import { cn } from "@/shared/helpers/utils";

/** A row of toggle buttons where one is on: a view or metric switch. */
export function Segmented({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className={cn("flex w-fit gap-0.5 rounded-lg bg-muted p-0.5", className)}>
      {children}
    </div>
  );
}

export function SegmentedButton({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  /** For buttons that show only an icon. */
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm whitespace-nowrap text-foreground/70 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-background aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-xs"
    >
      {children}
    </button>
  );
}
