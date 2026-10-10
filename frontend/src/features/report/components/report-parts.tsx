import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { conditionStatus, type ConditionStatus } from "@/shared/helpers/condition";
import { formatDecimal } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import { STATUS_FILL } from "../constants";

/** A status as a light ground and as an edge (a conclusion's box). */
const STATUS_TINT: Record<ConditionStatus, string> = { good: "bg-positive/8", fair: "bg-progress/10", weak: "bg-negative/8" };
const STATUS_EDGE: Record<ConditionStatus, string> = { good: "border-positive", fair: "border-progress", weak: "border-negative" };

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/**
 * The report's paper: one white page on the gray ground, square at its corners like a sheet, with the
 * margins of an official document, and everything in it one under another: the letterhead, the parts, the
 * sections, the sign-off. On paper the page is the paper, so it loses its edge and its margins.
 */
export function ReportPaper({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto flex w-full max-w-224 flex-col gap-7 rounded-xs bg-card px-4 py-5 shadow-sm ring-1 ring-foreground/15 sm:px-8 sm:py-7 print:max-w-none print:gap-6 print:rounded-none print:p-0 print:shadow-none print:ring-0">
      {children}
    </article>
  );
}

/**
 * A score out of 100 as its status: a colored dot and the word (good, fair, weak), with the score beside
 * it when `withScore`. The word carries the meaning, so the color is never alone.
 */
export function StatusChip({ score, withScore = false, className }: { score: number; withScore?: boolean; className?: string }) {
  const t = useTranslations("Report");
  const status = conditionStatus(score);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[3px] px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-foreground/15", STATUS_TINT[status], className)}>
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_FILL[status])} />
      {t(`status.${status}`)}
      {withScore && <span className="font-medium text-muted-foreground tabular-nums">{t("condition.outOf100", { score })}</span>}
    </span>
  );
}

/** A score out of 100 as a bar against the whole scale, in its status's color. Its number stands beside it. */
export function ScoreBar({ score, className }: { score: number; className?: string }) {
  return (
    <span aria-hidden className={cn("block h-2 overflow-hidden rounded-full bg-muted", className)}>
      <span className={cn("block h-full rounded-full", STATUS_FILL[conditionStatus(score)])} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
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
 * A section's conclusion, first under its title: what the evidence below adds up to, on the color of the
 * area's status. A reader who reads only these boxes has the report.
 */
export function Verdict({ score, children }: { score?: number; children: React.ReactNode }) {
  const t = useTranslations("Report.condition");
  const status = score === undefined ? null : conditionStatus(score);
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-[3px] border-l-4 px-4 py-2.5 print:break-inside-avoid print:break-after-avoid", status ? [STATUS_TINT[status], STATUS_EDGE[status]] : "border-foreground/25 bg-muted")}>
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
 * a rule, as an official document heads a section, with the status of the area it is the evidence for at
 * the line's end; then a sentence on what it shows, its conclusion, the evidence, and what to do. On paper
 * a section runs on from the one before and may cross pages: its heading is never left at a page's foot,
 * and its parts (a conclusion, a table's row, a card) stay whole.
 */
export function ReportSection({
  id,
  number,
  title,
  lead,
  score,
  verdict,
  next,
  children,
}: {
  id: string;
  number: number;
  title: string;
  lead?: string;
  /** The score of the area the section is the evidence for. */
  score?: number;
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
          {score !== undefined && <StatusChip score={score} withScore />}
        </div>
        {lead && <p className="text-sm text-pretty text-muted-foreground">{lead}</p>}
      </header>
      {verdict && <Verdict score={score}>{verdict}</Verdict>}
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
