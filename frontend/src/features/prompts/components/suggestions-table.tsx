"use client";

import { Check, X } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { TIME_ZONE } from "@/shared/constants";
import { formatShortDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { SuggestedPrompt } from "@/shared/types/api";
import { SelectBox } from "./select-box";

/**
 * The suggested questions as Peec's table: a box to pick each, the question (with its language and, while
 * every topic is shown, its topic), why it is suggested, when, and ✕ / ✓ at the end of the row to reject
 * or track it (on hover and on a picked row, always on a touch screen). Peec's volume, branding, intent
 * and tags are left out: there is no search volume for these questions, and topics group them. A row
 * just suggested is marked new.
 */
export function SuggestionsTable({
  rows,
  selected,
  fresh,
  busy,
  canTrack,
  showTopic,
  topicLabel,
  onToggle,
  onToggleAll,
  onDecide,
}: {
  rows: SuggestedPrompt[];
  selected: Set<string>;
  /** Suggested a moment ago, in this visit. */
  fresh: Set<string>;
  /** The suggestions being tracked or rejected. */
  busy: Set<string>;
  /** False when the plan has no room: tracking is off, rejecting isn't. */
  canTrack: boolean;
  showTopic: boolean;
  topicLabel: (topic: string) => string;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onDecide: (ids: string[], track: boolean) => void;
}) {
  const t = useTranslations("PromptManager.suggested");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const all = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const some = rows.some((row) => selected.has(row.id));

  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground [&>th]:h-11 [&>th]:font-medium">
          <th scope="col" className="w-11 pl-4">
            <SelectBox checked={all} mixed={some && !all} label={t("selectAll")} onChange={onToggleAll} />
          </th>
          <th scope="col" className="px-2">
            <Hint text={t("hints.question")}>{t("columns.question")}</Hint>
          </th>
          <th scope="col" className="hidden w-48 px-3 @2xl:table-cell">
            <Hint text={t("hints.source")}>{t("columns.source")}</Hint>
          </th>
          <th scope="col" className="hidden w-28 px-3 @xl:table-cell">
            <Hint text={t("hints.date")}>{t("columns.date")}</Hint>
          </th>
          <th scope="col" className="w-24 pr-4">
            <span className="sr-only">{t("columns.decide")}</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row) => {
          const picked = selected.has(row.id);
          const working = busy.has(row.id);
          return (
            <tr
              key={row.id}
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button, input, [data-hint]")) return;
                onToggle(row.id);
              }}
              className={cn("group cursor-pointer transition-colors", picked ? "bg-you-soft/40" : "hover:bg-muted/30", working && "opacity-50")}
            >
              <td className="py-3 pl-4 align-top">
                <span className="flex h-5 items-center">
                  <SelectBox checked={picked} label={t("select", { text: row.text })} onChange={() => onToggle(row.id)} />
                </span>
              </td>
              <td className="px-2 py-3">
                <p className="text-pretty">
                  <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">{row.language}</span>
                  <span lang={row.language}>{row.text}</span>
                  {fresh.has(row.id) && (
                    <span className="ml-2 inline-flex rounded-md bg-better/10 px-1.5 py-0.5 align-middle text-xs font-medium text-better">{t("new")}</span>
                  )}
                </p>
                {/* The topic while every topic is shown; on a narrow table, why it is suggested too (its column is hidden) */}
                <span className={cn("mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground", !showTopic && "@2xl:hidden")}>
                  {showTopic && <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">{topicLabel(row.topic)}</span>}
                  <span className="@2xl:hidden">{t(`sources.${row.source}`)}</span>
                </span>
              </td>
              <td className="hidden px-3 py-3 @2xl:table-cell">
                <Hint text={t(`sourceHints.${row.source}`)} focusable={false} className="text-muted-foreground">
                  {t(`sources.${row.source}`)}
                </Hint>
              </td>
              <td className="hidden px-3 py-3 whitespace-nowrap text-muted-foreground @xl:table-cell">{formatShortDate(row.createdAt, locale, timeZone)}</td>
              <td className="py-2.5 pr-4">
                <span
                  className={cn(
                    "flex justify-end gap-1 transition-opacity [@media(hover:none)]:opacity-100",
                    picked ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
                  )}
                >
                  <Hint text={t("reject")} described={false}>
                    {() => (
                      <button
                        type="button"
                        aria-label={t("rejectLabel", { text: row.text })}
                        disabled={working}
                        onClick={() => onDecide([row.id], false)}
                        className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <X aria-hidden className="size-4" />
                      </button>
                    )}
                  </Hint>
                  <Hint text={canTrack ? t("track") : t("noRoom")} described={false}>
                    {() => (
                      <button
                        type="button"
                        aria-label={t("trackLabel", { text: row.text })}
                        disabled={working || !canTrack}
                        onClick={() => onDecide([row.id], true)}
                        className="flex size-8 items-center justify-center rounded-lg border bg-background shadow-xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                      >
                        <Check aria-hidden className="size-4" />
                      </button>
                    )}
                  </Hint>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
