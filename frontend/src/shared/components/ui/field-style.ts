import { cn } from "cn";

/**
 * One look for every field: text inputs, text areas and the select's button (the user, 17 Nov 2026: "Select,
 * input … need to be corrected, the smooth, cleaner component"; until then there were five styles, 32 to 44px
 * tall, some with no focus at all). A white box with a hairline border that darkens on hover; in focus a navy
 * border with a soft halo; red when invalid; gray when disabled. The colors move, they don't jump. The text is
 * 16px on a phone, which would otherwise zoom into the field, and 14px from md.
 */
const BASE =
  "w-full min-w-0 rounded-lg border border-input bg-background text-base text-foreground md:text-sm shadow-[0_1px_0_rgb(28_46_110/0.03)] outline-none " +
  "transition-[border-color,box-shadow,background-color] duration-150 ease-out " +
  "placeholder:text-muted-foreground/80 hover:border-foreground/20 " +
  "focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10 " +
  "aria-invalid:border-destructive/70 aria-invalid:ring-destructive/10 " +
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:border-input";

export type FieldSize = "sm" | "md" | "lg";

/** sm 32px (inside a row of a table or list), md 40px (forms, the default), lg 44px (a window's main field). */
const HEIGHTS: Record<FieldSize, string> = { sm: "h-8 px-2.5", md: "h-10 px-3", lg: "h-11 px-3.5" };

export function fieldClass(size: FieldSize = "md", className?: string) {
  return cn(BASE, HEIGHTS[size], className);
}

/** A text area: the same box, its height from its rows. */
export function areaClass(className?: string) {
  return cn(BASE, "px-3 py-2.5 leading-relaxed", className);
}
