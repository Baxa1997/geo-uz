"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/shared/helpers/utils";

/**
 * The report's contents beside it, as a long document has: each numbered section, the one being read
 * marked as the page scrolls, and a click goes to it.
 */
export function ReportContents({ sections }: { sections: { id: string; number: number; title: string }[] }) {
  const t = useTranslations("Reports.detail");
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    const visible = new Set<string>();
    // A section counts as read while it crosses the band under the page's title
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = sections.find((section) => visible.has(section.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={t("contents")} data-tour="contents" className="flex flex-col gap-0.5 text-sm">
      <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">{t("contents")}</p>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={current === section.id ? "location" : undefined}
          className={cn(
            "flex gap-2 rounded-lg px-2 py-1.5 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
            current === section.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="w-5 shrink-0 tabular-nums">{section.number}.</span>
          <span className="min-w-0 text-pretty">{section.title}</span>
        </a>
      ))}
    </nav>
  );
}
