import { cn } from "@/shared/helpers/utils";

/**
 * A part of a page, as on Peec: a heading and a grey line under it that says what the cards below show
 * and how to read them, outside the cards, then the cards. `actions` go to the right of the heading (a
 * switch that changes the cards). `tour` is the key the page's guided tour points at it with.
 */
export function PageSection({
  title,
  description,
  actions,
  tour,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tour?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-tour={tour} className={cn("flex min-w-0 flex-col gap-4", className)}>
      {/* The tools stay at the right of the heading, level with its last line; on a phone they go under it */}
      <div className="flex flex-col gap-x-6 gap-y-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[1.0625rem] leading-6 font-semibold tracking-tight">{title}</h2>
          {description && <p className="max-w-4xl text-sm text-pretty text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
