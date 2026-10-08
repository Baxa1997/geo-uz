import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { cn } from "@/shared/helpers/utils";
import type { SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/** The small parts the sources tables share: the list of sites and pages, and a site's own page. */

export function Table({ head, empty, children }: { head: React.ReactNode; empty: string | null; children: React.ReactNode }) {
  if (empty) return <p className="p-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">{head}</tr>
      </thead>
      <tbody className="divide-y">{children}</tbody>
    </table>
  );
}

/** A column heading that says on hover what the column means. */
export function Heading({ label, hint, className }: { label: string; hint: string; className?: string }) {
  return (
    <th scope="col" className={className}>
      <Hint text={hint}>{label}</Hint>
    </th>
  );
}

/** A site's first letter in a square: where Peec shows the site's icon. */
export function Initial({ text, className }: { text: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[0.7rem] font-semibold text-muted-foreground uppercase", className)}
    >
      {text.charAt(0)}
    </span>
  );
}

/** A site's kind as a labelled pill with its color dot; hovering it says what the kind covers. */
export function TypePill({ type }: { type: SourceType }) {
  const types = useTranslations("SourceTypes.short");
  const about = useTranslations("SourceTypes.about");
  return (
    <Hint text={about(type)} focusable={false} className="items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-normal whitespace-nowrap">
      <SourceTypeDot type={type} />
      {types(type)}
    </Hint>
  );
}

/** Tracked brands as small chips with their color, or a dash. */
export function BrandChips({ brands }: { brands: SeriesBrand[] }) {
  if (brands.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {brands.map((brand) => (
        <li key={brand.id} className="flex">
          <Hint
            text={brand.name}
            focusable={false}
            described={false}
            className={cn(
              "h-6 items-center gap-1 rounded-md px-1.5 text-[0.7rem] font-semibold",
              brand.isYou ? "bg-you-soft/60 ring-1 ring-you/30" : "bg-muted",
            )}
          >
            <span aria-hidden className="size-2 rounded-full" style={{ background: brand.color }} />
            <span aria-hidden>{brand.name.charAt(0).toUpperCase()}</span>
            <span className="sr-only">{brand.name}</span>
          </Hint>
        </li>
      ))}
    </ul>
  );
}

/** Yes, no or unknown, as icon and words. */
export function Mark({ value, yes, no, unknown, className }: { value: boolean | null; yes: string; no: string; unknown?: string; className?: string }) {
  const Icon = value === null ? CircleHelp : value ? CircleCheck : CircleX;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <Icon aria-hidden className={cn("size-3.5", value === null ? "text-muted-foreground" : value ? "text-positive" : "text-negative")} />
      {value === null ? unknown : value ? yes : no}
    </span>
  );
}
