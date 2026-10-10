"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  CircleAlert,
  CircleSlash,
  FolderInput,
  ListTree,
  Pencil,
  Plus,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { MIN_PROMPTS, TIME_ZONE } from "@/shared/constants";
import { formatIsoDay, formatShortDate, formatWeekdayDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { isTracked } from "@/shared/helpers/prompts";
import { FILTER_PARAMS, withFilters } from "@/shared/helpers/report-filters";
import { toneOf } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Plan, Prompt, PromptResult, ReportFilters, ReportMethod, SuggestedPrompt, WrongFact } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { matchesFilter, PROMPTS_FILTERS, promptsSummary, promptStats, type PromptsFilter } from "../helpers/stats";
import { AddPromptDialog } from "./add-prompt-dialog";
import { ArchiveTable } from "./archive-table";
import { ImportKeywordsDialog } from "./import-keywords-dialog";
import { ConfirmModal } from "./modal";
import { SelectBox } from "./select-box";
import { SuggestionsTable } from "./suggestions-table";
import { TopicsColumn, type TopicItem } from "./topics-column";

const dash = <span className="text-muted-foreground">—</span>;

export type View = "tracked" | "suggested" | "archived";
const VIEWS: View[] = ["tracked", "suggested", "archived"];

/** The columns the table sorts by; without a sort the questions keep the order they were added in. */
type SortKey = "visibility" | "shareOfVoice" | "position" | "added";

const SORT_WIDTHS: Record<SortKey, string> = { visibility: "w-28", shareOfVoice: "w-28", position: "w-20", added: "w-28" };

/** The question stays in view while the other columns scroll sideways under it. */
const PINNED = "sticky left-0 z-[1] bg-card shadow-[inset_-1px_0_0_var(--border)]";

/** A window open over the page. */
type Dialog =
  | { kind: "add" }
  | { kind: "edit"; prompt: Prompt }
  | { kind: "keywords" }
  | { kind: "archiveAll" }
  | { kind: "deleteTopic"; topic: string };

/**
 * The project's questions, laid out like Peec's prompts page across the whole panel: the topics column on
 * the left ("New topic +", each topic with its count and a ⋯ to rename or delete it); on the right the
 * tracked, suggested and archived questions as tabs, with how many of the plan's questions are used and
 * the page's buttons; a toolbar; the list; and a footer that says when the questions are asked again, or,
 * once rows are picked with their boxes, what can be done with them.
 *
 * Tracked: a table that scrolls sideways under the question (visibility, share of voice, tone, position,
 * the brands named, who leads, how often ChatGPT searched the web, the wrong facts found, the date added)
 * under a search, a filter and the client's numbers over the rows shown; a click on a row opens the
 * question's page; picked rows move to a topic or to the archive ("Archive all" with none picked).
 * Suggested: Peec's table with ✕ / ✓ on each row, "Suggest more" for the topic picked or for all, keywords
 * from a file, and Discovery; picked rows are tracked or rejected together. Archived: picked rows are
 * tracked again. Questions are added (one per line, or from a file) and edited in a window. Every heading,
 * figure and mark explains itself on hover (Hint), as on Peec.
 */
