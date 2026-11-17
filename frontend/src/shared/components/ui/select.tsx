"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { cn } from "cn";
import type { ReactNode } from "react";
import { type FieldSize, fieldClass } from "./field-style";

export interface SelectOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** The words typed to jump to it, when the label isn't plain text */
  text?: string;
  /** A second line in gray, in the list only */
  hint?: ReactNode;
  disabled?: boolean;
}

/**
 * A choice from a list, drawn by us instead of the browser (the user's screenshot, 17 Nov 2026: the
 * browser's own list, blue and square, in Brend savollari). It looks like every other field (`fieldClass`)
 * and opens a list under itself in the dropdown menus' look, with a check on the current choice. Keyboard: the
 * arrows, Enter, Escape, and typing a name's first letters jumps to it.
 */
export function Select<V extends string>({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  size = "md",
  className,
  popupClassName,
  disabled,
  required,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: V | "";
  onValueChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  /** Shown in gray while nothing is chosen (`value` is "") */
  placeholder?: string;
  size?: FieldSize;
  className?: string;
  popupClassName?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
}) {
  const labels = Object.fromEntries(options.map((option) => [option.value, option.label]));

  return (
    <SelectPrimitive.Root<V>
      value={value === "" ? null : value}
      onValueChange={(next) => next !== null && onValueChange(next)}
      items={labels}
      disabled={disabled}
      required={required}
      modal={false}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={fieldClass(
          size,
          cn(
            "group/select flex cursor-pointer items-center justify-between gap-2 text-left data-popup-open:border-primary/60 data-popup-open:ring-4 data-popup-open:ring-primary/10",
            size === "sm" ? "pr-1.5" : "pr-2",
            className,
          ),
        )}
      >
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground/80"
        />
        <SelectPrimitive.Icon className="flex shrink-0 text-muted-foreground transition-transform duration-150 group-data-popup-open/select:rotate-180">
          <ChevronDown aria-hidden className="size-3.5" weight="bold" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner className="z-50 outline-none select-none" sideOffset={6} alignItemWithTrigger={false}>
          <SelectPrimitive.Popup
            className={cn(
              "max-h-[min(22rem,var(--available-height))] min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none",
              "transition-[opacity,scale,translate] duration-150 ease-out data-ending-style:-translate-y-1 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
              popupClassName,
            )}
          >
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  // What typing jumps by; the button shows `label`
                  label={option.text}
                  disabled={option.disabled}
                  className="flex cursor-pointer items-center gap-2 rounded-md py-2 pr-2 pl-2.5 outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-muted data-selected:font-medium"
                >
                  <span className="min-w-0 flex-1">
                    <SelectPrimitive.ItemText className="block truncate">{option.label}</SelectPrimitive.ItemText>
                    {option.hint && <span className="block truncate text-xs font-normal text-muted-foreground">{option.hint}</span>}
                  </span>
                  <SelectPrimitive.ItemIndicator className="flex shrink-0 text-primary">
                    <Check aria-hidden className="size-4" weight="bold" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
