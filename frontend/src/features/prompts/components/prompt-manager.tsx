"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ChevronDown, ChevronsUpDown, ChevronUp, CircleAlert, CircleSlash, Pencil, Plus, Search, Tag } from "lucide-react";
import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { Button } from "@/shared/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { MIN_PROMPTS, TIME_ZONE } from "@/shared/constants";
import { formatIsoDay, formatShortDate, formatWeekdayDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { isTracked } from "@/shared/helpers/prompts";
import { FILTER_PARAMS, withFilters } from "@/shared/helpers/report-filters";
import { toneOf } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Plan, Prompt, PromptResult, ReportFilters, SuggestedPrompt, WrongFact } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { matchesFilter, PROMPTS_FILTERS, promptsSummary, promptStats, type PromptsFilter } from "../helpers/stats";
import { PromptArchive } from "./prompt-archive";
import { PromptForm } from "./prompt-form";
import { PromptSuggestions } from "./prompt-suggestions";

const dash = <span className="text-muted-foreground">—</span>;

type View = "tracked" | "suggested" | "archived";
const VIEWS: View[] = ["tracked", "suggested", "archived"];

/** The columns the table sorts by; without a sort the questions keep the order they were added in. */
type SortKey = "visibility" | "shareOfVoice" | "position" | "added";

const SORT_WIDTHS: Record<SortKey, string> = { visibility: "w-28", shareOfVoice: "w-28", position: "w-20", added: "w-28" };

/** The question stays in view while the other columns scroll sideways under it. */
const PINNED = "sticky left-0 z-[1] bg-card shadow-[inset_-1px_0_0_var(--border)]";

/**
 * The project's questions, laid out like Peec's prompts page: topics on the left (each with its count,
 * picking one narrows the list), on the right the tracked, suggested and archived questions with how many
 * of the plan's questions are used. The tracked ones are a table that scrolls sideways under the question:
 * visibility, share of voice, tone, position, the brands named, who leads, how often ChatGPT searched the
 * web, the wrong facts found and the date added, under a search, a filter and the client's numbers over
 * the rows shown. A click on a row opens the question's own page; a question is added and edited in
 * place, and archived when the client stops tracking it. CSV export; the footer says when the questions are asked again. Every heading,
 * figure and mark explains itself on hover (Hint), as on Peec.
 */
