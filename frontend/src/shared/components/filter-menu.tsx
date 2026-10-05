"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/helpers/utils";

/**
 * One filter as an outlined button that shows its current choice, with the choices (and how many each
 * has, when given) in a menu below it. The first option is "all"; any other choice outlines the button.
 */
export function FilterMenu<T extends string>({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  className,
}: {
  icon: LucideIcon;
  /** What the filter is about, for screen readers ("Topic: Implants"). */
  label: string;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const current = options.find((option) => option.value === value) ?? options[0];
  const active = current !== options[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: ${current?.label ?? ""}`}
        className={cn(
          "inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm shadow-xs transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-muted/60",
          active && "border-foreground/25 font-medium",
          className,
        )}
      >
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="max-w-44 truncate">{current?.label}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-48">
        <DropdownMenuRadioGroup value={value} onValueChange={(next: T) => onChange(next)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <span className="flex-1">{option.label}</span>
              {option.count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
