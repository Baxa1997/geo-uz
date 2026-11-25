import { cn } from "@/shared/helpers/utils";

/** A table of the admin page: ruled rows in a card, scrolling sideways inside it on a narrow screen, never the page. */
export function AdminTable({ label, head, children, wide = false }: { label: string; head: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="relative min-w-0 overflow-x-auto">
        <table aria-label={label} className={cn("w-full text-sm", wide ? "min-w-[56rem]" : "min-w-[40rem]")}>
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>{head}</tr>
          </thead>
          <tbody className="[&>tr]:border-t">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("h-9 px-3 font-medium whitespace-nowrap", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;
}

/** A list with nothing in it, said in a sentence where its table would be. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

/** The team's own account or project: not counted in the day's limit of free checks. */
export function TeamMark({ label }: { label: string }) {
  return <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium text-muted-foreground">{label}</span>;
}
