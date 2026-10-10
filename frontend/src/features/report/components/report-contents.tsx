"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { conditionStatus } from "@/shared/helpers/condition";
import { cn } from "@/shared/helpers/utils";
import { STATUS_FILL } from "../constants";
import { StatusChip } from "./report-parts";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

export interface ContentsPart {
  key: string;
  title: string;
  sections: {
    id: string;
    number: number;
    title: string;
    /** The score of the area the section is the evidence for, and its status in words. */
    score?: number;
    status?: string;
  }[];
}

/**
 * The report's contents beside it, as a panel of its own (the user's correction of Oct 10: "too many
 * spacing, and no separation"): a heading with the report's overall status, then the parts one under
 * another with a line between them, each numbered section a tight row with the status of its area as a
 * dot. The one being read is marked with a bar at its edge as the page scrolls, and a click goes to it.
 * A panel taller than the screen scrolls on its own.
 */
export function ReportContents({ parts, score }: { parts: ContentsPart[]; /** The report's overall condition score. */ score?: number }) {
  const t = useTranslations("Reports.detail");
  const sections = useMemo(() => parts.flatMap((part) => part.sections), [parts]);
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
    <nav aria-label={t("contents")} data-tour="contents" className="flex max-h-[calc(100svh-5.5rem)] flex-col overflow-hidden rounded-xl bg-card text-sm shadow-xs ring-1 ring-foreground/10">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/50 py-2.5 pr-2.5 pl-3.5">
        <p className="font-semibold">{t("contents")}</p>
        {score !== undefined && <StatusChip score={score} withScore className="bg-card" />}
      </div>
      <div className="relative min-h-0 overflow-y-auto">
        {parts.map((part, index) => (
          <div key={part.key} className={cn("flex flex-col pb-1.5", index > 0 && "border-t")}>
            <p className="px-3.5 pt-2.5 pb-0.5 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              {ROMAN[index] ?? index + 1} · {part.title}
            </p>
            {part.sections.map((section) => {
              const active = current === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={active ? "location" : undefined}
                  className={cn(
                    "flex items-start gap-1.5 border-l-[3px] py-1 pr-3 pl-[0.6875rem] leading-snug transition-colors outline-none hover:bg-muted focus-visible:bg-muted",
                    active ? "border-foreground bg-muted font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="w-5 shrink-0 tabular-nums">{section.number}.</span>
                  <span className="min-w-0 flex-1 text-pretty">{section.title}</span>
                  {section.score !== undefined && (
                    <>
                      <span aria-hidden className={cn("mt-[0.3125rem] size-2 shrink-0 rounded-full", STATUS_FILL[conditionStatus(section.score)])} />
                      <span className="sr-only">{section.status}</span>
                    </>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
