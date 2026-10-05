"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bot, MapPin, User, X } from "lucide-react";
import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { AnswerMarkdown } from "@/shared/components/scores/answer-viewer";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Project } from "@/shared/types/api";
import type { AnswerRow } from "../types";

/**
 * One answer opened like a chat: the question on the right, ChatGPT's answer on the left, details
 * beside it (who it names and where, the sites it cites). Previous and Next (or the arrow keys) walk
 * through the rows the table shows.
 */
export function ChatDialog({
  rows,
  index,
  project,
  collectedAt,
  questionHref,
  onIndex,
  onClose,
}: {
  rows: AnswerRow[];
  /** The row open, or null when closed. */
  index: number | null;
  project: Project;
  collectedAt: string;
  questionHref: (topic: string) => string;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("AnswersPage.dialog");
  // Keeps the last answer on screen while the window closes
  const [last, setLast] = useState(index);
  if (index !== null && index !== last) setLast(index);
  const shown = index ?? last;
  const row = shown === null ? undefined : rows[shown];

  function onKeyDown(event: KeyboardEvent) {
    if (shown === null) return;
    // Arrow keys move between answers, unless the user is reading a scrolled table inside the answer
    if (event.key === "ArrowLeft" && shown > 0) onIndex(shown - 1);
    if (event.key === "ArrowRight" && shown < rows.length - 1) onIndex(shown + 1);
  }

  return (
    <Dialog.Root open={index !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/25 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]" />
        <Dialog.Popup
          onKeyDown={onKeyDown}
          className="fixed inset-0 z-50 flex flex-col bg-background outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(48rem,92vh)] sm:w-[min(72rem,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-foreground/10"
        >
          {row && shown !== null && (
            <Conversation
              row={row}
              position={shown}
              total={rows.length}
              project={project}
              collectedAt={collectedAt}
              questionHref={questionHref}
              onIndex={onIndex}
            />
          )}
          <Dialog.Close render={<Button variant="ghost" size="icon-sm" className="absolute top-2.5 right-2.5 z-10" />}>
            <X aria-hidden />
            <span className="sr-only">{t("close")}</span>
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Conversation({
  row,
  position,
  total,
  project,
  collectedAt,
  questionHref,
  onIndex,
}: {
  row: AnswerRow;
  position: number;
  total: number;
  project: Project;
  collectedAt: string;
  questionHref: (topic: string) => string;
  onIndex: (index: number) => void;
}) {
  const t = useTranslations("AnswersPage.dialog");
  const engines = useTranslations("Engines");
  const messages = useMessages();
  const { result, answer } = row;
  const brands: Brand[] = [project.brand, ...project.competitors];

  return (
    <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-h-0 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b py-2.5 pr-14 pl-4">
          <Dialog.Title className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm font-medium">
            <Bot aria-hidden className="size-4" />
            {engines("chatgpt")}
          </Dialog.Title>
          <span className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm text-muted-foreground">
            <MapPin aria-hidden className="size-4" />
            {labelFor(messages.Cities, project.city)}
          </span>
          <span className="rounded-lg border px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">{result.prompt.language}</span>
          <Link
            href={questionHref(result.prompt.topic)}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("openQuestion")}
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-8">
            <div className="flex items-start justify-end gap-3">
              <p lang={result.prompt.language} className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-pretty">
                {result.prompt.text}
              </p>
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="size-4" />
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Bot className="size-4" />
              </span>
              <div lang={result.prompt.language} className="min-w-0 flex-1">
                <AnswerMarkdown answer={answer} brands={brands} youId={project.brand.id} />
              </div>
            </div>
            {/* On phones the details come under the answer */}
            <div className="border-t pt-5 md:hidden">
              <Details row={row} project={project} collectedAt={collectedAt} />
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t px-3 py-2.5">
          <Button variant="ghost" disabled={position === 0} onClick={() => onIndex(position - 1)}>
            <ArrowLeft aria-hidden data-icon="inline-start" />
            {t("previous")}
          </Button>
          <span aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            {t("counter", { index: position + 1, total })}
          </span>
          <Button variant="ghost" disabled={position === total - 1} onClick={() => onIndex(position + 1)}>
            {t("next")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Button>
        </footer>
      </div>

      <aside aria-label={t("details")} className="hidden min-h-0 flex-col overflow-y-auto border-l bg-muted/30 md:flex">
        <p className="border-b px-4 py-3.5 font-medium">{t("details")}</p>
        <div className="p-4">
          <Details row={row} project={project} collectedAt={collectedAt} />
        </div>
      </aside>
    </div>
  );
}

/** Who the answer names, in order and with its tone; the sites it cites; and what was asked when. */
function Details({ row, project, collectedAt }: { row: AnswerRow; project: Project; collectedAt: string }) {
  const t = useTranslations("AnswersPage.dialog");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { result, answer } = row;
  const names = new Map([project.brand, ...project.competitors].map((brand) => [brand.id, brand.name]));
  const mentions = [...answer.mentions].sort((a, b) => a.position - b.position);
  const pages = [...new Map(answer.citations.map((citation) => [citation.url, citation])).values()];

  return (
    <div className="flex flex-col gap-5 text-sm">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{t("named")}</h3>
        {mentions.length ? (
          <ol className="flex flex-col gap-1.5">
            {mentions.map((mention) => (
              <li
                key={mention.brandId}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5",
                  mention.brandId === project.brand.id ? "bg-you-soft/40 ring-1 ring-you/30" : "bg-background ring-1 ring-foreground/10",
                )}
              >
                <span className="w-6 text-muted-foreground tabular-nums">#{mention.position}</span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {names.get(mention.brandId) ?? mention.brandId}
                  {mention.brandId === project.brand.id && <span className="font-normal text-muted-foreground"> · {t("you")}</span>}
                </span>
                <ToneIcon tone={mention.tone} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">{t("noneNamed")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">
          {t("sources")} · {pages.length}
        </h3>
        {pages.length ? (
          <ul className="flex flex-col gap-1">
            {pages.map((page) => (
              <li key={page.url} className="min-w-0">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-background"
                >
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center rounded bg-background text-[0.65rem] font-semibold text-muted-foreground uppercase ring-1 ring-border"
                  >
                    {page.domain.charAt(0)}
                  </span>
                  <span className="truncate">{page.domain}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("noSources")}</p>
        )}
      </section>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t pt-4">
        <dt className="text-muted-foreground">{t("topic")}</dt>
        <dd>{labelFor(messages.Topics, result.prompt.topic)}</dd>
        <dt className="text-muted-foreground">{t("sample")}</dt>
        <dd className="tabular-nums">
          {answer.sample} / {result.answers.length}
        </dd>
        <dt className="text-muted-foreground">{t("date")}</dt>
        <dd>{formatLongDate(collectedAt, locale, timeZone)}</dd>
      </dl>
    </div>
  );
}
