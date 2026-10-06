import { ChevronRight } from "lucide-react";
import { EngineSwitcher } from "@/shared/components/engine-switcher";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/**
 * A workspace page: title bar across the top of the white panel, then the content, as wide as the panel.
 * `engines` adds the engine switcher, for pages that show one engine's results.
 * `crumb` puts a link to the parent page before the title (a question's page under Questions).
 * `bleed` hands the whole area to the page (two-pane screens bring their own padding).
 */
export function Page({
  title,
  crumb,
  actions,
  engines = false,
  bleed = false,
  children,
}: {
  title: string;
  crumb?: { href: string; label: string };
  actions?: React.ReactNode;
  engines?: boolean;
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Wraps on narrow screens: the switcher moves under the title */}
      {/* Solid, not see-through and blurred: a blur behind a sticky bar is redone on every frame of a scroll */}
      <header className="sticky top-0 z-10 flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 flex-auto items-center gap-1.5 text-lg tracking-tight">
          {crumb && (
            <>
              <Link href={crumb.href} className="shrink-0 font-medium text-muted-foreground transition-colors hover:text-foreground">
                {crumb.label}
              </Link>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
          <h1 className={cn("min-w-0 truncate font-semibold", crumb && "max-w-sm")}>{title}</h1>
        </div>
        {engines && <EngineSwitcher />}
        {actions}
      </header>
      <div
        className={cn(
          bleed
            ? "flex min-h-0 flex-1"
            : "flex w-full flex-col gap-4 p-4 sm:gap-5 sm:p-6",
        )}
      >
        {children}
      </div>
    </>
  );
}
