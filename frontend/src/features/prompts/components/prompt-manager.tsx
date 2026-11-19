"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveIcon as Archive } from "@phosphor-icons/react/dist/ssr/Archive";
import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretUpIcon as ChevronUp } from "@phosphor-icons/react/dist/ssr/CaretUp";
import { CaretUpDownIcon as ChevronsUpDown } from "@phosphor-icons/react/dist/ssr/CaretUpDown";
import { WarningCircleIcon as CircleAlert } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { ProhibitIcon as CircleSlash } from "@phosphor-icons/react/dist/ssr/Prohibit";
import { DotsThreeIcon as More } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { FolderSimplePlusIcon as FolderInput } from "@phosphor-icons/react/dist/ssr/FolderSimplePlus";
import { TreeViewIcon as ListTree } from "@phosphor-icons/react/dist/ssr/TreeView";
import { PencilSimpleIcon as Pencil } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { MagnifyingGlassIcon as Search } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { TagIcon as Tag } from "@phosphor-icons/react/dist/ssr/Tag";
import { CloudArrowUpIcon as UploadCloud } from "@phosphor-icons/react/dist/ssr/CloudArrowUp";
import { XIcon as X } from "@phosphor-icons/react/dist/ssr/X";
import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { MIN_PROMPTS, TIME_ZONE } from "@/shared/constants";
import { formatIsoDay, formatWeekdayDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { isTracked } from "@/shared/helpers/prompts";
import { FILTER_PARAMS, withFilters } from "@/shared/helpers/report-filters";
import { answersNaming } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Plan, Prompt, PromptResult, ReportFilters, ReportMethod, SuggestedPrompt, UpdatePromptsRequest, WrongFact } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { matchesFilter, PROMPTS_FILTERS, promptStats, type PromptsFilter } from "../helpers/stats";
import { AddPromptDialog } from "./add-prompt-dialog";
import { ArchiveTable } from "./archive-table";
import { ImportKeywordsDialog } from "./import-keywords-dialog";
import { ConfirmModal } from "@/shared/components/modal";
import { SelectBox } from "./select-box";
import { SuggestionsTable } from "./suggestions-table";
import { TagsCell } from "./tags-cell";
import { TopicDialog } from "./topic-dialog";
import { fieldClass } from "@/shared/components/ui/field-style";

export type View = "tracked" | "suggested" | "archived";
const VIEWS: View[] = ["tracked", "suggested", "archived"];

/** The columns the table sorts by; without a sort the questions keep the order they were added in. */
type SortKey = "question" | "visibility";

/** A to Z; the other column puts the largest number first. */
const ASCENDING_FIRST: SortKey[] = ["question"];

/** The businesses written out in a question's row before "+2". */
const NAMES_SHOWN = 3;

/** A topic as the filter lists it: its name and how many questions of the open tab it holds. */
type TopicItem = { value: string; label: string; count: number };

/** A window open over the page. */
type Dialog =
  | { kind: "add" }
  | { kind: "edit"; prompt: Prompt }
  | { kind: "keywords" }
  | { kind: "archiveAll" }
  | { kind: "deleteTopic"; topic: string }
  /** A topic in its window; null for a new one. */
  | { kind: "topic"; topic: string | null };

/**
 * The project's questions, made simple (the user, 18 Nov 2026: "messy and UI design is not structurally
 * correct"; asked, they chose "simple, like Harakatlar"): one row with the tracked, suggested and archived
 * questions as tabs, how many of the plan's questions are used and the page's buttons (a ⋯ menu holds the
 * rare ones: a new topic, editing the topic picked, archiving all); one row of tools (search, the topic, the
 * language, named or not, a tag, the export); one sentence on where the client stands over the questions
 * shown; the list; and, once rows are picked with their boxes, a footer with what can be done with them.
 *
 * Tracked: four columns that fit the panel: the question (its language, topic, wrong facts and tags under it),
 * how many of its answers named the client ("1 / 3"), who the answers named, written out, the most named
 * first, and a ⋯ per row (edit, tags, fact-checking, archive). The rest (share of voice, tone, position, web
 * search, location, the date added) is on the question's own page, which a click on the row opens, and in
 * the export.
 * Suggested: Peec's table with ✕ / ✓ on each row, "Suggest more" for the topic picked or for all, keywords
 * from a file, and Discovery; picked rows are tracked or rejected together. Archived: picked rows are
 * tracked again. Questions are added (one per line, or from a file) and edited in a window. Every heading,
 * figure and mark explains itself on hover (Hint), as on Peec.
 */
