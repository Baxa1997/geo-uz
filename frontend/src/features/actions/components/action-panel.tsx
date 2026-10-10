"use client";

import { Check, ChevronsRight, Copy, ExternalLink, MessageSquare, RotateCcw, Undo2, X } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { ActionWhy } from "@/shared/components/actions/action-why";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { EngineIcon } from "@/shared/components/engine-icon";
import { Hint } from "@/shared/components/hint";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useAssistant } from "@/shared/hooks/use-assistant";
import { ACTION_STEP_COUNT } from "@/shared/constants";
import { shortUrl } from "@/shared/helpers/domain";
import { labelFor } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Action, ActionStatus, PromptLanguage } from "@/shared/types/api";
import { useActionTitle, listingKind } from "@/shared/components/actions/action-title";
import { META_DESCRIPTION_MAX, META_TITLE_MAX, STEPS } from "../constants";
import { categoryOf, topicOf } from "../helpers/grouping";
import { ActionProof } from "./action-proof";

/** A question an action should move, with how the client does on it now. */
export interface QuestionInfo {
  text: string;
  language: PromptLanguage;
  topic: string;
  /** Answers of the latest check naming the client, out of `total` (0 when not asked yet). */
  named: number;
  total: number;
}

/** A cited site's pages, for a listing: what ChatGPT reads there. */
export interface SitePages {
  pages: { url: string; title: string | null; count: number }[];
  /** All answers of the latest check: what a page's share is counted against. */
  answers: number;
}

/**
 * One action opened beside the list, laid out like Peec's: "Copy as prompt" (the action written as a
 * prompt to paste into ChatGPT or another assistant), the title, what it is, its topic and model, why it
 * matters, the brief for a page to write or rework (with GEO AI to draft it), the steps to check off, the
 * questions it should move (and, for a listing, the site's pages ChatGPT reads), and the expected
 * outcome; a done one shows what changed since. At the bottom, as on Peec, the buttons that move it on:
 * Decline or Accept, then Cancel or Done.
 */
