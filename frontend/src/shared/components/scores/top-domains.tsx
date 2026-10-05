"use client";

import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
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
  /** Pages: whether the page names the client; null when it couldn't be read; undefined for sites. */
  mentioned?: boolean | null;
}

const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/**
 * The sites ChatGPT cites most, or the exact pages, as bars: the share of answers that use each. A dot
 * gives the site's kind; a page also says whether it names the client.
 */
export function TopDomains({
  sources,
  totalAnswers,
  youId,
  limit,
  action,
  className,
}: {
  sources: Source[];
  totalAnswers: number;
  youId: string;
  limit: number;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("SourcesTable");
  const types = useTranslations("SourceTypes");
  const locale = useLocale();
  const [view, setView] = useState<View>("domains");

  const rows: Row[] = (
    view === "domains"
      ? sources.map((source) => ({ name: source.domain, type: source.type, answers: source.count }))
      : sources.flatMap((source) =>
          source.pages.map((page) => ({
            name: shortUrl(page.url),
            type: source.type,
            answers: page.count,
            mentioned: page.mentions && page.mentions.includes(youId),
          })),
        )
  )
    .sort((a, b) => b.answers - a.answers)
    .slice(0, limit);
  const max = rows[0]?.answers ?? 1;

  return (
    <Panel
      title={t("title")}
      hint={t("hint")}
      className={className}
      actions={
        <>
          <Segmented label={t("viewLabel")}>
            {(["domains", "pages"] as const).map((option) => (
              <SegmentedButton key={option} pressed={view === option} onClick={() => setView(option)}>
                {t(option)}
              </SegmentedButton>
            ))}
          </Segmented>
          {action}
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <BarRows
          className="p-3"
          rows={rows.map((row) => ({
            key: row.name,
            size: row.answers / max,
            value: formatPercent(totalAnswers ? row.answers / totalAnswers : 0, locale),
            label: (
              <>
                <span
                  aria-hidden
                  className="flex size-5 shrink-0 items-center justify-center rounded-md bg-background text-[0.65rem] font-semibold text-muted-foreground uppercase ring-1 ring-border"
                >
                  {row.name.charAt(0)}
                </span>
                <span className="truncate font-medium">{row.name}</span>
                <SourceTypeDot type={row.type} />
                <span className="sr-only">{types(row.type)}</span>
              </>
            ),
            mark: row.mentioned === undefined ? undefined : <Mentioned value={row.mentioned} />,
          }))}
        />
      )}
    </Panel>
  );
}

/** Whether a page names the client, as an icon with its words for screen readers. */
function Mentioned({ value }: { value: boolean | null }) {
  const t = useTranslations("SourcesTable");
  const text = t(value === null ? "mentionedUnknown" : value ? "mentionedYes" : "mentionedNo");
  const Icon = value === null ? CircleHelp : value ? CircleCheck : CircleX;
  return (
    <span title={`${t("mentioned")}: ${text}`} className="shrink-0">
      <Icon
        aria-hidden
        className={value === null ? "size-4 text-muted-foreground" : value ? "size-4 text-positive" : "size-4 text-negative"}
      />
      <span className="sr-only">
        {t("mentioned")}: {text}
      </span>
    </span>
  );
}