export function PromptManager({
  projectId,
  plan,
  limit,
  trial = false,
  initialPrompts,
  initialSuggestions,
  initialTopics,
  initialView,
  initialTag,
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
  city,
  filterBar,
}: {
  projectId: string;
  plan: Plan;
  /** The free first check only: nothing is asked again until a plan is paid, and the page says so. */
  trial?: boolean;
  /** Questions the plan lets the project track at once. */
  limit: number;
  /** Every question of the project, archived ones too. */
  initialPrompts: Prompt[];
  initialSuggestions: SuggestedPrompt[];
  /** The project's topics in their order, those without a question yet too. */
  initialTopics: string[];
  /** The tab to open (`?view=`). */
  initialView: View;
  /** The tag the list starts on (`?tag=`); one no question carries is ignored. */
  initialTag: string;
  /** How many of the newest suggestions Discovery just made, to mark as new. */
  freshCount: number;
  /** The latest run's results; a question without one hasn't been asked yet. */
  results: PromptResult[];
  brands: Brand[];
  /** The tracked brands, for "who was named". */
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
  /** The project's city: where a new question is asked from unless the client picks another. */
  city: string;
  /** The language filter (ReportFilterBar), in the search's row as on Peec rather than in a strip of its own. */
  filterBar?: React.ReactNode;
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
  const [tagFilter, setTagFilter] = useState(initialTag);
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
  // The question whose tags are shown to edit, picked from its ⋯ (a question with tags shows them anyway)
  const [tagging, setTagging] = useState<string | null>(null);

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
  // One question's tags or fact-checking: shown at once, put back if the save fails
  const patch = useMutation({
    mutationFn: (body: UpdatePromptsRequest) => api.updatePrompts(projectId, body),
    onMutate: ({ ids, tags, factCheck }) =>
      queryClient.setQueryData<Prompt[]>(queryKeys.prompts(projectId), (list = []) =>
        list.map((prompt) => (ids.includes(prompt.id) ? { ...prompt, ...(tags ? { tags } : {}), ...(factCheck === undefined ? {} : { factCheck }) } : prompt)),
      ),
    onSuccess: (saved) =>
      queryClient.setQueryData<Prompt[]>(queryKeys.prompts(projectId), (list = []) => list.map((prompt) => saved.find((item) => item.id === prompt.id) ?? prompt)),
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.prompts(projectId) }),
  });
  const failed = update.isError || decide.isError || more.isError || removeTopic.isError || patch.isError;

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

  /** A topic opens in its window: a new one, or the one picked. */
  function openTopic(topic: string | null) {
    openDialog({ kind: "topic", topic });
  }

  function pickTopic(topic: string) {
    setSelected(new Set());
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
  const inTopic = inLanguage
    .filter((prompt) => !filters.topic || prompt.topic === filters.topic)
    .map((prompt) => {
      const result = results.find((r) => r.prompt.id === prompt.id);
      const named = result
        ? series
            .map((brand) => ({ brand, answers: answersNaming(result, brand.id) }))
            .filter(({ answers }) => answers > 0)
            .sort((a, b) => b.answers - a.answers)
            .map(({ brand }) => brand)
        : [];
      return { prompt, result, named, stats: result && promptStats(result, brands, youId) };
    });
  type Row = (typeof inTopic)[number];

  // What each sortable column sorts by; a question without the number goes last
  const sortValue: Record<SortKey, (row: Row) => number | string | null> = {
    question: ({ prompt }) => prompt.text,
    visibility: ({ stats }) => (stats && stats.total ? stats.named / stats.total : null),
  };
  // The tags on the project's questions, for picking and for the filter; a filter on a tag no question has any more lets go
  const allTags = [...new Set(prompts.flatMap((prompt) => prompt.tags))].sort((a, b) => a.localeCompare(b, locale));
  const tag = allTags.includes(tagFilter) ? tagFilter : "";
  const matching = inTopic.filter((row) => (!search || row.prompt.text.toLowerCase().includes(search)) && (!tag || row.prompt.tags.includes(tag)));
  const rows = matching.filter((row) => matchesFilter(row.stats, status));
  if (sort) {
    // Best first (A to Z, the largest share), or the other way round
    const value = sortValue[sort.key];
    const best = ASCENDING_FIRST.includes(sort.key) ? 1 : -1;
    rows.sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      if (x === null || y === null) return Number(x === null) - Number(y === null);
      const order = typeof x === "string" || typeof y === "string" ? String(x).localeCompare(String(y), locale) : x - y;
      return order * best * (sort.reversed ? -1 : 1);
    });
  }
  // Where the client stands over the questions shown, in a sentence (it was a line of four numbers)
  const asked = rows.filter((row) => row.stats);
  const namedYou = asked.filter((row) => row.stats && row.stats.named > 0).length;
  const rivalsOnly = asked.filter((row) => row.stats && row.stats.named === 0 && row.named.some((brand) => !brand.isYou)).length;
  const waiting = rows.length - asked.length;

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

  // The topics, for the filter: the project's topics with the open tab's counts
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
  // The topic filter's options: all, then every topic of the open tab with its count
  const topicOptions: TopicItem[] = [
    {
      value: "",
      label: t(view === "suggested" ? "topicsColumn.allSuggested" : "allTopics"),
      count: view === "tracked" ? inLanguage.length : view === "suggested" ? suggestions.length : archived.length,
    },
    ...columnItems,
    ...archivedOnly,
    ...(view === "suggested" ? suggestedTopics : []),
  ];

  /** How a column is sorted now: not, ascending or descending. Best first means A to Z, the largest share. */
  function sortState(key: SortKey) {
    const sorted = sort?.key === key ? sort : null;
    return !sorted ? null : sorted.reversed !== ASCENDING_FIRST.includes(key) ? "ascending" : "descending";
  }

  /** A heading's label that explains its column on hover and sorts: best first, then the other way round, then back to the order added. */
  function sortButton(key: SortKey, label: string, hint: string, end = false) {
    const sorted = sort?.key === key ? sort : null;
    const state = sortState(key);
    const Icon = !state ? ChevronsUpDown : state === "ascending" ? ChevronUp : ChevronDown;
    return (
      <Hint text={`${hint} ${t("hints.sort")}`} className={cn("flex", end ? "w-full justify-end" : "min-w-0")}>
        {(describedBy) => (
          <button
            type="button"
            aria-describedby={describedBy}
            onClick={() => setSort(!sorted ? { key, reversed: false } : sorted.reversed ? null : { key, reversed: true })}
            className={cn(
              "flex items-center gap-1 rounded-md py-0.5 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              end && "justify-end",
              state && "text-foreground",
            )}
          >
            {label}
            <Icon aria-hidden className="size-3.5 shrink-0" />
          </button>
        )}
      </Hint>
    );
  }

  /**
   * A click anywhere on a question opens its page; the links, buttons and boxes (and, on a phone, hints) in it
   * keep their own click, and so does a menu the row opened (drawn outside it, its clicks still reach the row).
   */
  function openQuestion(event: React.MouseEvent, prompt: Prompt, own = "a, button, input") {
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
    if (event.target instanceof Element && event.target.closest(own)) return;
    router.push(pageOf(prompt));
  }

  const languageMark = (prompt: Prompt) => (
    <Hint text={t(`hints.language.${prompt.language}`)} focusable={false} described={false} className="font-semibold uppercase">
      {prompt.language}
    </Hint>
  );
  const questionLink = (prompt: Prompt) => (
    <Link href={pageOf(prompt)} lang={prompt.language} className="text-pretty underline-offset-4 outline-none hover:underline focus-visible:underline">
      {prompt.text}
    </Link>
  );
  const box = ({ prompt }: Row) => <SelectBox checked={pickedSet.has(prompt.id)} label={t("selection.one", { text: prompt.text })} onChange={() => toggle(prompt.id)} />;
  const queued = (
    <Hint text={t("hints.queued")} focusable={false} className="rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap">
      {t("queued")}
    </Hint>
  );
  const factsOf = (prompt: Prompt) => wrongFacts.filter((fact) => fact.promptId === prompt.id).length;

  /** Under the question: its language and topic, the wrong facts found in its answers, its tags. */
  const meta = (row: Row) => {
    const count = row.stats && row.prompt.factCheck ? factsOf(row.prompt) : 0;
    return (
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        {languageMark(row.prompt)}
        <span aria-hidden>·</span>
        <span>{topicLabel(row.prompt.topic)}</span>
        {count > 0 && (
          <>
            <span aria-hidden>·</span>
            <Link href={wrongFactsHref} className="inline-flex items-center gap-1 font-medium text-negative underline-offset-4 outline-none hover:underline focus-visible:underline">
              <CircleAlert aria-hidden className="size-3.5" />
              {t("wrongFactsMark", { count })}
            </Link>
          </>
        )}
        {(row.prompt.tags.length > 0 || tagging === row.prompt.id) && (
          <span className="ml-1">
            <TagsCell tags={row.prompt.tags} allTags={allTags} question={row.prompt.text} onChange={(next) => patch.mutate({ ids: [row.prompt.id], tags: next })} />
          </span>
        )}
      </span>
    );
  };

  /** How many of the question's answers named the client: "1 / 3", the first number green when any did. */
  const youNamed = (row: Row) =>
    row.stats ? (
      <Hint text={t("visibilityHint", { count: row.stats.named, total: row.stats.total })} focusable={false} described={false} className="whitespace-nowrap tabular-nums">
        <span className={cn("font-semibold", row.stats.named > 0 ? "text-positive" : "text-muted-foreground")}>{row.stats.named}</span>
        {/* No-break spaces: a flex box drops a plain one at its start */}
        <span className="text-muted-foreground">{"\u00a0/\u00a0"}{row.stats.total}</span>
        <span className="sr-only"> {t("visibilityHint", { count: row.stats.named, total: row.stats.total })}</span>
      </Hint>
    ) : (
      // Not asked yet: queued for the next check
      queued
    );

  /** Who the answers named, the most named first, written out (the initials were unreadable); the client as "You". */
  const whoNamed = (row: Row) => {
    if (!row.stats) return <span className="text-muted-foreground">—</span>;
    if (row.named.length === 0) return <span className="text-muted-foreground">{t("nobody")}</span>;
    const shown = row.named.slice(0, NAMES_SHOWN);
    return (
      <span className="text-pretty">
        {shown.map((brand, index) => (
          <span key={brand.id}>
            {index > 0 && ", "}
            <span className={brand.isYou ? "font-semibold text-you" : undefined}>{brand.isYou ? t("you") : brand.name}</span>
          </span>
        ))}
        {row.named.length > shown.length && <span className="text-muted-foreground"> {t("moreNames", { count: row.named.length - shown.length })}</span>}
      </span>
    );
  };

  /** A question's own ⋯: edit it, its tags, its fact-checking, archive it. */
  const rowMenu = ({ prompt }: Row) => (
    <DropdownMenu>
      <Hint text={t("rowMenuHint")} described={false}>
        {() => (
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("rowMenu", { text: prompt.text })} disabled={busyIds.has(prompt.id)} />}>
            <More aria-hidden weight="bold" />
          </DropdownMenuTrigger>
        )}
      </Hint>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={() => openDialog({ kind: "edit", prompt })}>
          <Pencil aria-hidden />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTagging(prompt.id)}>
          <Tag aria-hidden />
          {t("columns.tags")}
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={prompt.factCheck} onCheckedChange={(on) => patch.mutate({ ids: [prompt.id], factCheck: on })}>
          {t("columns.factCheck")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => update.mutate({ ids: [prompt.id], archived: true })}>
          <Archive aria-hidden />
          {t("archive")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Peec's "Branding", kept for the export: whether the question names the client's brand
  const brandName = brands.find((brand) => brand.id === youId)?.name.toLowerCase() ?? "";
  const isBranded = (prompt: Prompt) => brandName !== "" && prompt.text.toLowerCase().includes(brandName);
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
      t("csvHeaders.branded"),
      t("csvHeaders.factCheck"),
      t("csvHeaders.wrongFacts"),
      t("csvHeaders.tags"),
      t("csvHeaders.location"),
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
      t(isBranded(prompt) ? "branded.yes" : "branded.no"),
      t(prompt.factCheck ? "factCheckValues.on" : "factCheckValues.off"),
      stats && prompt.factCheck ? factsOf(prompt) : null,
      prompt.tags.join(", "),
      labelFor(messages.Cities, prompt.location),
      stats ? formatIsoDay(collectedAt, timeZone) : t("queued"),
      formatIsoDay(prompt.createdAt, timeZone),
    ]),
  ];
  const used = Math.min(1, tracked.length / limit);
  const usedHint = t("usedHint", { plan: plans(plan), max: limit });
  const allPicked = visibleIds.length > 0 && visibleIds.every((id) => pickedSet.has(id));

  const searchBox = (
    <div className="relative w-full min-w-40 @md:w-48">
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
        className={fieldClass("sm", "h-9 pr-2 pl-8")}
      />
    </div>
  );

  // The rare things, out of the way in one ⋯: a topic, words from an SEO tool, archiving everything
  const editable = currentTopic !== "" && view !== "suggested" && topics.includes(currentTopic);
  const pageMenu = (
    <DropdownMenu>
      <Hint text={t("menu.label")} described={false}>
        {() => (
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label={t("menu.label")} className="size-9" />}>
            <More aria-hidden weight="bold" />
          </DropdownMenuTrigger>
        )}
      </Hint>
      <DropdownMenuContent align="end" className="w-64">
        {/* On a phone the button's place in the row is taken: it is here instead */}
        <DropdownMenuItem className="sm:hidden" onClick={() => router.push(discoveryHref)}>
          <Sparkles aria-hidden />
          {t("buttons.discovery")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openTopic(null)}>
          <Plus aria-hidden />
          {t("topicsColumn.new")}
        </DropdownMenuItem>
        {editable && (
          <DropdownMenuItem onClick={() => openTopic(currentTopic)}>
            <Pencil aria-hidden />
            {t("menu.editTopic", { topic: topicLabel(currentTopic) })}
          </DropdownMenuItem>
        )}
        {view === "suggested" && (
          <DropdownMenuItem onClick={() => openDialog({ kind: "keywords" })}>
            <UploadCloud aria-hidden />
            {t("buttons.keywords")}
          </DropdownMenuItem>
        )}
        {view === "tracked" && tracked.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => openDialog({ kind: "archiveAll" })}>
              <Archive aria-hidden />
              {t("selection.archiveAll")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  // Suggested: what to do with all of them, until some are picked
  const footer = picked.length > 0 || (view === "suggested" && suggestedRows.length > 0);

  return (
    <div aria-busy={pending} className={cn("@container flex min-w-0 flex-1 flex-col transition-opacity", pending && "opacity-70")}>
      {/* One row: the tabs, then how much of the plan is used and the page's buttons */}
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2">
        <div role="group" aria-label={t("tabsLabel")} data-tour="tabs" className="flex items-center gap-1 self-stretch">
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
        <div data-tour="add" className="flex flex-wrap items-center gap-2">
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
          <Hint text={t("buttons.discoveryHint")} described={false}>
            {() => (
              <Link href={discoveryHref} className={cn(buttonVariants({ variant: "outline" }), "hidden h-9 sm:inline-flex")}>
                <Sparkles aria-hidden data-icon="inline-start" />
                {t("buttons.discovery")}
              </Link>
            )}
          </Hint>
          {view === "suggested" ? (
            <Hint text={suggestedTopic ? t("buttons.moreTopicHint", { topic: topicLabel(suggestedTopic) }) : t("buttons.moreHint")} described={false}>
              {() => (
                <Button className="h-9" disabled={more.isPending} onClick={() => more.mutate()}>
                  <Sparkles aria-hidden data-icon="inline-start" className={cn(more.isPending && "animate-pulse")} />
                  {more.isPending ? t("buttons.suggesting") : t("buttons.more")}
                </Button>
              )}
            </Hint>
          ) : (
            <Hint text={full ? t("full", { plan: plans(plan), max: limit }) : t("buttons.addHint")} described={false}>
              {() => (
                <Button className="h-9" disabled={full} onClick={() => openDialog({ kind: "add" })}>
                  <Plus aria-hidden data-icon="inline-start" />
                  {t("add")}
                </Button>
              )}
            </Hint>
          )}
          {pageMenu}
        </div>
      </div>

      {/* One row of tools: the search, the filters, the export */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        {searchBox}
        <span data-tour="topics" className="flex">
          <FilterMenu icon={ListTree} label={t("columns.topic")} value={currentTopic} options={topicOptions} onChange={pickTopic} />
        </span>
        {view !== "suggested" && filterBar}
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
        {view === "tracked" && allTags.length > 0 && (
          <FilterMenu
            icon={Tag}
            label={t("tagFilter.label")}
            value={tag}
            options={[
              { value: "", label: t("tagFilter.all"), count: inTopic.length },
              ...allTags.map((option) => ({ value: option, label: option, count: inTopic.filter((row) => row.prompt.tags.includes(option)).length })),
            ]}
            onChange={(value) => {
              setTagFilter(value);
              setSelected(new Set());
            }}
          />
        )}
        {view === "tracked" && rows.length > 0 && <CsvButton iconOnly filename={filename} label={t("csv")} hint={t("csvHint")} rows={csvRows} className="ml-auto h-9 w-9" />}
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
        ) : tracked.length === 0 ? (
          <div className="m-4 flex flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        ) : (
          <>
            {/* Where the client stands over the questions shown, then when they are asked again */}
            <div data-tour="summary" className="flex flex-col gap-1 border-b px-4 py-3">
              <p className="text-pretty">
                {asked.length === 0 ? (
                  t("summary.none")
                ) : (
                  <>
                    <span className="font-medium">{t("summary.line", { named: namedYou, asked: asked.length })}</span>
                    {rivalsOnly > 0 && ` ${t("summary.rivals", { count: rivalsOnly })}`}
                    {waiting > 0 && ` ${t("summary.queued", { count: waiting })}`}
                  </>
                )}
              </p>
              {(trial || nextRunAt || tracked.length < Math.min(MIN_PROMPTS, limit)) && (
                <p className="text-sm text-pretty text-muted-foreground">
                  {trial ? t("trialNote") : nextRunAt ? t("schedule", { date: formatWeekdayDate(nextRunAt, locale, timeZone) }) : ""}
                  {!trial && tracked.length < Math.min(MIN_PROMPTS, limit) && ` ${t("belowMin")}`}
                </p>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="m-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("noMatch")}</p>
            ) : (
              <>
                {/* A wide panel: four columns that fit it, no sideways scrolling */}
                <table className="hidden w-full table-fixed text-[0.9375rem] @3xl:table">
                  <thead>
                    <tr className="border-b bg-muted/60 text-left text-sm text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-normal [&>th:first-child]:pl-4 [&>th:last-child]:pr-3">
                      <th scope="col" aria-sort={sortState("question") ?? undefined}>
                        <span className="flex items-center gap-3">
                          <SelectBox checked={allPicked} mixed={picked.length > 0 && !allPicked} label={t("selection.all")} onChange={() => toggleAll(visibleIds)} />
                          {sortButton("question", t("columns.question"), t("hints.question"))}
                        </span>
                      </th>
                      <th scope="col" aria-sort={sortState("visibility") ?? undefined} className="w-40 text-right">
                        {sortButton("visibility", t("columns.youNamed"), t("hints.youNamed"), true)}
                      </th>
                      <th scope="col" className="w-[34%]">
                        <Hint text={t("hints.whoNamed")}>{t("columns.whoNamed")}</Hint>
                      </th>
                      <th scope="col" className="w-12">
                        <span className="sr-only">{t("columns.actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row, index) => (
                      <tr
                        key={row.prompt.id}
                        data-tour={index === 0 ? "row" : undefined}
                        onClick={(event) => openQuestion(event, row.prompt)}
                        className={cn(
                          "cursor-pointer align-top transition-colors [&>td]:px-3 [&>td]:py-3 [&>td:first-child]:pl-4 [&>td:last-child]:pr-2",
                          pickedSet.has(row.prompt.id) ? "bg-you-soft/40" : "hover:bg-muted/50",
                          busyIds.has(row.prompt.id) && "opacity-50",
                        )}
                      >
                        <td>
                          <span className="flex items-start gap-3">
                            <span className="flex h-6 items-center">{box(row)}</span>
                            <span className="flex min-w-0 flex-col gap-1">
                              {questionLink(row.prompt)}
                              {meta(row)}
                            </span>
                          </span>
                        </td>
                        <td className="text-right">
                          <span className="flex h-6 items-center justify-end">{youNamed(row)}</span>
                        </td>
                        <td>
                          <span className="block pt-0.5 text-sm">{whoNamed(row)}</span>
                        </td>
                        <td>
                          <span className="flex justify-end">{rowMenu(row)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* A narrow panel: the same rows as cards */}
                <ul className="divide-y @3xl:hidden">
                  {rows.map((row, index) => (
                    <li
                      key={row.prompt.id}
                      data-tour={index === 0 ? "row" : undefined}
                      onClick={(event) => openQuestion(event, row.prompt, "a, button, input, [data-hint]")}
                      className={cn("flex cursor-pointer items-start gap-3 py-3 pr-2 pl-4 transition-colors", pickedSet.has(row.prompt.id) ? "bg-you-soft/40" : "hover:bg-muted/30")}
                    >
                      <span className="flex h-6 items-center">{box(row)}</span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="text-[0.9375rem]">{questionLink(row.prompt)}</span>
                        {meta(row)}
                        <p className="flex flex-col gap-0.5 text-sm">
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-muted-foreground">{t("columns.youNamed")}:</span>
                            {youNamed(row)}
                          </span>
                          {row.stats && (
                            <span>
                              <span className="text-muted-foreground">{t("columns.whoNamed")}: </span>
                              {whoNamed(row)}
                            </span>
                          )}
                        </p>
                      </div>
                      {rowMenu(row)}
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

      {/* With rows picked, what to do with them; on the suggestions, also what to do with all of them */}
      {footer && (
        <div data-tour="footer" className="sticky bottom-0 z-2 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-background px-4 py-2.5 text-sm">
          {picked.length > 0 ? (
            <>
              <p className="flex items-center gap-2">
                <span className="font-medium">{t("selection.count", { count: picked.length })}</span>
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
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
              <p className="text-muted-foreground">
                <Hint text={t("footer.suggestedHint")} className="font-medium text-foreground">
                  {t("footer.suggested", { count: suggestedRows.length })}
                </Hint>
              </p>
              <div className="flex flex-wrap items-center gap-2">
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
              </div>
            </>
          )}
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <AddPromptDialog
          key={session}
          projectId={projectId}
          open
          onOpenChange={(open) => !open && closeDialog()}
          prompt={dialog.kind === "edit" ? dialog.prompt : undefined}
          topics={topics.map((topic) => ({ value: topic, label: topicLabel(topic) }))}
          defaultTopic={(view === "suggested" ? suggestedTopic : filters.topic) ?? ""}
          defaultLocation={city}
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
      {dialog?.kind === "topic" && (
        <TopicDialog
          key={session}
          open
          topic={dialog.topic}
          label={dialog.topic === null ? "" : topicLabel(dialog.topic)}
          count={dialog.topic === null ? 0 : tracked.filter((prompt) => prompt.topic === dialog.topic).length}
          onOpenChange={(open) => !open && closeDialog()}
          onSave={(name) => saveTopic(dialog.topic, name)}
          onDelete={() => dialog.topic !== null && openDialog({ kind: "deleteTopic", topic: dialog.topic })}
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
