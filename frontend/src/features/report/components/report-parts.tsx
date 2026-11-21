import { ArrowDownIcon as ArrowDown } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpIcon as ArrowUp } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import { useCountWords } from "@/shared/hooks/use-count-words";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/**
 * The report's paper: one white page on the gray ground, square at its corners like a sheet, with the
 * margins of an official document, and everything in it one under another: the letterhead, the parts, the
 * sections, the sign-off. By itself it is as wide as a sheet and stands in the middle; `fill` lets it take
 * the whole width it is given (beside the contents in the workspace). On paper the page is the paper, so it
 * loses its edge and its margins.
 */
export function ReportPaper({ fill = false, className, children }: { fill?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <article
      className={cn(
        "flex w-full flex-col gap-6 rounded-xs bg-card px-4 py-5 shadow-sm ring-1 ring-foreground/15 sm:px-8 sm:py-7 print:max-w-none print:gap-6 print:rounded-none print:p-0 print:shadow-none print:ring-0",
        !fill && "mx-auto max-w-224",
        className,
      )}
    >
      {children}
    </article>
  );
}

/**
 * A count with the share it stands for: "2/7 · 29%", the share from the count shown by the one rounding rule
 * (`shareOf`), marked with the count (`data-k`, `data-n`) so a reader and the acceptance tests can check it
 * (Phase 0 item 0.3). Every percentage in the report goes through it. `text` says it in other words when given.
 */
export function Share({ k, n, text, className }: { k: number; n: number; text?: string; className?: string }) {
  const words = useCountWords();
  return (
    <span data-k={k} data-n={n} className={cn("tabular-nums", className)}>
      {text ?? words.count(k, n)}
    </span>
  );
}

/** A percentage as a thin bar against the whole scale (0–100%), so 20% never looks like a full bar. */
export function PercentBar({ value, color = "var(--you)", className }: { value: number; color?: string; className?: string }) {
  return (
    <span aria-hidden className={cn("block h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </span>
  );
}

/**
 * Where one of the report's parts begins: "Part II. Analysis" in capitals on a gray band across the page,
 * as an official document divides itself. On paper it stays with its first section.
 */
export function PartHeading({ number, title }: { number: number; title: string }) {
  const t = useTranslations("Report");
  return (
    <p className="border-y border-foreground/25 bg-muted px-3 py-1.5 text-center text-xs font-bold tracking-[0.16em] uppercase print:break-after-avoid">
      {t("partTitle", { number: ROMAN[number - 1] ?? String(number), title })}
    </p>
  );
}

/**
 * A section's conclusion, first under its title: what the evidence below adds up to, in counts. A reader who
 * reads only these boxes has the report. No status colors it since the score went (Phase 0 item 0.2).
 */
export function Verdict({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Report.condition");
  return (
    <div className="flex flex-col gap-0.5 rounded-[3px] border-l-4 border-foreground/25 bg-muted px-4 py-2.5 print:break-inside-avoid print:break-after-avoid">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("conclusion")}</p>
      <p className="text-[0.9375rem] font-medium text-pretty">{children}</p>
    </div>
  );
}

/** What to do about a section's conclusion, at its foot: the action from the plan that answers it. */
export function NextStep({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Report.condition");
  return (
    <p className="flex items-start gap-2.5 rounded-[3px] border border-foreground/15 bg-muted px-4 py-2.5 text-sm print:break-inside-avoid">
      <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 text-pretty">
        <span className="font-semibold">{t("recommended")}:</span> {children}
      </span>
    </p>
  );
}

/**
 * A numbered section of the report, on the same page as the others: its number and title in capitals over
 * a rule, as an official document heads a section; then a sentence on what it shows, its conclusion, the
 * evidence, and what to do. On paper
 * a section runs on from the one before and may cross pages: its heading is never left at a page's foot,
 * and its parts (a conclusion, a table's row, a card) stay whole.
 */
export function ReportSection({
  id,
  number,
  title,
  lead,
  verdict,
  next,
  children,
}: {
  id: string;
  number: number;
  title: string;
  lead?: string;
  verdict?: React.ReactNode;
  next?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-4 flex-col gap-3.5">
      <header className="flex flex-col gap-2 print:break-inside-avoid print:break-after-avoid">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1.5 border-b-2 border-foreground pb-1.5">
          <h2 id={`${id}-title`} className="flex min-w-0 items-baseline gap-2 text-[1.0625rem] leading-snug font-bold tracking-wide text-balance uppercase">
            <span className="tabular-nums">{number}.</span>
            {title}
          </h2>
        </div>
        {lead && <p className="text-sm text-pretty text-muted-foreground">{lead}</p>}
      </header>
      {verdict && <Verdict>{verdict}</Verdict>}
      {children}
      {next}
    </section>
  );
}

/** A bordered block of the report: a table, a chart, a list. Ruled and square, as in a printed document. */
export function ReportCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("overflow-hidden rounded-[3px] border border-foreground/20 bg-card", className)}>{children}</div>;
}

/** A report table: plain, readable on paper, the first column widest, its headings dark on gray. */
export function ReportTable({ head, children, className }: { head: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <table className={cn("w-full text-sm", className)}>
      <thead>
        <tr className="border-b border-foreground/20 bg-muted text-left text-xs [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
          {head}
        </tr>
      </thead>
      <tbody className="divide-y [&_td]:px-3 [&_td]:py-2 [&_td:last-child]:pr-4 [&_th]:px-3 [&_th]:py-2 [&_th:first-child]:pl-4">{children}</tbody>
    </table>
  );
}

/** A block's small heading inside a section, with a count beside it. */
export function BlockTitle({ count, children }: { count?: number; children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold">
      {children}
      {count !== undefined && <span className="font-normal text-muted-foreground tabular-nums"> · {count}</span>}
    </h3>
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
