"use client";

import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, Pencil, Plus, Tag } from "lucide-react";
import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { MAX_PROMPTS, MIN_PROMPTS, TIME_ZONE } from "@/shared/constants";
import { formatIsoDay, formatShortDate, formatWeekdayDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { FILTER_PARAMS, withFilters } from "@/shared/helpers/report-filters";
import { toneOf } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Prompt, PromptResult, ReportFilters, SuggestedPrompt } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { promptStats } from "../helpers/stats";
import { PromptForm } from "./prompt-form";
import { PromptSuggestions } from "./prompt-suggestions";

const dash = <span className="text-muted-foreground">—</span>;

/** The client's numbers over the questions on screen, for the line above the table. */
export interface PromptsSummary {
  visibility: number | null;
  sentiment: number | null;
  position: number | null;
}

/**
 * The project's questions, laid out like Peec's prompts page: topics on the left (each with its count,
 * picking one narrows the list), the tracked and suggested questions on the right with how many of the
 * plan's questions are used, the client's numbers over the list, and the table: each question's
 * visibility, tone, position, the brands named and who leads. Inline add and edit; CSV export; the
 * footer says when the questions are asked again.
 */
export function PromptManager({
  projectId,
  initialPrompts,
  results,
  brands,
  series,
  youId,
  collectedAt,
  filters,
  initialSuggestions,
  filename,
  nextRunAt,
  summary,
}: {
  projectId: string;
  initialPrompts: Prompt[];
  initialSuggestions: SuggestedPrompt[];
  /** For the CSV download, without the extension. */
  filename: string;
  /** The latest run's results; a question without one hasn't been asked yet. */
  results: PromptResult[];
  brands: Brand[];
  /** The tracked brands with their colors, for the "brands named" column. */
  series: SeriesBrand[];
  youId: string;
  collectedAt: string;
  filters: ReportFilters;
  /** When the questions are asked again; a question added now is asked from then. */
  nextRunAt: string | null;
  summary: PromptsSummary;
}) {
  const t = useTranslations("PromptManager");
  const tones = useTranslations("Tone");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { data: prompts } = useQuery({
    queryKey: queryKeys.prompts(projectId),
    queryFn: () => api.getPrompts(projectId),
    initialData: initialPrompts,
  });
  const { data: suggestions } = useQuery({
    queryKey: queryKeys.promptSuggestions(projectId),
    queryFn: () => api.getPromptSuggestions(projectId),
    initialData: initialSuggestions,
  });
  const [view, setView] = useState<"tracked" | "suggested">("tracked");
  // "new" = the add form is open; a prompt id = that prompt is being edited
  const [editing, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);

  // Topics with their counts, over the questions in the chosen language
  const inLanguage = prompts.filter((prompt) => !filters.language || prompt.language === filters.language);
  const topics = [...new Set(inLanguage.map((prompt) => prompt.topic))].map((topic) => ({
    topic,
    label: labelFor(messages.Topics, topic),
    count: inLanguage.filter((prompt) => prompt.topic === topic).length,
  }));
  const visible = inLanguage.filter((prompt) => !filters.topic || prompt.topic === filters.topic);
  const lastRun = formatShortDate(collectedAt, locale, timeZone);
  const byId = new Map(series.map((brand) => [brand.id, brand]));
  const rows = visible.map((prompt) => {
    const result = results.find((r) => r.prompt.id === prompt.id);
    const named = result
      ? series.filter((brand) => result.answers.some((answer) => answer.mentions.some((mention) => mention.brandId === brand.id)))
      : [];
    return {
      prompt,
      named,
      stats: result && promptStats(result, brands, youId),
      answersHref: withFilters(`/projects/${projectId}/answers`, filters, { prompt: prompt.id }),
    };
  });
  type Row = (typeof rows)[number];

  function pickTopic(topic: string) {
    const query: Record<string, string> = Object.fromEntries(params);
    if (topic) query[FILTER_PARAMS.topic] = topic;
    else delete query[FILTER_PARAMS.topic];
    startTransition(() => router.replace({ pathname, query }, { scroll: false }));
  }

  const form = (prompt?: Prompt) => (
    <PromptForm
      projectId={projectId}
      prompt={prompt}
      defaultLanguage={prompt?.language ?? filters.language ?? "uz"}
      existing={prompts}
      onDone={close}
    />
  );
  const run = ({ stats }: Row) =>
    stats ? (
      <span className="whitespace-nowrap text-muted-foreground">{lastRun}</span>
    ) : (
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap">{t("queued")}</span>
    );
  const visibility = (row: Row) =>
    row.stats ? (
      <span title={t("visibilityHint", { count: row.stats.named, total: row.stats.total })} className="tabular-nums">
        <span className={cn("font-semibold", row.stats.named === 0 && "text-muted-foreground")}>
          {formatPercent(row.stats.total ? row.stats.named / row.stats.total : 0, locale)}
        </span>{" "}
        <span className="text-xs text-muted-foreground">
          {row.stats.named}/{row.stats.total}
        </span>
        <span className="sr-only"> {t("visibilityHint", { count: row.stats.named, total: row.stats.total })}</span>
      </span>
    ) : (
      // Not asked yet: queued for the next weekly run
      run(row)
    );
  const position = ({ stats }: Row) =>
    stats?.position ? (
      <span className="font-medium tabular-nums">
        <span aria-hidden className="font-normal text-muted-foreground">
          #
        </span>
        {formatDecimal(stats.position, locale)}
      </span>
    ) : (
      dash
    );
  const toneIcons = ({ stats }: Row) =>
    stats && stats.tones.length > 0 ? (
      <span className="inline-flex gap-px align-middle">
        {stats.tones.map((tone, index) => (
          <ToneIcon key={index} tone={tone} />
        ))}
      </span>
    ) : (
      dash
    );
  const namedChips = ({ named, stats }: Row) =>
    !stats ? (
      dash
    ) : named.length === 0 ? (
      <span className="text-muted-foreground">{t("nobody")}</span>
    ) : (
      <ul className="flex flex-wrap gap-1">
        {named.map((brand) => (
          <li
            key={brand.id}
            title={brand.name}
            className={cn(
              "flex h-6 items-center gap-1 rounded-md px-1.5 text-[0.7rem] font-semibold",
              brand.isYou ? "bg-you-soft/60 ring-1 ring-you/30" : "bg-muted",
            )}
          >
            <span aria-hidden className="size-2 rounded-full" style={{ background: brand.color }} />
            <span aria-hidden>{brand.name.charAt(0).toUpperCase()}</span>
            <span className="sr-only">{brand.name}</span>
          </li>
        ))}
      </ul>
    );
  const leader = ({ stats }: Row) =>
    !stats ? (
      dash
    ) : !stats.leader ? (
      <span className="text-muted-foreground">{t("nobody")}</span>
    ) : stats.leader.id === youId ? (
      <span className="rounded-md bg-you-soft px-1.5 py-0.5 text-xs font-medium ring-1 ring-you/40">{t("you")}</span>
    ) : (
      <span className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: byId.get(stats.leader.id)?.color }} />
        <span className="truncate">{stats.leader.name}</span>
      </span>
    );
  const actions = ({ prompt, stats, answersHref }: Row) => (
    <span className="flex justify-end gap-0.5">
      {stats && (
        <Link
          href={answersHref}
          aria-label={`${t("openAnswers")}: ${prompt.text}`}
          title={t("openAnswers")}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <MessagesSquare aria-hidden />
        </Link>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${t("edit")}: ${prompt.text}`}
        title={t("edit")}
        onClick={() => setEditing(prompt.id)}
      >
        <Pencil aria-hidden />
      </Button>
    </span>
  );
  const csvRows = () => [
    [
      t("csvHeaders.question"),
      t("csvHeaders.language"),
      t("csvHeaders.topic"),
      t("csvHeaders.visibility"),
      t("csvHeaders.named"),
      t("csvHeaders.total"),
      t("csvHeaders.position"),
      t("csvHeaders.tones"),
      t("csvHeaders.leader"),
      t("csvHeaders.lastRun"),
    ],
    ...rows.map(({ prompt, stats }) => [
      prompt.text,
      prompt.language.toUpperCase(),
      labelFor(messages.Topics, prompt.topic),
      stats && stats.total ? Math.round((stats.named / stats.total) * 100) : null,
      stats?.named ?? null,
      stats?.total ?? null,
      stats?.position ? Math.round(stats.position * 10) / 10 : null,
      stats ? stats.tones.map((tone) => tones(tone)).join(", ") : null,
      !stats ? null : stats.leader ? stats.leader.name : t("nobody"),
      stats ? formatIsoDay(collectedAt, timeZone) : t("queued"),
    ]),
  ];
  const used = Math.min(1, prompts.length / MAX_PROMPTS);

  return (
    <div
      aria-busy={pending}
      className={cn(
        "@container overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-opacity",
        pending && "opacity-70",
      )}
    >
      <div className="grid @3xl:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Topics: a column on wide panels, a filter on narrow ones */}
        <nav aria-label={t("topics")} className="hidden flex-col border-r @3xl:flex">
          <p className="flex h-14 items-center border-b px-4 text-sm font-medium">{t("topics")}</p>
          <ul className="flex flex-col gap-0.5 p-2">
            {[{ topic: "", label: t("allTopics"), count: inLanguage.length }, ...topics].map((item) => {
              const current = (filters.topic ?? "") === item.topic;
              return (
                <li key={item.topic || "all"}>
                  <button
                    type="button"
                    aria-current={current ? "true" : undefined}
                    onClick={() => pickTopic(item.topic)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      current ? "bg-muted font-medium" : "text-foreground/80 hover:bg-muted/50",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2">
            <div role="group" aria-label={t("tabsLabel")} className="flex items-center gap-4 self-stretch">
              {(["tracked", "suggested"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    "-mb-2 flex items-center gap-1.5 self-end border-b-2 pb-2 text-sm transition-colors",
                    view === option ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option === "tracked" ? t("tabActive") : t("tabSuggested")}
                  <span className="text-xs tabular-nums opacity-70">{option === "tracked" ? prompts.length : suggestions.length}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span title={t("usedHint", { max: MAX_PROMPTS })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                <svg viewBox="0 0 20 20" aria-hidden className="size-5 -rotate-90">
                  <circle cx="10" cy="10" r="8" fill="none" className="stroke-muted" strokeWidth="3" />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    className="stroke-positive"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 8}
                    strokeDashoffset={2 * Math.PI * 8 * (1 - used)}
                  />
                </svg>
                <span>
                  <span className="font-medium text-foreground">{prompts.length}</span>/{MAX_PROMPTS}
                </span>
                <span className="sr-only">{t("usedHint", { max: MAX_PROMPTS })}</span>
              </span>
              <Button
                className="h-8"
                onClick={() => {
                  setView("tracked");
                  setEditing("new");
                }}
                disabled={view === "tracked" && editing === "new"}
              >
                <Plus aria-hidden data-icon="inline-start" />
                {t("add")}
              </Button>
            </div>
          </div>

          {view === "suggested" ? (
            <div className="p-4">
              <PromptSuggestions projectId={projectId} suggestions={suggestions} />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                  <span className="@3xl:hidden">
                    <FilterMenu
                      icon={Tag}
                      label={t("topics")}
                      value={filters.topic ?? ""}
                      options={[{ value: "", label: t("allTopics"), count: inLanguage.length }, ...topics.map(({ topic, label, count }) => ({ value: topic, label, count }))]}
                      onChange={pickTopic}
                    />
                  </span>
                  <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <dt>{t("columns.visibility")}</dt>
                      <dd className="font-semibold text-foreground tabular-nums">{summary.visibility !== null ? `${summary.visibility}%` : "—"}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt>{t("columns.tone")}</dt>
                      <dd className="flex items-center gap-1 font-semibold text-foreground tabular-nums">
                        {summary.sentiment !== null && <ToneIcon tone={toneOf(summary.sentiment)} />}
                        {summary.sentiment ?? "—"}
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt>{t("columns.position")}</dt>
                      <dd className="font-semibold text-foreground tabular-nums">
                        {summary.position !== null ? `#${formatDecimal(summary.position, locale)}` : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
                {rows.length > 0 && <CsvButton filename={filename} label={t("csv")} hint={t("csvHint")} rows={csvRows} />}
              </div>

              {prompts.length > 0 && prompts.length < MIN_PROMPTS && (
                <p className="mx-4 mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{t("belowMin")}</p>
              )}
              {prompts.length > MAX_PROMPTS && <p className="mx-4 mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{t("aboveMax")}</p>}
              {editing === "new" && <div className="border-b p-4">{form()}</div>}

              {prompts.length === 0 ? (
                editing !== "new" && (
                  <div className="m-4 flex flex-col gap-1 rounded-lg border border-dashed p-4 text-center">
                    <p className="font-medium">{t("empty")}</p>
                    <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
                  </div>
                )
              ) : rows.length === 0 ? (
                <p className="m-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("noMatch")}</p>
              ) : (
                <>
                  {/* Wide panel: a table */}
                  <table className="hidden w-full table-fixed text-sm @4xl:table">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground [&>th]:px-2 [&>th]:py-2.5 [&>th]:font-medium [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
                        <th scope="col">{t("columns.question")}</th>
                        <th scope="col" className="w-24">
                          {t("columns.visibility")}
                        </th>
                        <th scope="col" className="w-20">
                          {t("columns.tone")}
                        </th>
                        <th scope="col" className="w-16">
                          {t("columns.position")}
                        </th>
                        <th scope="col" className="w-32">
                          {t("columns.named")}
                        </th>
                        <th scope="col" className="w-32">
                          {t("columns.leader")}
                        </th>
                        <th scope="col" className="w-20">
                          <span className="sr-only">{t("columns.actions")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((row) =>
                        editing === row.prompt.id ? (
                          <tr key={row.prompt.id}>
                            <td colSpan={7} className="px-4 py-3">
                              {form(row.prompt)}
                            </td>
                          </tr>
                        ) : (
                          <tr key={row.prompt.id} className="transition-colors hover:bg-muted/30 [&>td]:px-2 [&>td]:py-2.5 [&>td:first-child]:pl-4 [&>td:last-child]:pr-2">
                            <td>
                              <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">{row.prompt.language}</span>
                              <span lang={row.prompt.language} className="text-pretty">
                                {row.prompt.text}
                              </span>
                              {!filters.topic && (
                                <span className="ml-2 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
                                  {labelFor(messages.Topics, row.prompt.topic)}
                                </span>
                              )}
                            </td>
                            <td>{visibility(row)}</td>
                            <td>{toneIcons(row)}</td>
                            <td>{position(row)}</td>
                            <td>{namedChips(row)}</td>
                            <td>{leader(row)}</td>
                            <td>{actions(row)}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>

                  {/* Narrow panel: the same rows as cards */}
                  <ul className="divide-y @4xl:hidden">
                    {rows.map((row) =>
                      editing === row.prompt.id ? (
                        <li key={row.prompt.id} className="px-4 py-3">
                          {form(row.prompt)}
                        </li>
                      ) : (
                        <li key={row.prompt.id} className="flex items-start gap-2 py-3 pr-2 pl-4">
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <p className="text-sm text-pretty">
                              <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">{row.prompt.language}</span>
                              <span lang={row.prompt.language}>{row.prompt.text}</span>
                            </p>
                            <dl className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                              <div>
                                <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 whitespace-nowrap">
                                  {labelFor(messages.Topics, row.prompt.topic)}
                                </span>
                              </div>
                              {row.stats ? (
                                <>
                                  <Stat label={t("columns.visibility")}>{visibility(row)}</Stat>
                                  <Stat label={t("columns.position")}>{position(row)}</Stat>
                                  <Stat label={t("columns.tone")}>{toneIcons(row)}</Stat>
                                  <Stat label={t("columns.leader")}>{leader(row)}</Stat>
                                </>
                              ) : (
                                <div>{run(row)}</div>
                              )}
                            </dl>
                          </div>
                          {actions(row)}
                        </li>
                      ),
                    )}
                  </ul>
                </>
              )}

              <p className="flex flex-wrap items-center gap-x-2 border-t px-4 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("count", { count: prompts.length })}</span>
                <span aria-hidden>·</span>
                <span>{t("recommended")}</span>
                {nextRunAt && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{t("schedule", { date: formatWeekdayDate(nextRunAt, locale, timeZone) })}</span>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** "Label value" pair in a question's card. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
