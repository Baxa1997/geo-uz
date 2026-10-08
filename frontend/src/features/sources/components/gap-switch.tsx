"use client";

import { Hint } from "@/shared/components/hint";
import { cn } from "@/shared/helpers/utils";

/** Peec's "Gap analysis" switch beside a table's heading: on, the table keeps the places where competitors are and the client isn't. */
export function GapSwitch({ on, onChange, label, hint }: { on: boolean; onChange: (on: boolean) => void; label: string; hint: string }) {
  return (
    <Hint text={hint} className="shrink-0 rounded-full">
      {(describedBy) => (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-describedby={describedBy}
          onClick={() => onChange(!on)}
          className={cn(
            "flex items-center gap-2 rounded-full py-1 pr-1 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span aria-hidden className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-positive" : "bg-foreground/15")}>
            <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow-sm transition-transform", on && "translate-x-4")} />
          </span>
          {label}
        </button>
      )}
    </Hint>
  );
}
