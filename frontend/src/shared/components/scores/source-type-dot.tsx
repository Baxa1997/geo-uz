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

export function SourceTypeDot({ type, className }: { type: SourceType; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ background: SOURCE_TYPE_COLORS[type] }}
    />
  );
}
