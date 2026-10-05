import { useTranslations } from "next-intl";
import { InfoTip } from "@/shared/components/info-tip";
import { cn } from "@/shared/helpers/utils";

/**
 * A card of a data page: a title with an ⓘ that explains it, tools on the right (tabs, export, a link),
 * the content, and an optional footer line. Every block of the Overview and the other data pages is one.
 */
export function Panel({
  title,
  hint,
  actions,
  footer,
  className,
  children,
}: {
  title: React.ReactNode;
  /** What the block shows, behind the ⓘ. */
  hint?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Common");
  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      <header className="flex min-h-13 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="truncate font-medium">{title}</h2>
          {hint && <InfoTip label={t("about")}>{hint}</InfoTip>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
      {/* min-w-0: a wide table inside scrolls in place instead of stretching the card */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground">
          {footer}
        </footer>
      )}
    </section>
  );
}
