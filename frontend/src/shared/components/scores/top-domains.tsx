"use client";

import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { Segmented, SegmentedButton } from "@/shared/components/segmented";
import { formatPercent } from "@/shared/helpers/numbers";
import type { Source, SourceType } from "@/shared/types/api";
import { BarRows } from "./bar-rows";
import { SourceTypeDot } from "./source-type-dot";

type View = "domains" | "pages";

interface Row {
  name: string;
  type: SourceType;
  /** Answers citing it. */
  answers: number;
  /**
   * Whether the client is there: a site lists the brand, a page names it. Null when a page couldn't be
   * read; undefined where the question doesn't apply (the client's own site, a competitor's).
   */
  present?: boolean | null;
}

/** The takeaway names this many of the sites the client is missing from. */
const MISSING_SHOWN = 3;

const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** Sites the brand could be on: everything except its own website and the competitors' own. */
const isOpen = (source: Source) => source.type !== "own" && source.type !== "competitor";

/**
 * The sites ChatGPT cites most, or the exact pages, as bars: the share of answers that use each. A dot
 * gives the site's kind; a page also says whether it names the client. `expandable` adds ⤢: every site
 * and page in a large window, each with its kind in words and whether the client is on it, plus the
 * most cited site and the sites the client is missing from, in words.
 */
export function TopDomains({
  sources,
  totalAnswers,
  youId,
  limit,
  action,
  expandable = false,
  className,
}: {
  sources: Source[];
  totalAnswers: number;
  youId: string;
  limit: number;
  action?: React.ReactNode;
  expandable?: boolean;
  className?: string;
}) {
  const t = useTranslations("SourcesTable");
  const types = useTranslations("SourceTypes");
  const locale = useLocale();
  const [view, setView] = useState<View>("domains");
  const share = (answers: number) => formatPercent(totalAnswers ? answers / totalAnswers : 0, locale);

  const all: Row[] = (
    view === "domains"
      ? sources.map((source) => ({
          name: source.domain,
          type: source.type,
          answers: source.count,
          present: isOpen(source) ? source.brandListed : undefined,
        }))
      : sources.flatMap((source) =>
          source.pages.map((page) => ({
            name: shortUrl(page.url),
            type: source.type,
            answers: page.count,
            present: page.mentions && page.mentions.includes(youId),
          })),
        )
  ).sort((a, b) => b.answers - a.answers);

  const switcher = (
    <Segmented label={t("viewLabel")}>
      {(["domains", "pages"] as const).map((option) => (
        <SegmentedButton key={option} pressed={view === option} onClick={() => setView(option)}>
          {t(option)}
        </SegmentedButton>
      ))}
    </Segmented>
  );

  /** The card shows the top rows and marks pages only; the large view shows all, with kinds and marks. */
  function list(rows: Row[], detailed: boolean) {
    if (rows.length === 0) return <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>;
    const max = rows[0]?.answers ?? 1;
    const label = t(view === "domains" ? "listed" : "mentioned");
    return (
      <BarRows
        className={detailed ? "p-3 sm:px-4" : "p-3"}
        rows={rows.map((row) => ({
          key: row.name,
          size: row.answers / max,
          value: share(row.answers),
          label: (
            <>
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-md bg-background text-[0.65rem] font-semibold text-muted-foreground uppercase ring-1 ring-border"
              >
                {row.name.charAt(0)}
              </span>
              <span className="truncate font-medium">{row.name}</span>
              <SourceTypeDot type={row.type} label={types(row.type)} />
              <span className={detailed ? "hidden shrink-0 text-xs text-muted-foreground @md:inline" : "sr-only"}>
                {types(detailed ? `short.${row.type}` : row.type)}
              </span>
            </>
          ),
          mark:
            view === "pages" || detailed ? (
              row.present === undefined ? (
                // Keeps the bars of marked and unmarked rows on one scale
                <span aria-hidden className="size-4 shrink-0" />
              ) : (
                <Presence value={row.present} label={label} />
              )
            ) : undefined,
        }))}
      />
    );
  }

  const top = [...sources].sort((a, b) => b.count - a.count)[0];
  const open = sources.filter(isOpen);
  const missing = open.filter((source) => !source.brandListed).sort((a, b) => b.count - a.count);

  return (
    <Panel
      title={t("title")}
      hint={t("hint")}
      className={className}
      actions={
        <>
          {switcher}
          {action}
        </>
      }
      expand={
        expandable
          ? {
              takeaway: top && (
                <>
                  <p>{t("takeawayTop", { domain: top.domain, share: share(top.count) })}</p>
                  {open.length > 0 && (
                    <p>
                      {missing.length > 0
                        ? t("takeawayMissing", {
                            count: missing.length,
                            sites: missing
                              .slice(0, MISSING_SHOWN)
                              .map((source) => source.domain)
                              .join(", "),
                          })
                        : t("takeawayListed")}
                    </p>
                  )}
                </>
              ),
              guide: (
                <>
                  <p>{t("guide")}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    <li className="flex items-center gap-1.5">
                      <CircleCheck aria-hidden className="size-4 text-positive" />
                      {t("legendYes")}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CircleX aria-hidden className="size-4 text-negative" />
                      {t("legendNo")}
                    </li>
                    {view === "pages" && (
                      <li className="flex items-center gap-1.5">
                        <CircleHelp aria-hidden className="size-4" />
                        {t("legendUnknown")}
                      </li>
                    )}
                  </ul>
                </>
              ),
              content: (
                <div className="@container flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
                    {switcher}
                    <span className="text-sm text-muted-foreground tabular-nums">{t("shown", { count: all.length })}</span>
                  </div>
                  {list(all, true)}
                </div>
              ),
            }
          : undefined
      }
    >
      {list(all.slice(0, limit), false)}
    </Panel>
  );
}

/** Whether the client is on a site or a page, as an icon with its words for screen readers. */
function Presence({ value, label }: { value: boolean | null; label: string }) {
  const t = useTranslations("SourcesTable");
  const text = t(value === null ? "mentionedUnknown" : value ? "mentionedYes" : "mentionedNo");
  const Icon = value === null ? CircleHelp : value ? CircleCheck : CircleX;
  return (
    <Hint text={`${label}: ${text}`} focusable={false} described={false} className="shrink-0">
      <Icon
        aria-hidden
        className={value === null ? "size-4 text-muted-foreground" : value ? "size-4 text-positive" : "size-4 text-negative"}
      />
      <span className="sr-only">
        {label}: {text}
      </span>
    </Hint>
  );
}
