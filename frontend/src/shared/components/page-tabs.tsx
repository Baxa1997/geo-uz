"use client";

import { Fragment } from "react";
import { Hint } from "@/shared/components/hint";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

export interface PageTab {
  key: string;
  label: string;
  /** Each view has its own address, so a view can be linked to and the server renders it. */
  href: string;
  /** What the view shows, on hover. */
  hint?: string;
}

/**
 * A page's views as tabs, in the strip under its filters (`Page`'s `tabs`), as on Peec: the open one on
 * a light pill with a line under it that sits on the strip's border. The tabs are links.
 */
export function PageTabs({ label, tabs, current }: { label: string; tabs: PageTab[]; current: string }) {
  return (
    // Over the strip's border by a pixel, so the open tab's line covers it
    <nav aria-label={label} className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.key === current;
        const link = (describedBy?: string) => (
          <Link
            href={tab.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            aria-describedby={describedBy}
            className="group relative flex h-11 shrink-0 items-center rounded-lg text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span
              className={cn(
                "rounded-lg px-2.5 py-1.5 transition-colors",
                active ? "bg-muted font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {tab.label}
            </span>
            {active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />}
          </Link>
        );
        return tab.hint ? (
          <Hint key={tab.key} text={tab.hint} side="bottom" className="shrink-0">
            {link}
          </Hint>
        ) : (
          <Fragment key={tab.key}>{link()}</Fragment>
        );
      })}
    </nav>
  );
}
