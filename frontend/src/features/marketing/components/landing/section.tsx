import { cn } from "@/shared/helpers/utils";

/** A landing section: a band across the page with a hairline on top, and the page's column inside. */
export function Section({
  id,
  labelledBy,
  className,
  children,
}: {
  id?: string;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="scroll-mt-24 border-t">
      <div className={cn("mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:gap-14 sm:px-8 sm:py-24", className)}>
        {children}
      </div>
    </section>
  );
}

/**
 * The label over a section's heading, as a numbered document's: the section's number, a short rule and a
 * word or two in small capitals. The number is counted by the page itself (the marketing layout resets
 * the `section` counter), so the sections can be reordered without renumbering.
 */
export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase [counter-increment:section] before:font-semibold before:text-brand before:content-[counter(section,decimal-leading-zero)]">
      <span aria-hidden className="h-px w-8 bg-brand/40" />
      {children}
    </p>
  );
}

/** A section's centered opening: its numbered label, heading, one muted sentence. */
export function SectionIntro({ id, pill, title, sub }: { id: string; pill: string; title: string; sub: string }) {
  return (
    <div data-reveal className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
      <Kicker>{pill}</Kicker>
      <h2 id={id} className="text-3xl font-bold tracking-[-0.03em] text-balance sm:text-5xl/[1.1]">
        {title}
      </h2>
      <p className="text-lg text-pretty text-muted-foreground sm:text-xl">{sub}</p>
    </div>
  );
}

/**
 * A section's opening, laid out like a clear product page's: its numbered label and heading on the left,
 * one paragraph on the right that says what the section shows (under the heading on a phone). `children`
 * go under the paragraph: a link or a button.
 */
export function SectionHead({ id, kicker, title, text, children }: { id: string; kicker: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div data-reveal className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
      <div className="flex flex-col gap-5">
        <Kicker>{kicker}</Kicker>
        <h2 id={id} className="text-3xl font-bold tracking-[-0.03em] text-balance sm:text-5xl/[1.08]">
          {title}
        </h2>
      </div>
      <div className="flex flex-col items-start gap-4 lg:pb-1.5">
        <p className="text-lg/8 text-pretty text-muted-foreground">{text}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * A piece of the product on the page: the app's own card (or a picture of it) on a light ground, with a
 * caption under it that names what it shows. An illustration: nothing in it can be clicked or focused, and
 * the caption is what a screen reader reads.
 */
export function ProductFrame({ title, text, className, children }: { title: string; text: string; className?: string; children: React.ReactNode }) {
  return (
    <figure data-reveal className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div aria-hidden inert className="@container min-w-0 flex-1 overflow-hidden rounded-2xl border bg-muted/50 p-3 select-none sm:p-5">
        {children}
      </div>
      <figcaption className="flex flex-col gap-1 border-l-2 border-brand pl-4">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-pretty text-muted-foreground">{text}</span>
      </figcaption>
    </figure>
  );
}

/** White card of the landing: features, mocks, plans. Flat on the paper: a line, no shadow. */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border bg-background", className)}>{children}</div>;
}