export function ActionPanel({
  action,
  questions,
  sites,
  competitors,
  brand,
  nextRunAt,
  questionHref,
  busy,
  autoFocus = false,
  onClose,
  onStatus,
  onStep,
}: {
  action: Action;
  questions: Record<string, QuestionInfo>;
  sites: Record<string, SitePages>;
  competitors: Map<string, string>;
  brand: { name: string; domain: string };
  nextRunAt: string | null;
  questionHref: (promptId: string) => string;
  busy: boolean;
  /** Takes the focus when it opens over the page (a phone), as a window does. */
  autoFocus?: boolean;
  onClose: () => void;
  onStatus: (status: ActionStatus) => void;
  onStep: (step: number) => void;
}) {
  const t = useTranslations("Actions");
  const why = useTranslations("Actions.why");
  const messages = useMessages();
  const locale = useLocale();
  const title = useActionTitle();
  const { openAssistant } = useAssistant();
  const [copied, setCopied] = useState(false);
  const category = categoryOf(action);
  const stepsKey =
    category === "rework" ? "rework" : action.kind === "listing" ? listingKind(action.sourceType) : action.kind === "technical" ? action.check : action.kind;
  const stepText = (step: (typeof STEPS)[number]) => t(`steps.${stepsKey}.${step}`, { domain: action.kind === "listing" ? action.domain : brand.domain });
  const topic = topicOf(action, new Map(Object.entries(questions).map(([id, question]) => [id, question.topic])));
  const asked = action.promptIds.flatMap((id) => (questions[id] ? [{ id, ...questions[id] }] : []));
  const editable = action.status === "new" || action.status === "in_progress";
  const brief = action.kind === "content" ? action.brief : null;
  // The pages it is about: a listing's site, or the client's own site for a site fix or a wrong fact
  const siteDomain = action.kind === "listing" ? action.domain : action.kind === "content" ? null : brand.domain;
  const site = siteDomain ? sites[siteDomain] : undefined;

  /** Why, in words, for the prompt (ActionWhy shows the same on screen). */
  function whyText(): string {
    switch (action.kind) {
      case "listing": {
        const names = action.competitorIds.flatMap((id) => competitors.get(id) ?? []);
        return names.length
          ? why("listing", { answers: action.answers, domain: action.domain, competitors: names.join(", ") })
          : why("listingAlone", { answers: action.answers, domain: action.domain });
      }
      case "fact":
        return `${why("factSaid")}: “${action.claim}”. ${why("factCorrect")}: “${action.correct}”.`;
      case "content":
        return why("content", { count: action.promptIds.length });
      case "technical":
        return why(action.check);
    }
  }

  async function copyPrompt() {
    const lines = [
      t("prompt.intro", { brand: brand.name, domain: brand.domain }),
      t("prompt.task", { title: title(action) }),
      t("prompt.why", { why: whyText() }),
      t("prompt.steps"),
      ...STEPS.map((step, index) => `${index + 1}. ${stepText(step)}`),
      ...(brief
        ? [
            t("prompt.brief"),
            brief.summary,
            `${t("brief.headlines")}: ${brief.headlines.join(" / ")}`,
            `${t("brief.metaTitle")}: ${brief.metaTitle}`,
            `${t("brief.metaDescription")}: ${brief.metaDescription}`,
            `${t("brief.argue")}: ${brief.argue}`,
            `${t("brief.proofPoints")}: ${brief.proofPoints.join("; ")}`,
          ]
        : []),
      ...(asked.length > 0 ? [t("prompt.questions"), ...asked.map((question) => `- ${question.text}`)] : []),
      t("prompt.ask"),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Hint text={t("closePanel")} described={false}>
          {() => (
            <Button variant="ghost" size="icon-sm" aria-label={t("closePanel")} autoFocus={autoFocus} onClick={onClose}>
              <ChevronsRight aria-hidden className="size-[1.125rem]" />
            </Button>
          )}
        </Hint>
      </div>

      {/* `relative` holds the hidden labels inside the scroll, or they would stretch the page */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-9 overflow-y-auto px-5 pt-6 pb-28 text-foreground sm:px-8">
        <div className="flex flex-col gap-7">
          <div className="flex justify-end">
            <Hint text={t("copyHint")} described={false}>
              {() => (
                <Button variant="outline" onClick={() => void copyPrompt()} className="h-9 rounded-xl px-3.5 text-sm shadow-xs">
                  {copied ? <Check aria-hidden data-icon="inline-start" /> : <Copy aria-hidden data-icon="inline-start" />}
                  {copied ? t("copied") : t("copy")}
                </Button>
              )}
            </Hint>
          </div>
          <h2 className="text-[1.375rem] leading-snug font-semibold tracking-tight text-pretty">{title(action)}</h2>
        </div>

        <Section label={t("sections.overview")}>
          <p className={cn(BODY, "text-pretty")}>{t(`overview.${category}`, { domain: action.kind === "listing" ? action.domain : brand.domain })}</p>
        </Section>

        <Section label={t("sections.topic")}>
          <p className={BODY}>{topic ? labelFor(messages.Topics, topic) : t("noTopic")}</p>
        </Section>

        <Section label={t("sections.model")}>
          <p className={cn(BODY, "flex items-center gap-2")}>
            {/* A dark tile, as Peec marks the assistant; the icon is a generic one, not the company's logo */}
            <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
              <EngineIcon engine="chatgpt" className="size-4" />
            </span>
            ChatGPT
          </p>
        </Section>

        <Section label={t("sections.why")} tour="why">
          <ActionWhy action={action} competitors={competitors} prominent />
        </Section>

        {brief && (
          <Section label={t("sections.brief")} tour="brief">
            <div className="overflow-hidden rounded-xl border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <p className="min-w-0 text-[0.9375rem] font-semibold text-pretty">
                  {action.kind === "content" && action.url ? shortUrl(action.url) : brief.headlines[0]}
                </p>
                <Button data-tour="assistant" onClick={() => openAssistant(t("assistantQuestion", { title: title(action) }))} className="rounded-lg">
                  <MessageSquare aria-hidden data-icon="inline-start" />
                  {t("brief.assistant")}
                </Button>
              </div>
              <div className={cn(BODY, "flex flex-col gap-6 px-4 py-5")}>
                <p className="text-pretty">{brief.summary}</p>
                <BriefPart label={t("brief.headlines")}>
                  <ol className="flex flex-col gap-2">
                    {brief.headlines.map((headline, index) => (
                      <li key={headline} className="flex gap-3">
                        <span className="w-3 shrink-0 text-muted-foreground tabular-nums">{index + 1}</span>
                        {headline}
                      </li>
                    ))}
                  </ol>
                </BriefPart>
                <BriefPart label={t("brief.metaTitle")} count={brief.metaTitle.length} max={META_TITLE_MAX} hint={t("brief.metaTitleHint", { max: META_TITLE_MAX })}>
                  <p className="text-pretty">{brief.metaTitle}</p>
                </BriefPart>
                <BriefPart label={t("brief.metaDescription")} count={brief.metaDescription.length} max={META_DESCRIPTION_MAX} hint={t("brief.metaDescriptionHint", { max: META_DESCRIPTION_MAX })}>
                  <p className="text-pretty">{brief.metaDescription}</p>
                </BriefPart>
                <BriefPart label={t("brief.argue")}>
                  <p className="text-pretty">{brief.argue}</p>
                </BriefPart>
                <BriefPart label={t("brief.proofPoints")}>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
                    {brief.proofPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </BriefPart>
              </div>
            </div>
          </Section>
        )}

        <Section label={t("sections.steps")} aside={editable ? t("stepsProgress", { done: action.stepsDone.length, total: ACTION_STEP_COUNT }) : undefined}>
          <ol className="flex flex-col gap-2">
            {STEPS.map((step, index) => {
              // A done action shows every step ticked, as on Peec; its own ticks are kept for a reopen
              const checked = action.status === "done" || action.stepsDone.includes(index);
              return (
                <li key={step}>
                  <label
                    className={cn(
                      BODY,
                      "-mx-2 flex items-start gap-3 rounded-xl bg-muted px-3 py-3 text-pretty transition-colors",
                      editable && "cursor-pointer hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_6%)]",
                    )}
                  >
                    {/* Read-only once done or declined, but not grayed out: a ticked step stays clearly ticked */}
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-disabled={!editable}
                      onChange={() => editable && onStep(index)}
                      className={cn("mt-px size-[1.125rem] shrink-0 accent-you", editable ? "cursor-pointer" : "cursor-default")}
                    />
                    <span className={cn(checked && "text-foreground/55 line-through decoration-foreground/40")}>{stepText(step)}</span>
                  </label>
                </li>
              );
            })}
          </ol>
        </Section>

        {action.kind === "content" && (action.url || action.pageType) && (
          <Section label={t("sections.page")}>
            <div className={cn(BODY, "flex w-fit max-w-full flex-col gap-0.5 rounded-xl border px-4 py-3")}>
              {action.url ? (
                <a href={action.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-2 font-medium underline-offset-4 hover:underline">
                  <span className="truncate">{shortUrl(action.url)}</span>
                  <ExternalLink aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </a>
              ) : (
                <span className="font-medium">{t("uploadedText")}</span>
              )}
              {action.pageType && <span className="text-sm text-muted-foreground">{t(`pageTypes.${action.pageType}`)}</span>}
            </div>
          </Section>
        )}

        {site && site.pages.length > 0 && (
          <Section label={t("sections.sitePages")} hint={t("sitePagesHint", { domain: siteDomain ?? "" })}>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {site.pages.slice(0, 4).map((page) => (
                <li key={page.url} className="flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 transition-colors hover:bg-muted/50">
                  {/* The site's first letter in a tile, where Peec shows the site's icon */}
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground uppercase">
                    {shortUrl(page.url).charAt(0)}
                  </span>
                  <a href={page.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 flex-1 flex-col outline-none focus-visible:underline">
                    <span className="truncate text-[0.9375rem] font-medium">{page.title ?? shortUrl(page.url)}</span>
                    <span className="truncate text-sm text-muted-foreground">{shortUrl(page.url)}</span>
                  </a>
                  <Hint text={t("pageShare")} focusable={false} className="shrink-0 text-[0.9375rem] font-medium tabular-nums">
                    {formatPercent(site.answers ? page.count / site.answers : 0, locale)}
                  </Hint>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {asked.length > 0 && (
          <Section label={t("sections.questions")} hint={t("questionsHint")}>
            <ul className="flex flex-col gap-2.5">
              {asked.map((question) => (
                <li key={question.id}>
                  <Link href={questionHref(question.id)} className={cn(BODY, "flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/50")}>
                    <span className="min-w-0 flex-1 text-pretty">
                      <span className="mr-2 rounded bg-muted px-1 py-0.5 align-[0.1em] text-[0.6875rem] font-semibold text-muted-foreground uppercase">{question.language}</span>
                      <span lang={question.language}>{question.text}</span>
                    </span>
                    <Hint
                      text={question.total ? t("namedHint", { named: question.named, total: question.total }) : t("notAskedHint")}
                      focusable={false}
                      className={cn("shrink-0 font-medium tabular-nums", question.total && question.named === 0 ? "text-negative" : "text-foreground")}
                    >
                      {question.total ? `${question.named}/${question.total}` : "—"}
                    </Hint>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section label={t("sections.outcome")}>
          {action.status === "done" ? (
            <ActionProof action={action} nextRunAt={nextRunAt} />
          ) : (
            <div className="flex items-center gap-3.5 rounded-xl border px-4 py-3.5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-5">
                <ImpactBadge impact={action.impact} compact />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">{t("relativeImpact")}</span>
                <span className="text-[0.9375rem] font-semibold">{t(`impactLevels.${action.impact}`)}</span>
              </span>
            </div>
          )}
        </Section>
      </div>

      {/* The buttons that move it on, floating at the bottom as on Peec */}
      <div data-tour="decide" className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border bg-background p-1.5 shadow-lg">
        {action.status === "new" && (
          <>
            <Button variant="outline" disabled={busy} onClick={() => onStatus("declined")} className="h-9 px-3.5">
              <X aria-hidden data-icon="inline-start" />
              {t("decline")}
            </Button>
            <Button disabled={busy} onClick={() => onStatus("in_progress")} className="h-9 px-3.5">
              <Check aria-hidden data-icon="inline-start" />
              {t("accept")}
            </Button>
          </>
        )}
        {action.status === "in_progress" && (
          <>
            <Button variant="outline" disabled={busy} onClick={() => onStatus("new")} className="h-9 px-3.5">
              <X aria-hidden data-icon="inline-start" />
              {t("cancel")}
            </Button>
            <Button disabled={busy} onClick={() => onStatus("done")} className="h-9 px-3.5">
              <Check aria-hidden data-icon="inline-start" />
              {t("markDone")}
            </Button>
          </>
        )}
        {action.status === "done" && (
          <Button variant="outline" disabled={busy} onClick={() => onStatus("in_progress")} className="h-9 px-3.5">
            <RotateCcw aria-hidden data-icon="inline-start" />
            {t("reopen")}
          </Button>
        )}
        {action.status === "declined" && (
          <Button variant="outline" disabled={busy} onClick={() => onStatus("new")} className="h-9 px-3.5">
            <Undo2 aria-hidden data-icon="inline-start" />
            {t("restore")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The panel's text, as Peec's: 15px in the body's color, with room between the lines. */
const BODY = "text-[0.9375rem] leading-[1.45]";

/** A part of the panel: a gray label over its content, as on Peec. */
function Section({ label, hint, aside, tour, children }: { label: string; hint?: string; aside?: string; tour?: string; children: React.ReactNode }) {
  return (
    <section data-tour={tour} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.9375rem] text-muted-foreground">{hint ? <Hint text={hint}>{label}</Hint> : label}</h3>
        {aside && <span className="text-sm text-muted-foreground tabular-nums">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** A part of the brief; a title or description it measures shows its length against the limit, in red when over. */
function BriefPart({ label, count, max, hint, children }: { label: string; count?: number; max?: number; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {count !== undefined && max !== undefined && (
          <Hint text={hint ?? ""} focusable={false} className={cn("text-sm tabular-nums", count > max ? "font-semibold text-worse" : "text-muted-foreground")}>
            {count} / {max}
          </Hint>
        )}
      </div>
      {children}
    </div>
  );
}
