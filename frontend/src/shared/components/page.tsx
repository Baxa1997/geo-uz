import { EngineSwitcher } from "@/shared/components/engine-switcher";
import { cn } from "@/shared/helpers/utils";

/**
 * A workspace page: title bar across the top of the white panel, then the content, as wide as the panel.
 * `engines` adds the engine switcher, for pages that show one engine's results.
 * `bleed` hands the whole area to the page (two-pane screens bring their own padding).
 */
export function Page({
  title,
  actions,
  engines = false,
  bleed = false,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  engines?: boolean;
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Wraps on narrow screens: the switcher moves under the title */}
      <header className="sticky top-0 z-10 flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur sm:px-6">
        <h1 className="min-w-0 flex-auto truncate text-lg font-semibold tracking-tight">{title}</h1>
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
