import { CircleCheck, CircleHelp, CircleX, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { cn } from "@/shared/helpers/utils";
import type { SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/** The small parts the sources tables share: the list of sites and pages, and a site's own page. */

/** A table's card, as on Peec: its tools in a row on top, the table, and how many rows it has at the bottom. */
export function TableCard({ toolbar, count, children }: { toolbar?: React.ReactNode; count?: string; children: React.ReactNode }) {
  return (
    <div className="@container min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b p-2.5">{toolbar}</div>}
      {children}
      {count && <p className="border-t px-4 py-3 text-right text-sm text-muted-foreground tabular-nums">{count}</p>}
    </div>
  );
}

/** The search field of a table's toolbar. */
export function SearchBox({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="h-8 w-full rounded-lg border bg-background pr-2 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}

export function Table({ head, empty, children }: { head: React.ReactNode; empty: string | null; children: React.ReactNode }) {
  if (empty) return <p className="p-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        {/* A grey heading row, as on Peec */}
        <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground [&>th]:h-10 [&>th]:font-medium">{head}</tr>
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
