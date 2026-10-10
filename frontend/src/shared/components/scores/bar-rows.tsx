import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

export interface BarRow {
  key: string;
  label: React.ReactNode;
  /** As shown at the end of the row, e.g. "38%". */
  value: string;
  /** The row's size against the largest one, 0–1: how far its bar reaches. */
  size: number;
  /** Optional mark between the bar and the value. */
  mark?: React.ReactNode;
  /** Optional line under the row that explains it. */
  detail?: React.ReactNode;
  /** Where the row leads: the whole row is then a link (a cited site's own page). */
  href?: string;
  /** For the row itself: a row that only a wide card shows. */
  className?: string;
}

/**
 * A ranking as rows of bars behind their labels, largest first, the number at the end of each row.
 * The bars are light so the labels stay readable on them; the numbers carry the values. A row with an
 * address is a link from edge to edge: its bar darkens under the pointer.
 */
export function BarRows({ rows, className }: { rows: BarRow[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {rows.map(({ key, label, value, size, mark, detail, href, className: rowClass }) => {
        const line = (
          <>
            <span className="relative flex h-9 min-w-0 flex-1 items-center">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 origin-left rounded-lg bg-muted transition-colors group-hover/row:bg-foreground/10 motion-safe:animate-bar-grow"
                style={{ width: `${Math.max(4, Math.round(size * 100))}%` }}
              />
              <span className="relative flex min-w-0 items-center gap-2 px-2.5 text-sm">{label}</span>
            </span>
            {mark}
            <span className="w-11 shrink-0 text-right text-sm font-medium tabular-nums">{value}</span>
          </>
        );
        return (
          <li key={key} className={cn("flex flex-col gap-1", rowClass)}>
            {href ? (
              <Link href={href} className="group/row flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {line}
              </Link>
            ) : (
              <div className="flex items-center gap-3">{line}</div>
            )}
            {detail && <p className="px-2.5 pb-1.5 text-xs text-pretty text-muted-foreground">{detail}</p>}
          </li>
        );
      })}
    </ul>
  );
}
