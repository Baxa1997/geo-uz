import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { EngineSwitcher } from "@/shared/components/engine-switcher";
import { PageTour, type TourId } from "@/shared/components/page-tour";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/**
 * A workspace page, laid out like Peec's: a bar across the top with the page's place as a breadcrumb
 * ("Manbalar › Saytlar › 2gis.uz", the last part being the page's title), the page's filters in a strip
 * under it, then its views as tabs in a strip of their own, then the content, as wide as the panel.
 * `crumbs` are the pages above this one, outermost first. `engines` adds the engine switcher, for pages
 * that show one engine's results. `tour` puts the page's guided tour (messages/Tours) behind a button at
 * the bar's end. `bleed` hands the whole area to the page (two-pane screens bring their own padding).
 */
export function Page({
  title,
  crumbs = [],
  actions,
  engines = false,
  tour,
  toolbar,
  tabs,
  bleed = false,
  children,
}: {
  title: string;
  crumbs?: { href: string; label: string }[];
  actions?: React.ReactNode;
  engines?: boolean;
  tour?: TourId;
  /** The page's filters (and tools that act on the whole page), in a strip under the title bar. */
  toolbar?: React.ReactNode;
  /** The page's views (`PageTabs`), in a strip under the filters. */
  tabs?: React.ReactNode;
  bleed?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Common");
  return (
    <>
      {/* Wraps on narrow screens: the switcher moves under the title */}
      {/* Solid, not see-through and blurred: a blur behind a sticky bar is redone on every frame of a scroll */}
      <header className="sticky top-0 z-10 flex min-h-12 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background px-3 py-2 sm:px-5">
        <div className="flex min-w-0 flex-auto items-center gap-0.5 text-[0.9375rem]">
          {crumbs.length > 0 && (
            <nav aria-label={t("breadcrumb")} className="flex shrink-0 items-center gap-0.5">
              {crumbs.map((crumb, index) => (
                <Fragment key={index}>
                  <Link href={crumb.href} className="rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                    {crumb.label}
                  </Link>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Fragment>
              ))}
            </nav>
          )}
          <h1 className="min-w-0 truncate px-1.5 py-1">{title}</h1>
        </div>
        {engines && <EngineSwitcher />}
        {actions}
        {tour && <PageTour id={tour} />}
      </header>
      {toolbar && <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2 sm:px-6">{toolbar}</div>}
      {tabs && <div className="shrink-0 border-b px-4 sm:px-6">{tabs}</div>}
      {/* Bleed: the page fills the panel and grows with its content, so its own sticky parts follow the scroll */}
      <div className={cn(bleed ? "flex flex-1 flex-col" : "flex w-full flex-1 flex-col gap-4 p-4 sm:p-5")}>{children}</div>
    </>
  );
}