export function PromptManager({
  projectId,
  plan,
  limit,
  initialPrompts,
  initialSuggestions,
  initialTopics,
  initialView,
  freshCount,
  results,
  brands,
  series,
  youId,
  collectedAt,
  method,
  filters,
  filename,
  nextRunAt,
  wrongFacts,
  wrongFactsHref,
  discoveryHref,
}: {
  projectId: string;
  plan: Plan;
  /** Questions the plan lets the project track at once. */
  limit: number;
  /** Every question of the project, archived ones too. */
  initialPrompts: Prompt[];
  initialSuggestions: SuggestedPrompt[];
  /** The project's topics in their order, those without a question yet too. */
  initialTopics: string[];
  /** The tab to open (`?view=`). */
  initialView: View;
  /** How many of the newest suggestions Discovery just made, to mark as new. */
  freshCount: number;
  /** The latest run's results; a question without one hasn't been asked yet. */
  results: PromptResult[];
  brands: Brand[];
  /** The tracked brands with their colors, for the "brands named" column. */
  series: SeriesBrand[];
  youId: string;
  collectedAt: string;
  /** How the answers were collected; null before the first check. */
  method: ReportMethod | null;
  filters: ReportFilters;
  /** For the CSV download, without the extension. */
  filename: string;
  /** When the questions are asked again; a question added now is asked from then. */
  nextRunAt: string | null;
  /** What ChatGPT gets wrong about the client, each with the question it came up in. */
  wrongFacts: WrongFact[];
  /** The page that lists them. */
  wrongFactsHref: string;
  /** Peec's Discovery: services, customers and languages make new suggestions. */
  discoveryHref: string;
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
  const { data: prompts } = useQuery({ queryKey: queryKeys.prompts(projectId), queryFn: () => api.getPrompts(projectId), initialData: initialPrompts });
  const { data: suggestions } = useQuery({
    queryKey: queryKeys.promptSuggestions(projectId),
    queryFn: () => api.getPromptSuggestions(projectId),
    initialData: initialSuggestions,
  });
  const { data: topicList } = useQuery({ queryKey: queryKeys.topics(projectId), queryFn: () => api.getTopics(projectId), initialData: initialTopics });
  const [view, setView] = useState<View>(initialView);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PromptsFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; reversed: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // The suggestions' topic is picked here: a suggested topic isn't one the report can be filtered by
  const [suggestedTopic, setSuggestedTopic] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // A window opened again starts afresh
  const [session, setSession] = useState(0);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set(initialSuggestions.slice(0, freshCount).map((suggestion) => suggestion.id)));
  const [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [topicsOpen, setTopicsOpen] = useState(false);

  const topicLabel = (topic: string) => labelFor(messages.Topics, topic);
  const pageOf = (prompt: Prompt) => withFilters(`/projects/${projectId}/prompts/${prompt.id}`, filters);
  const openDialog = (next: Dialog) => {
    setSession((current) => current + 1);
    setDialog(next);
  };
  const closeDialog = () => setDialog(null);
  const done = (message: string) => {
    setAnnouncement(message);
    setSelected(new Set());
  };

  const tracked = prompts.filter(isTracked);
  const archived = prompts.filter((prompt) => !isTracked(prompt));
  const room = Math.max(0, limit - tracked.length);
  const full = room === 0;
  const counts: Record<View, number> = { tracked: tracked.length, suggested: suggestions.length, archived: archived.length };
  const topics = [...new Set([...topicList, ...tracked.map((prompt) => prompt.topic)])];
  const search = query.trim().toLowerCase();

  // A change of the questions changes the report: the page's numbers follow
  const refresh = () => startTransition(() => router.refresh());

  const update = useMutation({
    mutationFn: (body: { ids: string[]; archived?: boolean; topic?: string }) => api.updatePrompts(projectId, body),
    onSuccess: (saved, body) => {
      queryClient.setQueryData<Prompt[]>(queryKeys.prompts(projectId), (list = []) => list.map((prompt) => saved.find((item) => item.id === prompt.id) ?? prompt));
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics(projectId) });
      done(
        body.topic !== undefined
          ? t("selection.movedNote", { count: saved.length, topic: topicLabel(body.topic) })
          : t(body.archived ? "selection.archivedNote" : "selection.restoredNote", { count: saved.length }),
      );
      closeDialog();
      refresh();
    },
  });
  const decide = useMutation({
    mutationFn: async ({ ids, track }: { ids: string[]; track: boolean }) =>
      track ? api.acceptPromptSuggestions(projectId, { ids }) : api.rejectPromptSuggestions(projectId, { ids }).then(() => [] as Prompt[]),
    onSuccess: (created, { ids, track }) => {
      queryClient.setQueryData<SuggestedPrompt[]>(queryKeys.promptSuggestions(projectId), (list = []) => list.filter((item) => !ids.includes(item.id)));
      if (created.length > 0) {
        queryClient.setQueryData<Prompt[]>(queryKeys.prompts(projectId), (list = []) => [...list, ...created]);
        void queryClient.invalidateQueries({ queryKey: queryKeys.topics(projectId) });
      }
      done(t(track ? "suggested.trackedNote" : "suggested.rejectedNote", { count: ids.length }));
    },
  });
  const more = useMutation({
    mutationFn: () => api.suggestMorePrompts(projectId, { topic: suggestedTopic || undefined }),
    onSuccess: (created) => {
      queryClient.setQueryData<SuggestedPrompt[]>(queryKeys.promptSuggestions(projectId), (list = []) => [...created, ...list]);
      setFresh(new Set(created.map((suggestion) => suggestion.id)));
      const message = created.length > 0 ? t("suggested.moreNote", { count: created.length }) : t("suggested.noMore");
      setNotice(created.length > 0 ? "" : message);
      done(message);
    },
  });
  const removeTopic = useMutation({
    mutationFn: (topic: string) => api.deleteTopic(projectId, topic),
    onSuccess: (_, topic) => {
      queryClient.setQueryData<string[]>(queryKeys.topics(projectId), (list = []) => list.filter((item) => item !== topic));
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts(projectId) });
      if (filters.topic === topic) pickTopic("");
      done(t("topicsColumn.deletedNote", { name: topicLabel(topic) }));
      closeDialog();
      refresh();
    },
  });
  const failed = update.isError || decide.isError || more.isError || removeTopic.isError;

  /** Keeps a name, or rejects with what to tell the client. */
  async function saveTopic(topic: string | null, name: string) {
    try {
      const next = topic === null ? await api.createTopic(projectId, { name }) : await api.renameTopic(projectId, topic, { name });
      queryClient.setQueryData<string[]>(queryKeys.topics(projectId), next);
      if (topic !== null) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.prompts(projectId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.promptSuggestions(projectId) }),
        ]);
        if (filters.topic === topic) pickTopic(name.trim());
        refresh();
      }
      setAnnouncement(t(topic === null ? "topicsColumn.createdNote" : "topicsColumn.renamedNote", { name: name.trim() }));
    } catch (error) {
      throw new Error(error instanceof ApiError && error.status === 409 ? t("topicsColumn.taken") : t("topicsColumn.failed"));
    }
  }

  function pickTopic(topic: string) {
    setSelected(new Set());
    setTopicsOpen(false);
    if (view === "suggested") {
      setSuggestedTopic(topic);
      return;
    }
    const next: Record<string, string> = Object.fromEntries(params);
    if (topic) next[FILTER_PARAMS.topic] = topic;
    else delete next[FILTER_PARAMS.topic];
    startTransition(() => router.replace({ pathname, query: next }, { scroll: false }));
  }

  function openView(next: View) {
    setView(next);
    setSelected(new Set());
    setNotice("");
  }

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (ids: string[]) =>
    setSelected((current) => (ids.length > 0 && ids.every((id) => current.has(id)) ? new Set() : new Set(ids)));

  // Tracked: topics with their counts over the questions in the chosen language
  const inLanguage = tracked.filter((prompt) => !filters.language || prompt.language === filters.language);
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
  const searchedShare = (() => {
    const answers = rows.flatMap((row) => row.result?.answers ?? []);
    return answers.length ? answers.filter((answer) => answer.searches.length > 0).length / answers.length : null;
  })();

  // Suggested and archived, under the topic picked and the search
  const suggestedRows = suggestions.filter(
    (suggestion) => (!suggestedTopic || suggestion.topic === suggestedTopic) && (!search || suggestion.text.toLowerCase().includes(search)),
  );
  const archivedRows = [...archived]
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""))
    .filter((prompt) => (!filters.topic || prompt.topic === filters.topic) && (!search || prompt.text.toLowerCase().includes(search)));

  // The rows of the open tab, and those of them picked
  const visibleIds = view === "tracked" ? rows.map((row) => row.prompt.id) : view === "suggested" ? suggestedRows.map((row) => row.id) : archivedRows.map((row) => row.id);
  const picked = visibleIds.filter((id) => selected.has(id));
  const pickedSet = new Set(picked);
  const busyIds = new Set<string>([
    ...(update.isPending ? update.variables.ids : []),
    ...(decide.isPending ? decide.variables.ids : []),
  ]);

  // The topics column: the project's topics with the open tab's counts
  const countIn = (list: { topic: string }[], topic: string) => list.filter((item) => item.topic === topic).length;
  const columnItems: TopicItem[] = topics.map((topic) => ({
    value: topic,
    label: topicLabel(topic),
    count: countIn(view === "tracked" ? inLanguage : view === "suggested" ? suggestions : archived, topic),
  }));
  const suggestedTopics: TopicItem[] = [...new Set(suggestions.map((suggestion) => suggestion.topic))]
    .filter((topic) => !topics.includes(topic))
    .map((topic) => ({ value: topic, label: topicLabel(topic), count: countIn(suggestions, topic) }));
  // Archived questions may have a topic deleted since: it shows among the topics while they do
  const archivedOnly: TopicItem[] =
    view === "archived"
      ? [...new Set(archived.map((prompt) => prompt.topic))]
          .filter((topic) => !topics.includes(topic))
          .map((topic) => ({ value: topic, label: topicLabel(topic), count: countIn(archived, topic) }))
      : [];
  const currentTopic = view === "suggested" ? suggestedTopic : (filters.topic ?? "");
  const topicsColumn = (className?: string) => (
    <TopicsColumn
      className={className}
      items={[...columnItems, ...archivedOnly]}
      suggested={view === "suggested" ? suggestedTopics : undefined}
      allLabel={t(view === "suggested" ? "topicsColumn.allSuggested" : "allTopics")}
      allCount={view === "tracked" ? inLanguage.length : view === "suggested" ? suggestions.length : archived.length}
      current={currentTopic}
      onPick={pickTopic}
      onCreate={(name) => saveTopic(null, name)}
      onRename={(topic, name) => saveTopic(topic, name)}
      onDelete={(topic) => openDialog({ kind: "deleteTopic", topic })}
    />
  );

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

  /** A click anywhere on a question opens its page; the links, buttons and boxes (and, on a phone, hints) in it keep their own click. */
  function openQuestion(event: React.MouseEvent, prompt: Prompt, own = "a, button, input") {
    if (event.target instanceof Element && event.target.closest(own)) return;
    router.push(pageOf(prompt));
  }

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
  const box = ({ prompt }: Row) => <SelectBox checked={pickedSet.has(prompt.id)} label={t("selection.one", { text: prompt.text })} onChange={() => toggle(prompt.id)} />;
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
              className={cn("h-6 items-center gap-1 rounded-md px-1.5 text-[0.7rem] font-semibold", brand.isYou ? "bg-you-soft/60 ring-1 ring-you/30" : "bg-muted")}
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
          <Button variant="ghost" size="icon-sm" aria-label={`${t("edit")}: ${prompt.text}`} onClick={() => openDialog({ kind: "edit", prompt })}>
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
            disabled={busyIds.has(prompt.id)}
            onClick={() => update.mutate({ ids: [prompt.id], archived: true })}
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
      topicLabel(prompt.topic),
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
  const allPicked = visibleIds.length > 0 && visibleIds.every((id) => pickedSet.has(id));

  const searchBox = (
    <div className="relative w-full min-w-40 @md:w-64">
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
        className="h-9 w-full rounded-lg border bg-background pr-2 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
  // On a narrow panel the topics column is a sheet, opened from the toolbar
  const topicsSheet = (
    <Sheet open={topicsOpen} onOpenChange={setTopicsOpen}>
      <SheetTrigger render={<Button variant="outline" className="h-9 max-w-56 @3xl:hidden" />}>
        <ListTree aria-hidden data-icon="inline-start" />
        <span className="truncate">{currentTopic ? topicLabel(currentTopic) : t("topics")}</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 gap-0 overflow-y-auto p-0">
        <SheetTitle className="sr-only">{t("topics")}</SheetTitle>
        {topicsColumn()}
      </SheetContent>
    </Sheet>
  );

  return (
    <div aria-busy={pending} className={cn("@container flex flex-1 transition-opacity", pending && "opacity-70")}>
      {/* The topics: a column across the page's height on a wide panel */}
      <aside className="hidden w-56 shrink-0 border-r @3xl:block">
        <div className="sticky top-12">{topicsColumn()}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The tabs with the plan's room and the page's buttons, as on Peec */}
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2">
          <div role="group" aria-label={t("tabsLabel")} className="flex items-center gap-1 self-stretch">
            {VIEWS.map((option) => (
              <Hint key={option} text={t(`hints.tabs.${option}`)} side="bottom" className="-mb-2 self-end">
                {(describedBy) => (
                  <button
                    type="button"
                    aria-pressed={view === option}
                    aria-describedby={describedBy}
                    onClick={() => openView(option)}
                    className="group relative flex h-12 items-center rounded-lg text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors",
                        view === option ? "bg-muted font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {t(`tabs.${option}`)}
                      <span className="text-xs tabular-nums opacity-60">{counts[option]}</span>
                    </span>
                    {view === option && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />}
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
            {view === "suggested" && (
              <Hint text={t("buttons.keywordsHint")} described={false}>
                {() => (
                  <Button variant="outline" className="h-9" onClick={() => openDialog({ kind: "keywords" })}>
                    <UploadCloud aria-hidden data-icon="inline-start" />
                    {t("buttons.keywords")}
                  </Button>
                )}
              </Hint>
            )}
            <Hint text={t("buttons.discoveryHint")} described={false}>
              {() => (
                <Link href={discoveryHref} className={cn(buttonVariants({ variant: "outline" }), "h-9")}>
                  <Sparkles aria-hidden data-icon="inline-start" />
                  {t("buttons.discovery")}
                </Link>
              )}
            </Hint>
            <Hint text={full ? t("full", { plan: plans(plan), max: limit }) : t("buttons.addHint")} described={false}>
              {() => (
                <Button variant={view === "suggested" ? "outline" : "default"} className="h-9" disabled={full} onClick={() => openDialog({ kind: "add" })}>
                  <Plus aria-hidden data-icon="inline-start" />
                  {t("add")}
                </Button>
              )}
            </Hint>
            {view === "suggested" && (
              <Hint text={suggestedTopic ? t("buttons.moreTopicHint", { topic: topicLabel(suggestedTopic) }) : t("buttons.moreHint")} described={false}>
                {() => (
                  <Button className="h-9" disabled={more.isPending} onClick={() => more.mutate()}>
                    <Sparkles aria-hidden data-icon="inline-start" className={cn(more.isPending && "animate-pulse")} />
                    {more.isPending ? t("buttons.suggesting") : t("buttons.more")}
                  </Button>
                )}
              </Hint>
            )}
          </div>
        </div>

        {/* The tab's tools: search, filters, and on the tracked questions the client's numbers over the rows shown */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {searchBox}
            {topicsSheet}
            {view === "tracked" && (
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
            )}
          </div>
          {view === "tracked" && (
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
                  <dd className="font-semibold text-foreground tabular-nums">{summary.position !== null ? `#${formatDecimal(summary.position, locale)}` : "—"}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt>
                    <Hint text={t("hints.summary.webSearch")}>{t("columns.webSearch")}</Hint>
                  </dt>
                  <dd className="font-semibold text-foreground tabular-nums">{searchedShare !== null ? formatPercent(searchedShare, locale) : "—"}</dd>
                </div>
              </dl>
              {rows.length > 0 && <CsvButton iconOnly filename={filename} label={t("csv")} hint={t("csvHint")} rows={csvRows} className="h-9 w-9" />}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Why nothing can be added or tracked: said once, above whichever list is open */}
          {full && view !== "archived" && <p className="mx-4 mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-pretty">{t("full", { plan: plans(plan), max: limit })}</p>}
          {failed && (
            <p role="alert" className="mx-4 mt-3 text-sm text-destructive">
              {t("saveFailed")}
            </p>
          )}
          {notice && <p className="mx-4 mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-pretty">{notice}</p>}

          {view === "suggested" ? (
            suggestions.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
                <span aria-hidden className="mb-2 flex size-12 items-center justify-center rounded-xl border bg-muted/50">
                  <Sparkles className="size-5 text-muted-foreground" />
                </span>
                <p className="font-medium">{t("suggested.emptyTitle")}</p>
                <p className="max-w-sm text-sm text-pretty text-muted-foreground">{t("suggested.emptyText")}</p>
                <Button className="mt-3" disabled={more.isPending} onClick={() => more.mutate()}>
                  <Sparkles aria-hidden data-icon="inline-start" />
                  {more.isPending ? t("buttons.suggesting") : t("suggested.emptyButton")}
                </Button>
              </div>
            ) : suggestedRows.length === 0 ? (
              <p className="m-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t(suggestedTopic && !search ? "suggested.noneInTopic" : "noMatch")}</p>
            ) : (
              <SuggestionsTable
                rows={suggestedRows}
                selected={pickedSet}
                fresh={fresh}
                busy={busyIds}
                canTrack={!full}
                showTopic={!suggestedTopic}
                topicLabel={topicLabel}
                onToggle={toggle}
                onToggleAll={() => toggleAll(suggestedRows.map((row) => row.id))}
                onDecide={(ids, track) => decide.mutate({ ids, track })}
              />
            )
          ) : view === "archived" ? (
            archivedRows.length === 0 ? (
              <p className="m-4 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{t(archived.length === 0 ? "archiveEmpty" : "noMatch")}</p>
            ) : (
              <>
                <p className="border-b px-4 py-2.5 text-sm text-pretty text-muted-foreground">{t("archiveIntro")}</p>
                <ArchiveTable
                  prompts={archivedRows}
                  selected={pickedSet}
                  busy={busyIds}
                  full={full}
                  href={pageOf}
                  topicLabel={topicLabel}
                  onToggle={toggle}
                  onToggleAll={() => toggleAll(archivedRows.map((row) => row.id))}
                  onRestore={(ids) => update.mutate({ ids, archived: false })}
                />
              </>
            )
          ) : (
            <>
              {tracked.length > 0 && tracked.length < Math.min(MIN_PROMPTS, limit) && <p className="mx-4 mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{t("belowMin")}</p>}
              {tracked.length === 0 ? (
                <div className="m-4 flex flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center">
                  <p className="font-medium">{t("empty")}</p>
                  <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
                </div>
              ) : rows.length === 0 ? (
                <p className="m-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("noMatch")}</p>
              ) : (
                <>
                  {/* Wide panel: a table that scrolls sideways under the question, as on Peec. relative + min-w-0: it scrolls here, not the page */}
                  <div className="relative hidden min-w-0 overflow-x-auto @4xl:block">
                    <table className="w-full min-w-352 table-fixed text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground [&>th]:px-2 [&>th]:py-2.5 [&>th]:font-medium [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
                          <th scope="col" className={cn(PINNED, "bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]")}>
                            <span className="flex items-center gap-3">
                              <SelectBox checked={allPicked} mixed={picked.length > 0 && !allPicked} label={t("selection.all")} onChange={() => toggleAll(visibleIds)} />
                              <Hint text={t("hints.question")}>{t("columns.question")}</Hint>
                            </span>
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
                        {rows.map((row) => {
                          const on = pickedSet.has(row.prompt.id);
                          return (
                            <tr
                              key={row.prompt.id}
                              onClick={(event) => openQuestion(event, row.prompt)}
                              className={cn(
                                "group cursor-pointer transition-colors [&>td]:px-2 [&>td]:py-3 [&>td:first-child]:pl-4 [&>td:last-child]:pr-2",
                                on ? "bg-you-soft/40" : "hover:bg-muted/30",
                                busyIds.has(row.prompt.id) && "opacity-50",
                              )}
                            >
                              {/* Opaque on hover too: the other columns pass under it */}
                              <td
                                className={cn(
                                  PINNED,
                                  "transition-colors",
                                  on ? "bg-[color-mix(in_oklab,var(--you-soft)_40%,var(--card))]" : "group-hover:bg-[color-mix(in_oklab,var(--muted)_30%,var(--card))]",
                                )}
                              >
                                <span className="flex items-start gap-3">
                                  <span className="flex h-5 items-center">{box(row)}</span>
                                  <span className="min-w-0">
                                    {question(row)}
                                    {!filters.topic && (
                                      <span className="ml-2 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
                                        {topicLabel(row.prompt.topic)}
                                      </span>
                                    )}
                                  </span>
                                </span>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Narrow panel: the same rows as cards */}
                  <ul className="divide-y @4xl:hidden">
                    {rows.map((row) => (
                      <li
                        key={row.prompt.id}
                        onClick={(event) => openQuestion(event, row.prompt, "a, button, input, [data-hint]")}
                        className={cn("flex cursor-pointer items-start gap-3 py-3 pr-2 pl-4 transition-colors", pickedSet.has(row.prompt.id) ? "bg-you-soft/40" : "hover:bg-muted/30")}
                      >
                        <span className="flex h-5 items-center">{box(row)}</span>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <p className="text-sm text-pretty">{question(row)}</p>
                          <dl className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                            <div>
                              <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 whitespace-nowrap">{topicLabel(row.prompt.topic)}</span>
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
                    ))}
                  </ul>
                </>
              )}
              {method && results.length > 0 && (
                <div className="px-4 py-3">
                  <MethodLabel method={method} />
                </div>
              )}
            </>
          )}
        </div>

        {/* The footer, as Peec's: how many and when they are asked again; with rows picked, what to do with them */}
        <div className="sticky bottom-0 z-2 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-background px-4 py-2.5 text-sm">
          {picked.length > 0 ? (
            <>
              <p className="flex items-center gap-2">
                <span className="font-medium">{t("selection.count", { count: picked.length })}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  <X aria-hidden data-icon="inline-start" />
                  {t("selection.clear")}
                </Button>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {view === "tracked" && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="outline" disabled={update.isPending} />}>
                        <FolderInput aria-hidden data-icon="inline-start" />
                        {t("selection.move")}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="top" className="w-56">
                        {topics.map((topic) => (
                          <DropdownMenuItem key={topic} onClick={() => update.mutate({ ids: picked, topic })}>
                            {topicLabel(topic)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" disabled={update.isPending} onClick={() => update.mutate({ ids: picked, archived: true })}>
                      <Archive aria-hidden data-icon="inline-start" />
                      {t("selection.archive")}
                    </Button>
                  </>
                )}
                {view === "suggested" && (
                  <>
                    <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ ids: picked, track: false })}>
                      <X aria-hidden data-icon="inline-start" />
                      {t("suggested.reject")}
                    </Button>
                    <Hint text={picked.length > room ? t("suggested.noRoomFor", { room }) : t("suggested.trackHint")} described={false}>
                      {() => (
                        <Button disabled={decide.isPending || picked.length > room} onClick={() => decide.mutate({ ids: picked, track: true })}>
                          <Plus aria-hidden data-icon="inline-start" />
                          {t("suggested.track")}
                        </Button>
                      )}
                    </Hint>
                  </>
                )}
                {view === "archived" && (
                  <Hint text={picked.length > room ? t("suggested.noRoomFor", { room }) : t("restoreHint")} described={false}>
                    {() => (
                      <Button disabled={update.isPending || picked.length > room} onClick={() => update.mutate({ ids: picked, archived: false })}>
                        {t("selection.restore")}
                      </Button>
                    )}
                  </Hint>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                <Hint text={t(`footer.${view}Hint`)} className="font-medium text-foreground">
                  {t(`footer.${view}`, { count: visibleIds.length })}
                </Hint>
                {nextRunAt && view === "tracked" && (
                  <>
                    <span aria-hidden>·</span>
                    <Hint text={t("hints.schedule")}>{t("schedule", { date: formatWeekdayDate(nextRunAt, locale, timeZone) })}</Hint>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {view === "tracked" && tracked.length > 0 && (
                  <Button variant="outline" onClick={() => openDialog({ kind: "archiveAll" })}>
                    <Archive aria-hidden data-icon="inline-start" />
                    {t("selection.archiveAll")}
                  </Button>
                )}
                {view === "suggested" && suggestedRows.length > 0 && (
                  <>
                    <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ ids: suggestedRows.map((row) => row.id), track: false })}>
                      <X aria-hidden data-icon="inline-start" />
                      {t("suggested.rejectAll")}
                    </Button>
                    <Hint text={suggestedRows.length > room ? t("suggested.noRoomFor", { room }) : t("suggested.trackAllHint")} described={false}>
                      {() => (
                        <Button
                          variant="outline"
                          disabled={decide.isPending || suggestedRows.length > room}
                          onClick={() => decide.mutate({ ids: suggestedRows.map((row) => row.id), track: true })}
                        >
                          <Plus aria-hidden data-icon="inline-start" />
                          {t("suggested.trackAll")}
                        </Button>
                      )}
                    </Hint>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <AddPromptDialog
          key={session}
          projectId={projectId}
          open
          onOpenChange={(open) => !open && closeDialog()}
          prompt={dialog.kind === "edit" ? dialog.prompt : undefined}
          topics={topics.map((topic) => ({ value: topic, label: topicLabel(topic) }))}
          defaultTopic={(view === "suggested" ? suggestedTopic : filters.topic) ?? ""}
          existing={prompts}
          room={room}
          onSaved={(saved) => {
            setAnnouncement(t(dialog.kind === "edit" ? "savedNote" : "addedNote", { count: saved.length }));
            closeDialog();
            if (dialog.kind === "add") openView("tracked");
            refresh();
          }}
        />
      )}
      {dialog?.kind === "keywords" && (
        <ImportKeywordsDialog
          key={session}
          projectId={projectId}
          open
          onOpenChange={(open) => !open && closeDialog()}
          onImported={(created) => {
            setFresh(new Set(created.map((suggestion) => suggestion.id)));
            setSuggestedTopic("");
            setNotice(created.length > 0 ? "" : t("suggested.noMore"));
            done(created.length > 0 ? t("suggested.moreNote", { count: created.length }) : t("suggested.noMore"));
            closeDialog();
          }}
        />
      )}
      <ConfirmModal
        open={dialog?.kind === "archiveAll"}
        onOpenChange={(open) => !open && closeDialog()}
        title={t("selection.archiveAllTitle", { count: tracked.length })}
        description={t("selection.archiveAllText")}
        confirm={t("selection.archiveAll")}
        cancel={t("cancel")}
        danger
        pending={update.isPending}
        onConfirm={() => update.mutate({ ids: tracked.map((prompt) => prompt.id), archived: true })}
      />
      <ConfirmModal
        open={dialog?.kind === "deleteTopic"}
        onOpenChange={(open) => !open && closeDialog()}
        title={dialog?.kind === "deleteTopic" ? t("topicsColumn.deleteTitle", { name: topicLabel(dialog.topic) }) : ""}
        description={
          dialog?.kind === "deleteTopic" ? t("topicsColumn.deleteText", { count: tracked.filter((prompt) => prompt.topic === dialog.topic).length }) : ""
        }
        confirm={t("topicsColumn.delete")}
        cancel={t("cancel")}
        danger
        pending={removeTopic.isPending}
        onConfirm={() => dialog?.kind === "deleteTopic" && removeTopic.mutate(dialog.topic)}
      />
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
