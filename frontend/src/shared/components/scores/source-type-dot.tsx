import { Hint } from "@/shared/components/hint";
import { cn } from "@/shared/helpers/utils";
import type { SourceType } from "@/shared/types/api";

/** One color per kind of cited site: the client's own in its accent, competitors and "other" in gray. */
export const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  own: "var(--you)",
  competitor: "var(--rival-strong)",
  directory: "var(--source-directory)",
  news: "var(--source-news)",
  social: "var(--source-social)",
  other: "var(--rival)",
};

/** `label` (the kind in words) is for a dot that stands alone: it shows when the dot is hovered or tapped. */
export function SourceTypeDot({ type, label, className }: { type: SourceType; label?: string; className?: string }) {
  const dot = (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ background: SOURCE_TYPE_COLORS[type] }}
    />
  );
  if (!label) return dot;
  return (
    // Padded, so the pointer has more than 8px to rest on
    <Hint text={label} focusable={false} described={false} className="-m-1 shrink-0 p-1">
      {dot}
    </Hint>
  );
}
