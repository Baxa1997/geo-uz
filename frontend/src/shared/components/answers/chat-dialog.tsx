"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe, ListOrdered, MapPin, Search, User, X } from "lucide-react";
import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent } from "react";
import { EngineIcon } from "@/shared/components/engine-icon";
import { Hint } from "@/shared/components/hint";
import { AnswerMarkdown } from "@/shared/components/scores/answer-viewer";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { engineOf, TIME_ZONE, type EngineKey } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { shortUrl } from "@/shared/helpers/domain";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Project, Prompt } from "@/shared/types/api";
import type { AnswerRow } from "@/shared/types/scores";

/** The details list this many of an answer's sources; "all" shows the rest. */
const SOURCES_SHOWN = 5;

/**
 * One answer opened like a chat, laid out like Peec's chat window: two cards in one frame. On the left the
 * conversation, under a bar that says which AI assistant answered, for which city and in which language,
 * with a link to the question's own page; Previous and Next (or the arrow keys) walk through the rows the
 * list shows. On the right the details: who the answer names and where, the pages it cites (title over
 * address), what the assistant searched the web for. On a phone the details come under the answer.
 * `questionHref` is left out on the question's own page.
 */
export function ChatDialog({
  rows,
  index,
  project,
  collectedAt,
  engine = "chatgpt",
  questionHref,
  onIndex,
  onClose,
}: {
  rows: AnswerRow[];
  /** The row open, or null when closed. */
  index: number | null;
  project: Project;
  collectedAt: string;
  /** The assistant that gave the answers: the report's `method.engine`. */
  engine?: string;
  questionHref?: (prompt: Prompt) => string;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("AnswersPage.dialog");
  const popup = useRef<HTMLDivElement>(null);
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

  const close = (className?: string) => (
    <Dialog.Close render={<Button variant="ghost" size="icon-sm" className={cn("shrink-0 text-muted-foreground", className)} />}>
      <X aria-hidden />
      <span className="sr-only">{t("close")}</span>
    </Dialog.Close>
  );

  return (
    <Dialog.Root open={index !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/25 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]" />
        <Dialog.Popup
          ref={popup}
          // The window itself takes the focus: on its first chip, that chip's explanation would open over the answer
          initialFocus={popup}
          onKeyDown={onKeyDown}
          // The frame around the two cards: full screen on a phone, a centered window from sm up
          className="fixed inset-0 z-50 flex bg-background outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(46rem,92vh)] sm:w-[min(64rem,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-1.5 sm:shadow-2xl sm:ring-1 sm:ring-foreground/10"
        >
          {row && shown !== null && (
            <div className="grid min-h-0 min-w-0 flex-1 gap-1.5 md:grid-cols-[minmax(0,1fr)_18rem]">
              <Conversation
                row={row}
                position={shown}
                total={rows.length}
                project={project}
                collectedAt={collectedAt}
                engine={engineOf(engine)}
                questionHref={questionHref}
                onIndex={onIndex}
                // Under md the details have no card of their own, so the bar closes the window
                close={close("md:hidden")}
              />
              <aside aria-label={t("details")} className="hidden min-h-0 flex-col overflow-hidden rounded-xl bg-muted md:flex">
                <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b pr-1.5 pl-3">
                  <p className="text-[0.9375rem] font-semibold">{t("details")}</p>
                  {close()}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {/* Keyed: "show all" starts closed again on the next answer */}
                  <Details key={`${row.result.prompt.id}:${row.answer.sample}`} row={row} project={project} collectedAt={collectedAt} />
                </div>
              </aside>
            </div>
          )}
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
  engine,
  questionHref,
  onIndex,
  close,
}: {
  row: AnswerRow;
  position: number;
  total: number;
  project: Project;
  collectedAt: string;
  engine: EngineKey;
  questionHref?: (prompt: Prompt) => string;
  onIndex: (index: number) => void;
  close: React.ReactNode;
}) {
  const t = useTranslations("AnswersPage.dialog");
  const engines = useTranslations("Engines");
  const messages = useMessages();
  const { result, answer } = row;
  const brands: Brand[] = [project.brand, ...project.competitors];

  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background sm:rounded-xl sm:border">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b pr-1.5 pl-3 sm:gap-3 md:pr-3">
        {/* Which assistant answered: the window's name */}
        <Dialog.Title className="flex shrink-0 text-sm font-normal">
          <Hint text={t("hints.engine")} side="bottom" className="h-6 items-center gap-1.5 rounded-md border bg-muted/60 px-2 text-muted-foreground">
            <EngineIcon engine={engine} className="size-3.5" />
            {engines(engine)}
          </Hint>
        </Dialog.Title>
        <Hint text={t("hints.city")} side="bottom" className="min-w-0 items-center gap-1.5 text-sm font-medium">
          <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{labelFor(messages.Cities, project.city)}</span>
        </Hint>
        <Hint text={t("hints.language")} side="bottom" className="shrink-0 text-xs font-semibold text-muted-foreground uppercase">
          {result.prompt.language}
        </Hint>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {questionHref && (
            <Link
              href={questionHref(result.prompt)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm whitespace-nowrap text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t("openQuestion")}
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          )}
          {close}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          <div className="flex items-start justify-end gap-2.5">
            <p lang={result.prompt.language} className="max-w-[85%] rounded-xl bg-muted px-3 py-1.5 text-sm text-pretty">
              {result.prompt.text}
            </p>
            <span aria-hidden className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted-foreground/60 text-background">
              <User className="size-3.5" />
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <EngineIcon engine={engine} className="size-3.5" />
            </span>
            <div lang={result.prompt.language} className="min-w-0 flex-1">
              <AnswerMarkdown answer={answer} brands={brands} youId={project.brand.id} />
            </div>
          </div>
          {/* On phones the details come under the answer */}
          <div className="border-t pt-5 md:hidden">
            <Details key={`${result.prompt.id}:${answer.sample}`} row={row} project={project} collectedAt={collectedAt} />
          </div>
        </div>
      </div>

      <footer className="flex h-10 shrink-0 items-center justify-between gap-3 border-t px-1.5">
        <Button variant="ghost" size="sm" className="text-sm" disabled={position === 0} onClick={() => onIndex(position - 1)}>
          <ArrowLeft aria-hidden data-icon="inline-start" />
          {t("previous")}
        </Button>
        <span aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
          {t("counter", { index: position + 1, total })}
        </span>
        <Button variant="ghost" size="sm" className="text-sm" disabled={position === total - 1} onClick={() => onIndex(position + 1)}>
          {t("next")}
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Button>
      </footer>
    </div>
  );
}

