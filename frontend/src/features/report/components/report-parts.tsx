import { ArrowDown, ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";

/**
 * A numbered section of the report: its number and title, a sentence on what it shows and how to read it,
 * then its content. On paper a short section stays on one page and a heading is never left at a page's foot.
 */
export function ReportSection({
  id,
  number,
  title,
  lead,
  splits = false,
  children,
}: {
  id: string;
  number: number;
  title: string;
  lead?: string;
  /** A long section (the appendix) may run over pages. */
  splits?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} data-tour={id} className={cn("flex scroll-mt-4 flex-col gap-3", !splits && "print:break-inside-avoid")}>
      <header className="flex flex-col gap-1 print:break-after-avoid">
        <h2 id={`${id}-title`} className="flex items-baseline gap-2 text-xl font-semibold tracking-tight">
          <span className="text-muted-foreground tabular-nums">{number}.</span>
          {title}
        </h2>
        {lead && <p className="text-sm text-pretty text-muted-foreground">{lead}</p>}
      </header>
      {children}
    </section>
  );
}

/** A bordered block of the report: a table, a chart, a list. */
export function ReportCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>{children}</div>;
}

/** A report table: plain, readable on paper, the first column widest. */
export function ReportTable({ head, children, className }: { head: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <table className={cn("w-full text-sm", className)}>
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
          {head}
        </tr>
      </thead>
      <tbody className="divide-y [&_td]:px-3 [&_td]:py-2.5 [&_td:last-child]:pr-4 [&_th]:px-3 [&_th]:py-2.5 [&_th:first-child]:pl-4">{children}</tbody>
    </table>
  );
}

/**
 * A change since the previous check: an arrow with its size, green when the number got better and red when
 * it got worse (for position, better is a smaller number, and the arrow still points up). "No change" in
 * words; a dash when there is nothing to compare with.
 */
export function Change({ change, lowerIsBetter = false, className }: { change: number | null; lowerIsBetter?: boolean; className?: string }) {
  const t = useTranslations("Report.scorecard");
  const locale = useLocale();
  if (change === null) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const amount = formatDecimal(Math.abs(change), locale);
  if (amount === "0") return <span className={cn("text-muted-foreground", className)}>{t("noChange")}</span>;
  const better = lowerIsBetter ? change < 0 : change > 0;
  const Icon = better ? ArrowUp : ArrowDown;
  return (
    // Never color alone: the arrow says the same as the green or red
    <span className={cn("inline-flex items-center gap-0.5 font-medium whitespace-nowrap tabular-nums", better ? "text-better" : "text-worse", className)}>
      <Icon aria-hidden className="size-3.5" />
      <span aria-hidden>{amount}</span>
      <span className="sr-only">{t(better ? "better" : "worse", { amount })}</span>
    </span>
  );
}
