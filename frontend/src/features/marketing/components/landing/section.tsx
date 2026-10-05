import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/helpers/utils";

/**
 * A landing section: a band across the page with a hairline on top, and the framed container
 * inside (hairlines left and right), so the sections read as one column of panels.
 */
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
    <section id={id} aria-labelledby={labelledBy} className="scroll-mt-20 border-t">
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-col gap-10 border-x px-4 py-16 sm:gap-14 sm:px-8 sm:py-24",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Small bordered label above a section's heading: icon and a word or two. */
export function Pill({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-sm font-medium shadow-xs">
      {Icon && <Icon aria-hidden className="size-3.5 text-muted-foreground" />}
      {children}
    </p>
  );
}

/** A section's centered opening: pill, heading, one muted sentence. */
export function SectionIntro({
  id,
  pill,
  icon,
  title,
  sub,
}: {
  id: string;
  pill: string;
  icon: LucideIcon;
  title: string;
  sub: string;
}) {
  return (
    <div data-reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
      <Pill icon={icon}>{pill}</Pill>
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
        {title}
      </h2>
      <p className="text-lg text-pretty text-muted-foreground sm:text-xl">{sub}</p>
    </div>
  );
}

/** White card of the landing: features, mocks, plans. */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border bg-background shadow-xs", className)}>{children}</div>;
}
