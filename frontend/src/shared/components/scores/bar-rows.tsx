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
}

/**
 * A ranking as rows of bars behind their labels, largest first, the number at the end of each row.
 * The bars are light so the labels stay readable on them; the numbers carry the values.
 */
export function BarRows({ rows, className }: { rows: BarRow[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {rows.map(({ key, label, value, size, mark, detail }) => (
        <li key={key} className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 min-w-0 flex-1 items-center">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 origin-left rounded-lg bg-muted motion-safe:animate-bar-grow"
                style={{ width: `${Math.max(4, Math.round(size * 100))}%` }}
              />
              <span className="relative flex min-w-0 items-center gap-2 px-2.5 text-sm">{label}</span>
            </span>
            {mark}
            <span className="w-11 shrink-0 text-right text-sm font-medium tabular-nums">{value}</span>
          </div>
          {detail && <p className="px-2.5 pb-1.5 text-xs text-pretty text-muted-foreground">{detail}</p>}
        </li>
      ))}
    </ul>
  );
}
