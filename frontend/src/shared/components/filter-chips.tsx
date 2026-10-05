"use client";

import { cn } from "@/shared/helpers/utils";

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  count: number;
}

/** A row of mutually exclusive filter buttons with counts. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === option.id
              ? "border-foreground bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label} <span className="tabular-nums opacity-70">{option.count}</span>
        </button>
      ))}
    </div>
  );
}