/** A section of the details: an icon and a gray label that explains itself on hover, then the content. */
function Section({ icon: Icon, label, hint, children }: { icon: typeof Globe; label: React.ReactNode; hint: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
        <Icon aria-hidden className="size-4 shrink-0" />
        <Hint text={hint}>{label}</Hint>
      </h3>
      {children}
    </section>
  );
}

/** Who the answer names, in order and with its tone; the pages it cites; what the assistant searched for; and what was asked when. */
function Details({ row, project, collectedAt }: { row: AnswerRow; project: Project; collectedAt: string }) {
  const t = useTranslations("AnswersPage.dialog");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const [all, setAll] = useState(false);
  const { result, answer } = row;
  const names = new Map([project.brand, ...project.competitors].map((brand) => [brand.id, brand.name]));
  const mentions = [...answer.mentions].sort((a, b) => a.position - b.position);
  const pages = [...new Map(answer.citations.map((citation) => [citation.url, citation])).values()];

  return (
    <div className="flex flex-col gap-6 text-sm">
      <Section icon={ListOrdered} label={t("named")} hint={t("hints.named")}>
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
      </Section>

      <Section
        icon={Globe}
        label={
          <>
            {t("sources")} · {pages.length}
          </>
        }
        hint={t("hints.sources")}
      >
        {pages.length ? (
          <>
            {/* As on Peec: the page's title, and its address under it */}
            <ul className="-mx-1.5 flex flex-col gap-1">
              {(all ? pages : pages.slice(0, SOURCES_SHOWN)).map((page) => (
                <li key={page.url} className="min-w-0">
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex flex-col rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="flex size-4 shrink-0 items-center justify-center rounded bg-background text-[0.6rem] font-semibold text-muted-foreground uppercase ring-1 ring-border"
                      >
                        {page.domain.charAt(0)}
                      </span>
                      <span className="truncate font-medium">{page.title ?? page.domain}</span>
                    </span>
                    <span className="line-clamp-2 break-all text-muted-foreground">{shortUrl(page.url)}</span>
                  </a>
                </li>
              ))}
            </ul>
            {pages.length > SOURCES_SHOWN && (
              <button
                type="button"
                aria-expanded={all}
                onClick={() => setAll(!all)}
                className="w-fit rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {all ? t("viewLess") : t("viewAll", { count: pages.length })}
              </button>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">{t("noSources")}</p>
        )}
      </Section>

      <Section
        icon={Search}
        label={
          <>
            {t("searches")} · {answer.searches.length}
          </>
        }
        hint={t("hints.searches")}
      >
        {answer.searches.length ? (
          <ul className="flex flex-col gap-1.5">
            {answer.searches.map((query) => (
              <li key={query} className="min-w-0 text-pretty">
                {query}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("noSearches")}</p>
        )}
      </Section>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t pt-4">
        <dt className="text-muted-foreground">{t("topic")}</dt>
        <dd>{labelFor(messages.Topics, result.prompt.topic)}</dd>
        <dt className="text-muted-foreground">
          <Hint text={t("hints.sample")}>{t("sample")}</Hint>
        </dt>
        <dd className="tabular-nums">
          {answer.sample} / {result.answers.length}
        </dd>
        <dt className="text-muted-foreground">{t("date")}</dt>
        <dd>{formatLongDate(collectedAt, locale, timeZone)}</dd>
      </dl>
    </div>
  );
}
