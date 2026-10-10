"use client";

import { ArchiveRestore } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatShortDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { Prompt } from "@/shared/types/api";
import { SelectBox } from "./select-box";

/**
 * The questions the client stopped tracking, latest first, as a table: a box to pick each, the question
 * (still opening its own page with its past answers), its topic, when it was archived, and a button that
 * tracks it again while the plan has room. They aren't asked and don't count toward the plan's limit.
 */
export function ArchiveTable({
  prompts,
  selected,
  busy,
  full,
  href,
  topicLabel,
  onToggle,
  onToggleAll,
  onRestore,
}: {
  prompts: Prompt[];
  selected: Set<string>;
  busy: Set<string>;
  /** The plan's questions are all in use: nothing can be tracked again until one is archived. */
  full: boolean;
  href: (prompt: Prompt) => string;
  topicLabel: (topic: string) => string;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onRestore: (ids: string[]) => void;
}) {
  const t = useTranslations("PromptManager");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const all = prompts.length > 0 && prompts.every((prompt) => selected.has(prompt.id));
  const some = prompts.some((prompt) => selected.has(prompt.id));

  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground [&>th]:h-11 [&>th]:font-medium">
          <th scope="col" className="w-11 pl-4">
            <SelectBox checked={all} mixed={some && !all} label={t("selection.all")} onChange={onToggleAll} />
          </th>
          <th scope="col" className="px-2">
            {t("columns.question")}
          </th>
          <th scope="col" className="hidden w-44 px-3 @xl:table-cell">
            {t("topic")}
          </th>
          <th scope="col" className="hidden w-32 px-3 @2xl:table-cell">
            <Hint text={t("hints.archivedOn")}>{t("columns.archivedOn")}</Hint>
          </th>
          <th scope="col" className="w-14 pr-4">
            <span className="sr-only">{t("restore")}</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {prompts.map((prompt) => {
          const picked = selected.has(prompt.id);
          return (
            <tr
              key={prompt.id}
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button, input, [data-hint]")) return;
                onToggle(prompt.id);
              }}
              className={cn("cursor-pointer transition-colors", picked ? "bg-you-soft/40" : "hover:bg-muted/30", busy.has(prompt.id) && "opacity-50")}
            >
              <td className="py-3 pl-4 align-top">
                <span className="flex h-5 items-center">
                  <SelectBox checked={picked} label={t("selection.one", { text: prompt.text })} onChange={() => onToggle(prompt.id)} />
                </span>
              </td>
              <td className="px-2 py-3">
                <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">{prompt.language}</span>
                <Link href={href(prompt)} lang={prompt.language} className="text-pretty underline-offset-4 outline-none hover:underline focus-visible:underline">
                  {prompt.text}
                </Link>
                <span className="mt-1 block text-xs text-muted-foreground @xl:hidden">{topicLabel(prompt.topic)}</span>
              </td>
              <td className="hidden px-3 py-3 text-muted-foreground @xl:table-cell">{topicLabel(prompt.topic)}</td>
              <td className="hidden px-3 py-3 whitespace-nowrap text-muted-foreground @2xl:table-cell">
                {prompt.archivedAt ? formatShortDate(prompt.archivedAt, locale, timeZone) : "—"}
              </td>
              <td className="py-2.5 pr-4 text-right">
                <Hint text={full ? t("limitReached") : t("restoreHint")} described={false}>
                  {() => (
                    <button
                      type="button"
                      aria-label={t("restoreLabel", { text: prompt.text })}
                      disabled={full || busy.has(prompt.id)}
                      onClick={() => onRestore([prompt.id])}
                      className="inline-flex size-8 items-center justify-center rounded-lg border bg-background shadow-xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                    >
                      <ArchiveRestore aria-hidden className="size-4" />
                    </button>
                  )}
                </Hint>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
