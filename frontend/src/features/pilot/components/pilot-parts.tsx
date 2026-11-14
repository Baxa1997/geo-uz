import type { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { cn } from "@/shared/helpers/utils";
import type { Level, PilotPoint } from "../types";

/** The report's texts, in the report's own language (not the address's). */
export type PilotT = Awaited<ReturnType<typeof getTranslations<"Pilot">>>;

export const SERIF = "font-(family-name:--font-pilot-serif)";

/** A small gray heading in capitals: over a block, a card or a column. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[0.6875rem] font-medium tracking-[0.12em] text-(--p-mute) uppercase", className)}>{children}</p>;
}

/**
 * One sheet of the report. On screen a white paper on the gray ground; on paper it starts a page of its
 * own unless `flow` lets it follow the sheet before.
 */
export function Sheet({ children, flow = false, className }: { children: ReactNode; flow?: boolean; className?: string }) {
  return (
    <section
      className={cn(
        "@container mx-auto w-full max-w-[210mm] bg-white px-5 py-8 shadow-sm sm:px-12 sm:py-12",
        "print:max-w-none print:px-[17mm] print:py-0 print:shadow-none",
        flow ? "print:mt-10 print:border-t print:border-(--p-line) print:pt-8" : "print:break-before-page",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** A numbered section's head: its number large in the margin, what it is about, and its finding as the title. */
export function SectionHead({ number, eyebrow, title }: { number?: number; eyebrow: string; title: string }) {
  return (
    <header className="grid gap-x-6 gap-y-1 @xl:grid-cols-[10rem_1fr]">
      <p aria-hidden className={cn(SERIF, "text-5xl leading-none font-light text-(--p-navy) @xl:text-6xl")}>
        {number}
      </p>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className={cn(SERIF, "mt-1.5 max-w-xl text-2xl leading-tight font-medium text-balance text-(--p-ink) @xl:text-[1.7rem]")}>{title}</h2>
      </div>
    </header>
  );
}

/** A section's body with a narrow column of notes beside it, as the head's number stands beside its title. */
export function WithAside({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-6 grid gap-x-6 gap-y-5 @xl:grid-cols-[10rem_1fr]">
      <aside className="flex flex-col gap-4 text-sm leading-snug text-(--p-body)">{aside}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A note in the margin: a navy label and a sentence or two. */
export function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-(--p-navy) uppercase">{label}</p>
      <p className="mt-1.5">{children}</p>
    </div>
  );
}

/** A figure's or table's caption over a dark rule: "Рис. 1  What it shows". */
export function Caption({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="border-t-2 border-(--p-ink) pt-2.5 text-sm font-medium text-(--p-ink)">
      <span className="mr-2.5 text-[0.6875rem] font-semibold tracking-[0.12em] text-(--p-navy) uppercase">{label}</span>
      {children}
    </p>
  );
}

/** The report's tables: gray headings in capitals over a dark rule, rows parted by light rules. */
export function Table({ head, children, className }: { head: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className="relative min-w-0 overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-sm", className)}>
        <thead>
          <tr className="border-b-2 border-(--p-ink) align-bottom text-[0.6875rem] font-medium tracking-[0.1em] text-(--p-mute) uppercase [&>th]:py-2 [&>th]:pr-4 [&>th]:font-medium last:[&>th]:pr-0">
            {head}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-(--p-line) [&>tr]:align-top [&>tr>*]:py-2.5 [&>tr>*]:pr-4 last:[&>tr>*]:pr-0">
          {children}
        </tbody>
      </table>
    </div>
  );
}

const TONES = { bad: "text-(--p-bad)", good: "text-(--p-good)", warn: "text-(--p-warn)", mute: "text-(--p-mute)" };

/** A status in words with its dot: never the color alone. */
export function Mark({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 font-semibold", TONES[tone])}>
      {tone !== "mute" && <span aria-hidden className="size-1.5 shrink-0 -translate-y-0.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** The client's own row is marked with a small tag, "ВЫ". */
export function YouTag({ label }: { label: string }) {
  return (
    <span className="ml-1.5 inline-block rounded-sm border border-(--p-navy) px-1 align-middle text-[0.5625rem] leading-4 font-semibold tracking-wider text-(--p-navy) uppercase">
      {label}
    </span>
  );
}

const LEVEL_BARS: Record<Level, number> = { high: 3, medium: 2, low: 1 };

/** A level as three bars with its word: high fills three, low one. */
export function LevelBars({ level, label }: { level: Level; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-(--p-ink)">
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={cn("h-1.5 w-3.5", bar <= LEVEL_BARS[level] ? "bg-(--p-ink)" : "bg-(--p-line)")} />
        ))}
      </span>
      {label}
    </span>
  );
}

/** The sentence a page leaves the reader with, on a tinted ground. */
export function Callout({ point, className }: { point: PilotPoint; className?: string }) {
  return (
    <p className={cn(SERIF, "break-inside-avoid bg-(--p-tint) px-5 py-4 text-[1.0625rem] leading-relaxed text-(--p-body)", className)}>
      <strong className="font-semibold text-(--p-navy)">{point.lead}</strong> {point.text}
    </p>
  );
}

/** A list of short points parted by rules, each opening in bold. */
export function Points({ points, numbered = false }: { points: PilotPoint[]; numbered?: boolean }) {
  const Tag = numbered ? "ol" : "ul";
  return (
    <Tag className="text-sm leading-snug text-(--p-body)">
      {points.map((point, index) => (
        <li key={point.lead} className="flex gap-3 border-b border-(--p-line) py-2.5">
          {numbered && <span className={cn(SERIF, "w-3 shrink-0 font-semibold text-(--p-navy)")}>{index + 1}</span>}
          <span>
            <strong className="font-semibold text-(--p-ink)">{point.lead}</strong> {point.text}
          </span>
        </li>
      ))}
    </Tag>
  );
}

/** A legend's entry: a swatch and what it stands for. */
export function Swatch({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={cn("h-1.5 w-6", className)} />
      {children}
    </span>
  );
}