export function PromptManager({
  projectId,
  plan,
  limit,
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
  wrongFacts,
  wrongFactsHref,
}: {
  projectId: string;
  plan: Plan;
  /** Questions the plan lets the project track at once. */
  limit: number;
  /** Every question of the project, archived ones too. */
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
  /** What ChatGPT gets wrong about the client, each with the question it came up in. */
  wrongFacts: WrongFact[];
  /** The page that lists them. */
  wrongFactsHref: string;
}) {
  const t = useTranslations("PromptManager");
  const tones = useTranslations("Tone");
  const plans = useTranslations("Plans");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
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
  const [view, setView] = useState<View>("tracked");
  // "new" = the add form is open; a prompt id = that prompt is being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PromptsFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; reversed: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const close = () => setEditing(null);

  const archive = useMutation({
    mutationFn: ({ prompt, archived }: { prompt: Prompt; archived: boolean }) => api.archivePrompt(projectId, prompt.id, { archived }),
    onSuccess: (saved, { archived }) => {
      queryClient.setQueryData<Prompt[]>(queryKeys.prompts(projectId), (list = []) => list.map((prompt) => (prompt.id === saved.id ? saved : prompt)));
      setAnnouncement(t(archived ? "archivedNote" : "restoredNote", { text: saved.text }));
      // The report covers the tracked questions only: its results follow
      router.refresh();
    },
  });
  const busyId = archive.isPending ? archive.variables.prompt.id : null;

  const tracked = prompts.filter(isTracked);
  const archived = prompts.filter((prompt) => !isTracked(prompt));
  const full = tracked.length >= limit;
  const counts: Record<View, number> = { tracked: tracked.length, suggested: suggestions.length, archived: archived.length };
  const pageOf = (prompt: Prompt) => withFilters(`/projects/${projectId}/prompts/${prompt.id}`, filters);

  // Topics with their counts, over the tracked questions in the chosen language
  const inLanguage = tracked.filter((prompt) => !filters.language || prompt.language === filters.language);
  const topics = [...new Set(inLanguage.map((prompt) => prompt.topic))].map((topic) => ({
    topic,
    label: labelFor(messages.Topics, topic),
    count: inLanguage.filter((prompt) => prompt.topic === topic).length,
  }));
  const lastRun = formatShortDate(collectedAt, locale, timeZone);
  const byId = new Map(series.map((brand) => [brand.id, brand]));
  const inTopic = inLanguage
    .filter((prompt) => !filters.topic || prompt.topic === filters.topic)
    .map((prompt) => {
      const result = results.find((r) => r.prompt.id === prompt.id);
      const named = result
        ? series.filter((brand) => result.answers.some((answer) => answer.mentions.some((mention) => mention.brandId === brand.id)))
        : [];
      return { prompt, result, named, stats: result && promptStats(result, brands, youId) };
    });
  type Row = (typeof inTopic)[number];

  // What each sortable column sorts by; a question without the number goes last
  const sortValue: Record<SortKey, (row: Row) => number | null> = {
    visibility: ({ stats }) => (stats && stats.total ? stats.named / stats.total : null),
    shareOfVoice: ({ stats }) => stats?.shareOfVoice ?? null,
    position: ({ stats }) => stats?.position ?? null,
    added: ({ prompt }) => Date.parse(prompt.createdAt),
  };
  const search = query.trim().toLowerCase();
  const matching = inTopic.filter((row) => !search || row.prompt.text.toLowerCase().includes(search));
  const rows = matching.filter((row) => matchesFilter(row.stats, status));
  if (sort) {
    // Best first (the largest share, the earliest place, the latest date), or the other way round
    const value = sortValue[sort.key];
    const best = sort.key === "position" ? 1 : -1;
    rows.sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      if (x === null || y === null) return Number(x === null) - Number(y === null);
      return (x - y) * best * (sort.reversed ? -1 : 1);
    });
  }
  const summary = promptsSummary(rows.flatMap((row) => row.result ?? []), youId);
  const editingPrompt = tracked.find((prompt) => prompt.id === editing);

  function pickTopic(topic: string) {
    const next: Record<string, string> = Object.fromEntries(params);
    if (topic) next[FILTER_PARAMS.topic] = topic;
    else delete next[FILTER_PARAMS.topic];
    startTransition(() => router.replace({ pathname, query: next }, { scroll: false }));
  }

  /** A column heading that explains its column on hover and sorts: best first, then the other way round, then back to the order added. */
  function sortHeading(key: SortKey) {
    const label = t(`columns.${key}`);
    const sorted = sort?.key === key ? sort : null;
    // Best first means the largest share first, and the smallest place first
    const ascending = sorted ? sorted.reversed !== (key === "position") : false;
    const Icon = !sorted ? ChevronsUpDown : ascending ? ChevronUp : ChevronDown;
    return (
      <th scope="col" aria-sort={!sorted ? undefined : ascending ? "ascending" : "descending"} className={cn("p-0!", SORT_WIDTHS[key])}>
        <Hint text={`${t(`hints.${key}`)} ${t("hints.sort")}`} className="flex w-full">
          {(describedBy) => (
            <button
              type="button"
              aria-describedby={describedBy}
              onClick={() => setSort(!sorted ? { key, reversed: false } : sorted.reversed ? null : { key, reversed: true })}
              className={cn("flex w-full items-center gap-1 px-2 py-2.5 font-medium transition-colors outline-none hover:text-foreground focus-visible:bg-muted", sorted && "text-foreground")}
            >
              {label}
              <Icon aria-hidden className="size-3.5 shrink-0" />
            </button>
          )}
        </Hint>
      </th>
    );
  }

  /** A click anywhere on a question opens its page; the links, buttons (and, on a phone, hints) in it keep their own click. */
  function openQuestion(event: React.MouseEvent, prompt: Prompt, own = "a, button") {
    if (event.target instanceof Element && event.target.closest(own)) return;
    router.push(pageOf(prompt));
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
  const question = ({ prompt }: Row) => (
    <>
      <Hint text={t(`hints.language.${prompt.language}`)} focusable={false} described={false} className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">
        {prompt.language}
      </Hint>
      <Link href={pageOf(prompt)} lang={prompt.language} className="text-pretty underline-offset-4 outline-none hover:underline focus-visible:underline">
        {prompt.text}
      </Link>
    </>
  );
  const run = ({ stats }: Row) =>
    stats ? (
      <span className="whitespace-nowrap text-muted-foreground">{lastRun}</span>
    ) : (
      <Hint text={t("hints.queued")} focusable={false} className="rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap">
        {t("queued")}
      </Hint>
    );
  const visibility = (row: Row) =>
    row.stats ? (
      <Hint text={t("visibilityHint", { count: row.stats.named, total: row.stats.total })} focusable={false} described={false} className="items-baseline gap-1 tabular-nums">
        <span className={cn("font-semibold", row.stats.named === 0 && "text-muted-foreground")}>
          {formatPercent(row.stats.total ? row.stats.named / row.stats.total : 0, locale)}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.stats.named}/{row.stats.total}
        </span>
        <span className="sr-only"> {t("visibilityHint", { count: row.stats.named, total: row.stats.total })}</span>
      </Hint>
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
  const voice = ({ stats }: Row) =>
    stats && stats.shareOfVoice !== null ? <span className="font-medium tabular-nums">{formatPercent(stats.shareOfVoice, locale)}</span> : dash;
  const webSearch = ({ stats }: Row) =>
    stats ? (
      <Hint text={t("webSearchCell", { count: stats.searched, total: stats.total })} focusable={false} className="tabular-nums">
        <span className={cn("font-medium", stats.searched === 0 && "text-muted-foreground")}>{stats.searched}</span>
        <span className="text-muted-foreground">/{stats.total}</span>
      </Hint>
    ) : (
      dash
    );
  const factsOf = (prompt: Prompt) => wrongFacts.filter((fact) => fact.promptId === prompt.id).length;
  /** Our version of Peec's fact-checking switch: every question is checked, so the column shows what was found. */
  const facts = ({ prompt, stats }: Row) => {
    const count = factsOf(prompt);
    if (!stats) return dash;
    return count > 0 ? (
      <Hint text={t("wrongFactsSome", { count })} described={false}>
        {() => (
          <Link
            href={wrongFactsHref}
            aria-label={t("wrongFactsSome", { count })}
            className="inline-flex items-center gap-1 font-medium text-negative underline-offset-4 outline-none hover:underline focus-visible:underline"
          >
            <CircleAlert aria-hidden className="size-4" />
            {count}
          </Link>
        )}
      </Hint>
    ) : (
      <Hint text={t("wrongFactsNone")} focusable={false} className="text-muted-foreground">
        —
      </Hint>
    );
  };
  const added = ({ prompt }: Row) => <span className="whitespace-nowrap text-muted-foreground">{formatShortDate(prompt.createdAt, locale, timeZone)}</span>;
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
          <li key={brand.id} className="flex">
            <Hint
              text={brand.isYou ? `${brand.name} (${t("you")})` : brand.name}
              focusable={false}
              described={false}
              className={cn(
                "h-6 items-center gap-1 rounded-md px-1.5 text-[0.7rem] font-semibold",
                brand.isYou ? "bg-you-soft/60 ring-1 ring-you/30" : "bg-muted",
              )}
            >
              <span aria-hidden className="size-2 rounded-full" style={{ background: brand.color }} />
              <span aria-hidden>{brand.name.charAt(0).toUpperCase()}</span>
              <span className="sr-only">{brand.name}</span>
            </Hint>
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
  const actions = ({ prompt }: Row) => (
    <span className="flex justify-end gap-0.5">
      <Hint text={t("hints.edit")} described={false}>
        {() => (
          <Button variant="ghost" size="icon-sm" aria-label={`${t("edit")}: ${prompt.text}`} onClick={() => setEditing(prompt.id)}>
            <Pencil aria-hidden />
          </Button>
        )}
      </Hint>
      <Hint text={t("archiveHint")} described={false}>
        {() => (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${t("archive")}: ${prompt.text}`}
            disabled={busyId === prompt.id}
            onClick={() => archive.mutate({ prompt, archived: true })}
          >
            <Archive aria-hidden />
          </Button>
        )}
      </Hint>
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
      t("csvHeaders.shareOfVoice"),
      t("csvHeaders.position"),
      t("csvHeaders.tones"),
      t("csvHeaders.leader"),
      t("csvHeaders.webSearch"),
      t("csvHeaders.wrongFacts"),
      t("csvHeaders.lastRun"),
      t("csvHeaders.added"),
    ],
    ...rows.map(({ prompt, stats }) => [
      prompt.text,
      prompt.language.toUpperCase(),
      labelFor(messages.Topics, prompt.topic),
      stats && stats.total ? Math.round((stats.named / stats.total) * 100) : null,
      stats?.named ?? null,
      stats?.total ?? null,
      stats && stats.shareOfVoice !== null ? Math.round(stats.shareOfVoice * 100) : null,
      stats?.position ? Math.round(stats.position * 10) / 10 : null,
      stats ? stats.tones.map((tone) => tones(tone)).join(", ") : null,
      !stats ? null : stats.leader ? stats.leader.name : t("nobody"),
      stats?.searched ?? null,
      stats ? factsOf(prompt) : null,
      stats ? formatIsoDay(collectedAt, timeZone) : t("queued"),
      formatIsoDay(prompt.createdAt, timeZone),
    ]),
  ];
  const used = Math.min(1, tracked.length / limit);
  const usedHint = t("usedHint", { plan: plans(plan), max: limit });

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
          <p className="flex h-14 items-center border-b px-4 text-sm font-medium">
            <Hint text={t("hints.topics")}>{t("topics")}</Hint>
          </p>
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
              {VIEWS.map((option) => (
                <Hint key={option} text={t(`hints.tabs.${option}`)} className="-mb-2 self-end">
                  {(describedBy) => (
                    <button
                      type="button"
                      aria-pressed={view === option}
                      aria-describedby={describedBy}
                      onClick={() => setView(option)}
                      className={cn(
                        "flex items-center gap-1.5 border-b-2 pb-2 text-sm transition-colors",
                        view === option ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t(`tabs.${option}`)}
                      <span className="text-xs tabular-nums opacity-70">{counts[option]}</span>
                    </button>
                  )}
                </Hint>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Hint text={usedHint} described={false} className="items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
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
                  <span className="font-medium text-foreground">{tracked.length}</span>/{limit}
                </span>
                <span className="sr-only">{usedHint}</span>
              </Hint>
              <Button
                className="h-8"
                onClick={() => {
                  setView("tracked");
                  setEditing("new");
                }}
                disabled={full || (view === "tracked" && editing === "new")}
              >
                <Plus aria-hidden data-icon="inline-start" />
                {t("add")}
              </Button>
            </div>
          </div>

          {/* Why nothing can be added: said once, above whichever list is open */}
          {full && <p className="mx-4 mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-pretty">{t("full", { plan: plans(plan), max: limit })}</p>}
          {archive.isError && (
            <p role="alert" className="mx-4 mt-3 text-sm text-destructive">
              {t("saveFailed")}
            </p>
          )}

          {view === "suggested" ? (
            <div className="p-4">
              <PromptSuggestions projectId={projectId} suggestions={suggestions} full={full} />
            </div>
          ) : view === "archived" ? (
            <div className="p-4">
              <PromptArchive
                prompts={archived}
                full={full}
                busyId={busyId}
                href={pageOf}
                onRestore={(prompt) => archive.mutate({ prompt, archived: false })}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="relative w-full min-w-40 @md:w-56">
                    <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <label htmlFor="prompts-search" className="sr-only">
                      {t("search")}
                    </label>
                    <input
                      id="prompts-search"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t("search")}
                      className="h-8 w-full rounded-lg border bg-background pr-2 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                  <FilterMenu
                    icon={CircleSlash}
                    label={t("filter.label")}
                    value={status}
                    options={PROMPTS_FILTERS.map((option) => ({
                      value: option,
                      label: t(`filter.${option}`),
                      count: matching.filter((row) => matchesFilter(row.stats, option)).length,
                    }))}
                    onChange={setStatus}
                  />
                  <span className="@3xl:hidden">
                    <FilterMenu
                      icon={Tag}
                      label={t("topics")}
                      value={filters.topic ?? ""}
                      options={[{ value: "", label: t("allTopics"), count: inLanguage.length }, ...topics.map(({ topic, label, count }) => ({ value: topic, label, count }))]}
                      onChange={pickTopic}
                    />
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <dt>
                        <Hint text={t("hints.summary.visibility")}>{t("columns.visibility")}</Hint>
                      </dt>
                      <dd className="font-semibold text-foreground tabular-nums">{summary.visibility !== null ? `${summary.visibility}%` : "—"}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt>
                        <Hint text={t("hints.summary.tone")}>{t("columns.tone")}</Hint>
                      </dt>
                      <dd className="flex items-center gap-1 font-semibold text-foreground tabular-nums">
                        {summary.sentiment !== null && <ToneIcon tone={toneOf(summary.sentiment)} />}
                        {summary.sentiment ?? "—"}
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt>
                        <Hint text={t("hints.summary.position")}>{t("columns.position")}</Hint>
                      </dt>
                      <dd className="font-semibold text-foreground tabular-nums">
                        {summary.position !== null ? `#${formatDecimal(summary.position, locale)}` : "—"}
                      </dd>
                    </div>
                  </dl>
                  {rows.length > 0 && <CsvButton filename={filename} label={t("csv")} hint={t("csvHint")} rows={csvRows} />}
                </div>
              </div>

              {tracked.length > 0 && tracked.length < Math.min(MIN_PROMPTS, limit) && (
                <p className="mx-4 mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{t("belowMin")}</p>
              )}
              {editing === "new" && <div className="border-b p-4">{form()}</div>}
              {/* A row's edit form opens above the table: inside it, the form would be as wide as all its columns */}
              {editingPrompt && <div className="hidden border-b p-4 @4xl:block">{form(editingPrompt)}</div>}

              {tracked.length === 0 ? (
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
                  {/* Wide panel: a table that scrolls sideways under the question, as on Peec. relative + min-w-0: it scrolls here, not the page */}
                  <div className="relative hidden min-w-0 overflow-x-auto @4xl:block">
                    <table className="w-full min-w-[86rem] table-fixed text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground [&>th]:px-2 [&>th]:py-2.5 [&>th]:font-medium [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
                          <th scope="col" className={PINNED}>
                            <Hint text={t("hints.question")}>{t("columns.question")}</Hint>
                          </th>
                          {sortHeading("visibility")}
                          {sortHeading("shareOfVoice")}
                          <th scope="col" className="w-20">
                            <Hint text={t("hints.tone")}>{t("columns.tone")}</Hint>
                          </th>
                          {sortHeading("position")}
                          <th scope="col" className="w-32">
                            <Hint text={t("hints.named")}>{t("columns.named")}</Hint>
                          </th>
                          <th scope="col" className="w-36">
                            <Hint text={t("hints.leader")}>{t("columns.leader")}</Hint>
                          </th>
                          <th scope="col" className="w-28">
                            <Hint text={t("hints.webSearch")}>{t("columns.webSearch")}</Hint>
                          </th>
                          <th scope="col" className="w-32">
                            <Hint text={t("hints.wrongFacts")}>{t("columns.wrongFacts")}</Hint>
                          </th>
                          {sortHeading("added")}
                          <th scope="col" className="w-20">
                            <span className="sr-only">{t("columns.actions")}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((row) => (
                          <tr
                            key={row.prompt.id}
                            onClick={(event) => openQuestion(event, row.prompt)}
                            className={cn(
                              "group cursor-pointer transition-colors hover:bg-muted/30 [&>td]:px-2 [&>td]:py-2.5 [&>td:first-child]:pl-4 [&>td:last-child]:pr-2",
                              editing === row.prompt.id && "bg-muted/40",
                            )}
                          >
                            {/* Opaque on hover too: the other columns pass under it */}
                            <td className={cn(PINNED, "transition-colors group-hover:bg-[color-mix(in_oklab,var(--muted)_30%,var(--card))]")}>
                              {question(row)}
                              {!filters.topic && (
                                <span className="ml-2 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
                                  {labelFor(messages.Topics, row.prompt.topic)}
                                </span>
                              )}
                            </td>
                            <td>{visibility(row)}</td>
                            <td>{voice(row)}</td>
                            <td>{toneIcons(row)}</td>
                            <td>{position(row)}</td>
                            <td>{namedChips(row)}</td>
                            <td>{leader(row)}</td>
                            <td>{webSearch(row)}</td>
                            <td>{facts(row)}</td>
                            <td>{added(row)}</td>
                            <td>{actions(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Narrow panel: the same rows as cards */}
                  <ul className="divide-y @4xl:hidden">
                    {rows.map((row) =>
                      editing === row.prompt.id ? (
                        <li key={row.prompt.id} className="px-4 py-3">
                          {form(row.prompt)}
                        </li>
                      ) : (
                        <li
                          key={row.prompt.id}
                          onClick={(event) => openQuestion(event, row.prompt, "a, button, [data-hint]")}
                          className="flex cursor-pointer items-start gap-2 py-3 pr-2 pl-4 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <p className="text-sm text-pretty">{question(row)}</p>
                            <dl className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                              <div>
                                <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 whitespace-nowrap">
                                  {labelFor(messages.Topics, row.prompt.topic)}
                                </span>
                              </div>
                              {row.stats ? (
                                <>
                                  <Stat label={t("columns.visibility")} hint={t("hints.visibility")}>
                                    {visibility(row)}
                                  </Stat>
                                  <Stat label={t("columns.shareOfVoice")} hint={t("hints.shareOfVoice")}>
                                    {voice(row)}
                                  </Stat>
                                  <Stat label={t("columns.position")} hint={t("hints.position")}>
                                    {position(row)}
                                  </Stat>
                                  <Stat label={t("columns.tone")} hint={t("hints.tone")}>
                                    {toneIcons(row)}
                                  </Stat>
                                  <Stat label={t("columns.leader")} hint={t("hints.leader")}>
                                    {leader(row)}
                                  </Stat>
                                  {factsOf(row.prompt) > 0 && (
                                    <Stat label={t("columns.wrongFacts")} hint={t("hints.wrongFacts")}>
                                      {facts(row)}
                                    </Stat>
                                  )}
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
                <Hint text={t("hints.count")} className="font-medium text-foreground">
                  {t("count", { count: tracked.length })}
                </Hint>
                <span aria-hidden>·</span>
                <Hint text={usedHint}>{t("planLimit", { plan: plans(plan), max: limit })}</Hint>
                {nextRunAt && (
                  <>
                    <span aria-hidden>·</span>
                    <Hint text={t("hints.schedule")}>{t("schedule", { date: formatWeekdayDate(nextRunAt, locale, timeZone) })}</Hint>
                  </>
                )}
              </p>
            </>
          )}
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>
      </div>
    </div>
  );
}

/** "Label value" pair in a question's card; a tap on the label explains the number. */
function Stat({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-muted-foreground">
        <Hint text={hint} focusable={false}>
          {label}
        </Hint>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
