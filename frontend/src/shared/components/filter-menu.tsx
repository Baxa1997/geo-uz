"use client";

import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { fieldClass } from "@/shared/components/ui/field-style";
import { cn } from "@/shared/helpers/utils";
import type { AppIcon } from "@/shared/types/icon";

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
  icon: AppIcon;
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
        // The fields' look (ui/field-style), as a button the width of its choice
        className={fieldClass(
          "sm",
          cn(
            "group/filter inline-flex w-auto cursor-pointer items-center gap-1.5 text-sm md:text-sm data-popup-open:border-primary/60 data-popup-open:ring-4 data-popup-open:ring-primary/10",
            active && "border-foreground/30 font-medium",
            className,
          ),
        )}
      >
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="max-w-44 truncate">{current?.label}</span>
        <ChevronDown aria-hidden weight="bold" className="size-3 shrink-0 text-muted-foreground transition-transform duration-150 group-data-popup-open/filter:rotate-180" />
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
