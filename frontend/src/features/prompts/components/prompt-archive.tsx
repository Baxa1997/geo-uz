"use client";

import { ArchiveRestore } from "lucide-react";
import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import type { Prompt } from "@/shared/types/api";

/**
 * The questions the client stopped tracking, latest first: they aren't asked any more and don't count
 * toward the plan's limit, but keep their past answers (each still opens its own page). One click tracks
 * a question again, while the plan has room.
 */
export function PromptArchive({
  prompts,
  full,
  busyId,
  href,
  onRestore,
}: {
  prompts: Prompt[];
  /** The plan's questions are all in use: nothing can be tracked again until one is archived. */
  full: boolean;
  /** The question being saved. */
  busyId: string | null;
  href: (prompt: Prompt) => string;
  onRestore: (prompt: Prompt) => void;
}) {
  const t = useTranslations("PromptManager");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const latestFirst = [...prompts].sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-pretty text-muted-foreground">{t("archiveIntro")}</p>
      {latestFirst.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{t("archiveEmpty")}</p>
      ) : (
        <ul className="-mx-4 divide-y border-y">
          {latestFirst.map((prompt) => (
            <li key={prompt.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="text-sm text-pretty">
                  <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">{prompt.language}</span>
                  <Link href={href(prompt)} lang={prompt.language} className="underline-offset-4 outline-none hover:underline focus-visible:underline">
                    {prompt.text}
                  </Link>
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 whitespace-nowrap text-foreground">
                    {labelFor(messages.Topics, prompt.topic)}
                  </span>
                  {prompt.archivedAt && <span>{t("archivedOn", { date: formatLongDate(prompt.archivedAt, locale, timeZone) })}</span>}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-end sm:self-auto"
                disabled={full || busyId === prompt.id}
                title={full ? t("limitReached") : undefined}
                aria-label={t("restoreLabel", { text: prompt.text })}
                onClick={() => onRestore(prompt)}
              >
                <ArchiveRestore aria-hidden data-icon="inline-start" />
                {t("restore")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
