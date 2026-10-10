"use client";

import { useMutation } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  FileText,
  Folder,
  Globe,
  Layers,
  ListFilter,
  ListTree,
  Plus,
  RotateCcw,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Undo2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMessages, useTimeZone, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACTION_KIND_ICONS, useActionTitle } from "@/shared/components/actions/action-title";
import { Hint } from "@/shared/components/hint";
import { ConfirmModal } from "@/shared/components/modal";
import { Tour, type TourStep } from "@/shared/components/tour";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { api } from "@/shared/api/client";
import { ACTION_STEP_COUNT, TIME_ZONE } from "@/shared/constants";
import { downloadCsv } from "@/shared/helpers/csv";
import { formatIsoDay } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { Action, ActionImpact, ActionKind, ActionStatus, SourceType, UpdateActionRequest } from "@/shared/types/api";
import { GOALS, SHOWN_ROWS, STATUS_GROUPS } from "../constants";
import { downloadJson } from "../helpers/export";
import {
  CATEGORIES,
  GROUP_BYS,
  IMPACTS,
  NO_FILTERS,
  OWNERS,
  categoryOf,
  filterCount,
  ownerOf,
  passes,
  topicOf,
  type ActionFilters,
  type Category,
  type GroupBy,
  type Owner,
} from "../helpers/grouping";
import { ActionPanel, type QuestionInfo, type SitePages } from "./action-panel";
import { ActionRow } from "./action-row";
import { ActionToast, type ToastState } from "./action-toast";
import { AddContentDialog } from "./add-content-dialog";
import { GoalTiles, type GoalCount } from "./goal-tiles";
import { StatusIcon } from "./status-icon";

/** From this width of the page (Tailwind's @4xl) an opened action sits beside the list, as on Peec; below it, it covers the screen. */
const SPLIT_WIDTH = 896;
/** The group of actions without a topic, when grouping by topic. */
const NO_TOPIC = "";
/** Remembers in the browser that the tour was shown, so it starts by itself only once. */
const TOUR_KEY = "geo-tour:actions";
/** The kinds of site a listing can be on, for the "Site kind" filter. */
const SITE_KINDS: SourceType[] = ["directory", "news", "social", "other"];

const CATEGORY_KINDS: Record<Category, ActionKind> = {
  fact: "fact",
  directory: "listing",
  news: "listing",
  social: "listing",
  other: "listing",
  newPage: "content",
  rework: "content",
  access: "technical",
  markup: "technical",
};
const IMPACT_ICONS: Record<ActionImpact, LucideIcon> = { high: SignalHigh, medium: SignalMedium, low: SignalLow };
const OWNER_ICONS: Record<Owner, LucideIcon> = { own: FileText, earned: Globe, everywhere: Layers };

/** A group of actions under a status, and its sub-groups by what to do when there are two or more. */
interface Branch {
  group: string;
  key: string;
  rows: Action[];
  categories: { category: Category; key: string; rows: Action[] }[] | null;
}

const statusKey = (status: ActionStatus) => `s:${status}`;

function groupOf(action: Action, groupBy: GroupBy, topic: string | null): string {
  switch (groupBy) {
    case "goal":
      return action.kind;
    case "category":
      return categoryOf(action);
    case "impact":
      return action.impact;
    case "owner":
      return ownerOf(action);
    case "topic":
      return topic ?? NO_TOPIC;
  }
}

/** The groups of one status in their order; under a goal, its kinds of work when it has two or more, as on Peec. */
function branchesOf(list: Action[], status: ActionStatus, groupBy: GroupBy, order: string[], topicFor: (action: Action) => string | null): Branch[] {
  const inStatus = list.filter((action) => action.status === status);
  return order.flatMap((group) => {
    const rows = inStatus.filter((action) => groupOf(action, groupBy, topicFor(action)) === group);
    if (rows.length === 0) return [];
    const categories =
      groupBy === "goal"
        ? CATEGORIES.flatMap((category) => {
            const inCategory = rows.filter((action) => categoryOf(action) === category);
            return inCategory.length > 0 ? [{ category, key: `c:${status}:${group}:${category}`, rows: inCategory }] : [];
          })
        : [];
    return [{ group, key: `g:${status}:${groupBy}:${group}`, rows, categories: categories.length > 1 ? categories : null }];
  });
}

/** What to open (and show in full) so an action's row is on screen. */
function revealOf(list: Action[], action: Action, groupBy: GroupBy, order: string[], topicFor: (action: Action) => string | null) {
  const branch = branchesOf(list, action.status, groupBy, order, topicFor).find((candidate) => candidate.rows.some((row) => row.id === action.id));
  if (!branch) return null;
  const leaf = branch.categories?.find((candidate) => candidate.rows.some((row) => row.id === action.id)) ?? null;
  const rows = leaf?.rows ?? branch.rows;
  return {
    open: { [statusKey(action.status)]: true, [branch.key]: true, ...(leaf ? { [leaf.key]: true } : {}) },
    expand: rows.findIndex((row) => row.id === action.id) >= SHOWN_ROWS ? (leaf?.key ?? branch.key) : null,
  };
}

/** The change as the server will make it, shown before it answers. */
function apply(action: Action, { status, stepsDone }: UpdateActionRequest): Action {
  const next = status ?? action.status;
  const stillDone = next === "done" && action.status === "done";
  return {
    ...action,
    status: next,
    stepsDone: stepsDone ?? action.stepsDone,
    doneAt: next !== "done" ? null : stillDone ? action.doneAt : new Date().toISOString(),
    // A fresh "done" has no proof until the next run
    proof: stillDone ? action.proof : null,
  };
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/**
 * The project's actions laid out like Peec's: a strip of tools (statuses, filters, grouping; the guide,
 * export, "Add a page", "Accept all"), a heading, the four goals as tiles, then the list by status, goal and
 * kind of work, with boxes to pick rows and a footer that stays in view. A row opens the action beside the
 * list (over the screen on a phone), where it is accepted, worked through and marked done; a toast says
 * where it went. Changes show at once and are saved in the background; if saving fails, they go back.
 */
export function ActionBoard({
  projectId,
  initial,
  initialOpenId,
  questions,
  sites,
  topics,
  competitors,
  brand,
  nextRunAt,
  filename,
  after,
}: {
  projectId: string;
  initial: Action[];
  /** Opens this action at once (?action= in the URL, from the Overview). */
  initialOpenId?: string;
  /** The questions the actions should move, by id. */
  questions: Record<string, QuestionInfo>;
  /** The cited sites the actions are about (listings, the client's own), by domain. */
  sites: Record<string, SitePages>;
  /** The project's topics, in their order. */
  topics: string[];
  competitors: { id: string; name: string }[];
  brand: { name: string; domain: string };
  nextRunAt: string | null;
  filename: string;
  /** Shown under the list (the Managed GEO offer). */
  after?: React.ReactNode;
}) {
  const t = useTranslations("Actions");
  const common = useTranslations("Common");
  const messages = useMessages();
  const title = useActionTitle();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const root = useRef<HTMLDivElement>(null);
  const opened = initial.find((action) => action.id === initialOpenId);
  const [actions, setActions] = useState(initial);
  const [statuses, setStatuses] = useState<ActionStatus[]>(STATUS_GROUPS);
  const [filters, setFilters] = useState<ActionFilters>(NO_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>("goal");
  const [goal, setGoal] = useState<ActionKind | null>(null);
  // Groups opened or folded by hand, by key; the others follow their default (the first of each level open)
  const [toggled, setToggled] = useState<Record<string, boolean>>(() => (opened ? (revealOf(initial, opened, "goal", GOALS, () => null)?.open ?? {}) : {}));
  // Groups showing all their rows, not the first SHOWN_ROWS
  const [expanded, setExpanded] = useState<string[]>(() => {
    const expand = opened ? revealOf(initial, opened, "goal", GOALS, () => null)?.expand : null;
    return expand ? [expand] : [];
  });
  const [selectedId, setSelectedId] = useState(opened?.id);
  const [picked, setPicked] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [declining, setDeclining] = useState(false);
  // Whether the page is wide enough for the action beside the list; unknown until measured in the browser
  const [wide, setWide] = useState<boolean | null>(null);

  const topicOfPrompt = useMemo(() => new Map(Object.entries(questions).map(([id, question]) => [id, question.topic])), [questions]);
  const namesById = useMemo(() => new Map(competitors.map((competitor) => [competitor.id, competitor.name])), [competitors]);
  const topicFor = (action: Action) => topicOf(action, topicOfPrompt);
  const topicOrder = [
    ...topics,
    ...new Set(actions.map(topicFor).filter((topic): topic is string => topic !== null && !topics.includes(topic))),
  ];
  const order: string[] =
    groupBy === "goal" ? GOALS : groupBy === "category" ? CATEGORIES : groupBy === "impact" ? IMPACTS : groupBy === "owner" ? OWNERS : [...topicOrder, NO_TOPIC];

  const filtered = actions.filter((action) => passes(action, filters, topicFor(action)));
  const shown = goal ? filtered.filter((action) => action.kind === goal) : filtered;
  const selected = actions.find((action) => action.id === selectedId) ?? null;
  const split = selected !== null && wide !== false;
  const newShown = shown.filter((action) => action.status === "new");
  const openShown = shown.filter((action) => action.status === "new" || action.status === "in_progress").length;
  const firstStatus = STATUS_GROUPS.find((status) => shown.some((action) => action.status === status)) ?? "new";
  const counts = Object.fromEntries(
    GOALS.map((kind): [ActionKind, GoalCount] => {
      const ofKind = filtered.filter((action) => action.kind === kind);
      return [
        kind,
        {
          open: ofKind.filter((action) => action.status === "new" || action.status === "in_progress").length,
          done: ofKind.filter((action) => action.status === "done").length,
          total: ofKind.filter((action) => action.status !== "declined").length,
        },
      ];
    }),
  ) as Record<ActionKind, GoalCount>;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWide((entry?.contentRect.width ?? 0) >= SPLIT_WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Over the screen on a phone, the action closes with Escape wherever the focus is, as a window does
  useEffect(() => {
    if (!selectedId || wide !== false || tourOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setSelectedId(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, wide, tourOpen]);

  const save = useMutation({
    mutationFn: ({ id, change }: { id: string; change: UpdateActionRequest }) => api.updateAction(projectId, id, change),
    onMutate: ({ id, change }) => {
      const before = actions.find((action) => action.id === id);
      setActions((list) => list.map((action) => (action.id === id ? apply(action, change) : action)));
      return { before };
    },
    onError: (_error, { id }, context) => {
      const before = context?.before;
      if (before) setActions((list) => list.map((action) => (action.id === id ? before : action)));
    },
    onSuccess: (saved) => setActions((list) => list.map((action) => (action.id === saved.id ? saved : action))),
  });

  const saveMany = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ActionStatus }) => api.updateActions(projectId, { ids, status }),
    onMutate: ({ ids, status }) => {
      const before = actions.filter((action) => ids.includes(action.id));
      setActions((list) => list.map((action) => (ids.includes(action.id) ? apply(action, { status }) : action)));
      return { before };
    },
    onError: (_error, _variables, context) => {
      const before = new Map(context?.before.map((action) => [action.id, action]));
      setActions((list) => list.map((action) => before.get(action.id) ?? action));
    },
    onSuccess: (saved) => {
      const byId = new Map(saved.map((action) => [action.id, action]));
      setActions((list) => list.map((action) => byId.get(action.id) ?? action));
    },
  });

  /** Opens the groups that hold an action's row, in the list as it is (or will be, with `list`). */
  function reveal(action: Action, list: Action[] = shown) {
    const found = revealOf(list, action, groupBy, order, topicFor);
    if (!found) return;
    setToggled((current) => ({ ...current, ...found.open }));
    if (found.expand) {
      const key = found.expand;
      setExpanded((current) => (current.includes(key) ? current : [...current, key]));
    }
  }

  function announce(status: ActionStatus, count: number, action?: Action) {
    setToast((current) => ({ key: (current?.key ?? 0) + 1, status, count }));
    setAnnouncement(action ? t("changed", { title: title(action), status: t(`status.${status}`) }) : t("changedMany", { count, status: t(`status.${status}`) }));
  }

  /** One action moved on from its panel or its first ticked step. */
  function changeStatus(action: Action, status: ActionStatus, stepsDone?: number[]) {
    save.mutate({ id: action.id, change: stepsDone ? { status, stepsDone } : { status } });
    announce(status, 1, action);
    if (action.status === "new" && status === "in_progress") {
      // As on Peec: "New" folds and "In progress" opens on the accepted action
      const moved = apply(action, { status, stepsDone });
      reveal(moved, shown.map((candidate) => (candidate.id === action.id ? moved : candidate)));
      setToggled((current) => ({ ...current, [statusKey("new")]: false }));
      setStatuses((list) => (list.includes(status) ? list : [...list, status]));
    }
  }

  function changeMany(ids: string[], status: ActionStatus) {
    if (ids.length === 0) return;
    saveMany.mutate({ ids, status });
    setPicked([]);
    announce(status, ids.length);
  }

  function toggleStep(action: Action, step: number) {
    const stepsDone = action.stepsDone.includes(step) ? action.stepsDone.filter((done) => done !== step) : [...action.stepsDone, step].sort((a, b) => a - b);
    // Ticking a step of a new action takes it on
    if (action.status === "new" && stepsDone.length > action.stepsDone.length) changeStatus(action, "in_progress", stepsDone);
    else save.mutate({ id: action.id, change: { stepsDone } });
  }

  /** The toast's link: the group the action went to, opened and brought into view. */
  function openGroup(status: ActionStatus) {
    setStatuses((list) => (list.includes(status) ? list : [...list, status]));
    setToggled((current) => ({ ...current, [statusKey(status)]: true }));
    requestAnimationFrame(() => document.getElementById(`actions-${status}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  function closePanel() {
    const id = selectedId;
    setSelectedId(undefined);
    // Back to the action's row
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-action-row="${CSS.escape(id)}"] button`)?.focus());
  }

  const isOpen = (key: string, byDefault: boolean) => toggled[key] ?? byDefault;
  const flip = (key: string, byDefault: boolean) => setToggled((current) => ({ ...current, [key]: !(current[key] ?? byDefault) }));
  const pick = (ids: string[], on: boolean) => setPicked((list) => (on ? [...new Set([...list, ...ids])] : list.filter((id) => !ids.includes(id))));
  // Whatever narrows the list drops the rows picked, so a button never acts on rows out of sight
  const narrow = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPicked([]);
  };

  // The guided tour opens an action with a brief when there is one, as Peec's does, to show the brief
  const tourAction =
    shown.find((action) => action.kind === "content" && action.brief && action.status === "new") ??
    shown.find((action) => action.kind === "content" && action.brief) ??
    shown.find((action) => action.status === "new") ??
    shown[0];
  const tourSteps: TourStep[] = [
    { target: '[data-tour="goals"]', title: t("tour.goals.title"), text: t("tour.goals.text") },
    { target: '[data-tour="impact"]', title: t("tour.impact.title"), text: t("tour.impact.text") },
    {
      target: '[data-tour="row"]',
      title: t("tour.row.title"),
      text: t("tour.row.text"),
      action: { label: t("tour.row.action"), run: () => tourAction && setSelectedId(tourAction.id) },
    },
    { target: '[data-tour="why"]', title: t("tour.why.title"), text: t("tour.why.text") },
    ...(tourAction?.kind === "content" && tourAction.brief
      ? [
          { target: '[data-tour="brief"]', title: t("tour.brief.title"), text: t("tour.brief.text") },
          { target: '[data-tour="assistant"]', title: t("tour.assistant.title"), text: t("tour.assistant.text") },
        ]
      : []),
    { target: '[data-tour="decide"]', title: t("tour.decide.title"), text: t("tour.decide.text") },
  ];

  function startTour() {
    if (!tourAction) return;
    setSelectedId(undefined);
    setGoal(null);
    reveal(tourAction, filtered);
    setTourOpen(true);
  }

  // Peec starts its tour by itself on the first visit; so does ours, once per browser
  useEffect(() => {
    if (initialOpenId || initial.length === 0) return;
    try {
      if (localStorage.getItem(TOUR_KEY)) return;
      localStorage.setItem(TOUR_KEY, "seen");
    } catch {
      return;
    }
    const timer = setTimeout(startTour, 600);
    return () => clearTimeout(timer);
    // Once, on the first render's list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportRows = () =>
    shown.map((action) => ({
      action,
      title: title(action),
      topic: topicFor(action),
      questions: action.promptIds.flatMap((id) => questions[id]?.text ?? []),
    }));

  function exportCsv() {
    downloadCsv(filename, [
      [
        t("csvHeaders.action"),
        t("csvHeaders.goal"),
        t("csvHeaders.category"),
        t("csvHeaders.impact"),
        t("csvHeaders.status"),
        t("csvHeaders.owner"),
        t("csvHeaders.topic"),
        t("csvHeaders.steps"),
        t("csvHeaders.questions"),
        t("csvHeaders.createdAt"),
        t("csvHeaders.doneAt"),
      ],
      ...exportRows().map(({ action, title: name, topic, questions: texts }) => [
        name,
        t(`goals.${action.kind}`),
        t(`categories.${categoryOf(action)}`),
        t(`impact.${action.impact}`),
        t(`status.${action.status}`),
        action.kind === "listing" ? action.domain : t(`owners.${ownerOf(action)}`),
        topic ? labelFor(messages.Topics, topic) : "",
        `${action.stepsDone.length}/${ACTION_STEP_COUNT}`,
        texts.join(" | "),
        formatIsoDay(action.createdAt, timeZone),
        action.doneAt ? formatIsoDay(action.doneAt, timeZone) : "",
      ]),
    ]);
  }

  function exportJson() {
    downloadJson(
      filename,
      exportRows().map(({ action, title: name, topic, questions: texts }) => ({
        id: action.id,
        title: name,
        goal: action.kind,
        category: categoryOf(action),
        impact: action.impact,
        status: action.status,
        where: action.kind === "listing" ? action.domain : ownerOf(action),
        topic,
        steps: { done: action.stepsDone.length, total: ACTION_STEP_COUNT },
        questions: texts,
        createdAt: action.createdAt,
        doneAt: action.doneAt,
        ...(action.kind === "fact" ? { claim: action.claim, correct: action.correct } : {}),
        ...(action.kind === "content" ? { url: action.url, brief: action.brief } : {}),
        proof: action.proof,
      })),
    );
  }

  // The rows picked, and which buttons of the footer apply to them
  const pickedActions = actions.filter((action) => picked.includes(action.id));
  const idsIn = (...from: ActionStatus[]) => pickedActions.filter((action) => from.includes(action.status)).map((action) => action.id);
  const toDecline = idsIn("new", "in_progress");
  const toAccept = idsIn("new");
  const toFinish = idsIn("in_progress");
  const toRestore = idsIn("declined");
  const toReopen = idsIn("done");

  const filterOptions: { [K in keyof ActionFilters]: { value: ActionFilters[K][number]; label: string }[] } = {
    topics: topicOrder.map((topic) => ({ value: topic, label: labelFor(messages.Topics, topic) })),
    owners: OWNERS.map((owner) => ({ value: owner, label: t(`owners.${owner}`) })),
    sourceTypes: SITE_KINDS.map((kind) => ({ value: kind, label: t(`siteKinds.${kind as "directory"}`) })),
    categories: CATEGORIES.map((category) => ({ value: category, label: t(`categories.${category}`) })),
  };
  const activeFilters = filterCount(filters);
  const statusLabel =
    statuses.length === STATUS_GROUPS.length ? t("statusAll") : statuses.length === 1 ? t(`status.${statuses[0] ?? "new"}`) : t("statusSome", { count: statuses.length });

  const groupLabel = (key: string): string => {
    switch (groupBy) {
      case "goal":
        return t(`goals.${key as ActionKind}`);
      case "category":
        return t(`categories.${key as Category}`);
      case "impact":
        return t(`impact.${key as ActionImpact}`);
      case "owner":
        return t(`owners.${key as Owner}`);
      case "topic":
        return key === NO_TOPIC ? t("noTopic") : labelFor(messages.Topics, key);
    }
  };
  const groupIcon = (key: string): LucideIcon => {
    switch (groupBy) {
      case "goal":
        return ACTION_KIND_ICONS[key as ActionKind];
      case "category":
        return ACTION_KIND_ICONS[CATEGORY_KINDS[key as Category]];
      case "impact":
        return IMPACT_ICONS[key as ActionImpact];
      case "owner":
        return OWNER_ICONS[key as Owner];
      case "topic":
        return Folder;
    }
  };

  /** A list of rows: the first SHOWN_ROWS, then "Show all", on a line down the left as on Peec. */
  function rowList(rows: Action[], key: string) {
    const all = expanded.includes(key);
    return (
      <div className="ml-3.25 flex flex-col border-l pl-2">
        <ul className="flex flex-col">
          {(all ? rows : rows.slice(0, SHOWN_ROWS)).map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              open={action.id === selectedId}
              picked={picked.includes(action.id)}
              picking={picked.length > 0}
              tour={tourOpen && action.id === tourAction?.id}
              onOpen={() => setSelectedId(action.id)}
              onPick={() => pick([action.id], !picked.includes(action.id))}
            />
          ))}
        </ul>
        {rows.length > SHOWN_ROWS && (
          <button
            type="button"
            onClick={() => setExpanded((list) => toggle(list, key))}
            className="my-1 ml-7 w-fit rounded-md bg-muted px-2 py-1 text-sm transition-colors hover:bg-muted/70"
          >
            {all ? t("showLess") : t("showAll", { count: rows.length })}
          </button>
        )}
      </div>
    );
  }

  const panel = selected && (
    <ActionPanel
      action={selected}
      questions={questions}
      sites={sites}
      competitors={namesById}
      brand={brand}
      nextRunAt={nextRunAt}
      questionHref={(promptId) => `/projects/${projectId}/prompts/${encodeURIComponent(promptId)}`}
      busy={save.isPending && save.variables?.id === selected.id && save.variables.change.status !== undefined}
      autoFocus={wide === false}
      onClose={closePanel}
      onStatus={(status) => changeStatus(selected, status)}
      onStep={(step) => toggleStep(selected, step)}
    />
  );
  const toolButton =
    "inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm shadow-xs transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-muted/60";

  return (
    <div ref={root} className="@container flex flex-1 flex-col">
      {/* The page's tools, as Peec's strip: what to show on the left, what to do on the right */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2 sm:px-6 @4xl:sticky @4xl:top-12 @4xl:z-5 @4xl:h-12.25 @4xl:flex-nowrap">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(toolButton, statuses.length < STATUS_GROUPS.length && "border-foreground/25 font-medium")}>
              <Circle aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{statusLabel}</span>
              <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuCheckboxItem checked={statuses.length === STATUS_GROUPS.length} onCheckedChange={() => narrow(setStatuses)(STATUS_GROUPS)}>
                {t("statusAll")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {STATUS_GROUPS.map((status) => (
                <CheckRow
                  key={status}
                  checked={statuses.includes(status)}
                  // The last status stays: an empty list would read as a bug
                  onToggle={() => statuses.length > 1 || !statuses.includes(status) ? narrow(setStatuses)(STATUS_GROUPS.filter((candidate) => candidate === status ? !statuses.includes(status) : statuses.includes(candidate))) : undefined}
                >
                  <StatusIcon status={status} />
                  {t(`status.${status}`)}
                </CheckRow>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(toolButton, activeFilters > 0 && "border-foreground/25 font-medium")}>
              <ListFilter aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{activeFilters > 0 ? t("filtersSome", { count: activeFilters }) : t("filtersAll")}</span>
              <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("filterBy")}</DropdownMenuLabel>
                {(Object.keys(filterOptions) as (keyof ActionFilters)[]).map((group) => {
                  const chosen = filters[group] as string[];
                  return (
                    <DropdownMenuSub key={group}>
                      <DropdownMenuSubTrigger>
                        <span className="flex-1">{t(`filterGroups.${group}`)}</span>
                        {chosen.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{chosen.length}</span>}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-80 w-64">
                        <DropdownMenuCheckboxItem checked={chosen.length === 0} onCheckedChange={() => narrow(setFilters)({ ...filters, [group]: [] })}>
                          {t("filterAll")}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {(filterOptions[group] as { value: string; label: string }[]).map((option) => (
                          <CheckRow key={option.value} checked={chosen.includes(option.value)} onToggle={() => narrow(setFilters)({ ...filters, [group]: toggle(chosen, option.value) })}>
                            <span className="truncate">{option.label}</span>
                          </CheckRow>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  );
                })}
              </DropdownMenuGroup>
              {activeFilters > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => narrow(setFilters)(NO_FILTERS)}>
                    <X aria-hidden />
                    {t("clearFilters")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={toolButton}>
              <ListTree aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{t("groupByLabel", { by: t(`groupBy.${groupBy}`) })}</span>
              <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuRadioGroup value={groupBy} onValueChange={(value: GroupBy) => setGroupBy(value)}>
                {GROUP_BYS.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option} closeOnClick>
                    {t(`groupBy.${option}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Hint text={t("guideHint")} described={false}>
            {() => (
              <Button variant="outline" size="icon" aria-label={t("guide")} onClick={startTour} className="bg-background">
                <BookOpen aria-hidden />
              </Button>
            )}
          </Hint>
          <DropdownMenu>
            <Hint text={t("exportHint")} described={false}>
              {() => (
                <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label={t("export")} className="bg-background" />}>
                  <Upload aria-hidden />
                </DropdownMenuTrigger>
              )}
            </Hint>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("exportFormat")}</DropdownMenuLabel>
                <DropdownMenuItem onClick={exportCsv}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={exportJson}>JSON</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Its icon alone on a phone, where the strip has no room for the words */}
          <Button variant="ghost" aria-label={t("addContent")} onClick={() => setAddOpen(true)} className="@max-md:size-8 @max-md:px-0">
            <Plus aria-hidden data-icon="inline-start" />
            <span className="hidden @md:inline">{t("addContent")}</span>
          </Button>
          {!split && (
            <Button disabled={newShown.length === 0 || saveMany.isPending} onClick={() => changeMany(newShown.map((action) => action.id), "in_progress")}>
              <Check aria-hidden data-icon="inline-start" />
              {t("acceptAll")}
            </Button>
          )}
        </div>
      </div>

      {!split && (
        <>
          <div className="flex flex-col gap-1 px-4 pt-5 pb-4 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight text-pretty">{t("heading")}</h2>
            <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{t("subtitle")}</p>
          </div>
          <GoalTiles counts={counts} value={goal} onChange={narrow(setGoal)} />
        </>
      )}

      <div className="flex flex-1">
        <div className="@container flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-0.5 px-2 py-3 sm:px-4">
            {(save.isError || saveMany.isError) && (
              <p role="alert" className="px-2 pb-2 text-sm text-destructive">
                {t("saveFailed")}
              </p>
            )}

            {shown.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">{goal ? t("emptyGoal") : t("emptyFiltered")}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                    setGoal(null);
                  }}
                >
                  {t("clearFilters")}
                </Button>
              </div>
            ) : (
              STATUS_GROUPS.filter((status) => statuses.includes(status)).map((status) => {
                const branches = branchesOf(shown, status, groupBy, order, topicFor);
                const count = branches.reduce((sum, branch) => sum + branch.rows.length, 0);
                const statusOpen = isOpen(statusKey(status), status === firstStatus);
                return (
                  <section key={status} id={`actions-${status}`} aria-labelledby={`actions-${status}-title`} className="scroll-mt-28">
                    <h3 id={`actions-${status}-title`}>
                      <button
                        type="button"
                        aria-expanded={statusOpen}
                        onClick={() => flip(statusKey(status), status === firstStatus)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <Caret open={statusOpen} />
                        <StatusIcon status={status} />
                        <span className={cn("font-medium", !statusOpen && "text-muted-foreground")}>{t(`status.${status}`)}</span>
                        <span className="text-muted-foreground tabular-nums">{count}</span>
                      </button>
                    </h3>
                    {statusOpen &&
                      (count === 0 ? (
                        <p className="py-2 pl-10 text-sm text-muted-foreground">{t("emptyGroup")}</p>
                      ) : (
                        <div className="flex flex-col gap-0.5 pb-2 pl-2">
                          {branches.map((branch, index) => {
                            const branchOpen = isOpen(branch.key, index === 0);
                            const Icon = groupIcon(branch.group);
                            return (
                              <div key={branch.key} className="flex flex-col">
                                <button
                                  type="button"
                                  aria-expanded={branchOpen}
                                  onClick={() => flip(branch.key, index === 0)}
                                  className={cn(
                                    "flex w-fit max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50",
                                    !branchOpen && "text-muted-foreground",
                                  )}
                                >
                                  <Caret open={branchOpen} />
                                  <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                                  <span className={cn("truncate", branchOpen && "font-medium")}>{groupLabel(branch.group)}</span>
                                  <Count value={branch.rows.length} />
                                </button>
                                {branchOpen &&
                                  (branch.categories ? (
                                    <div className="ml-3.25 flex flex-col gap-0.5 border-l pl-2">
                                      {branch.categories.map((leaf, leafIndex) => {
                                        const leafOpen = isOpen(leaf.key, leafIndex === 0);
                                        const ids = leaf.rows.map((action) => action.id);
                                        const pickedHere = ids.filter((id) => picked.includes(id)).length;
                                        return (
                                          <div key={leaf.key} className="flex flex-col">
                                            <div className={cn("flex items-center gap-1 rounded-lg pr-2 pl-1 transition-colors", leafOpen ? "bg-muted/60" : "hover:bg-muted/40")}>
                                              <button
                                                type="button"
                                                aria-expanded={leafOpen}
                                                aria-label={t(leafOpen ? "fold" : "unfold", { group: t(`categories.${leaf.category}`) })}
                                                onClick={() => flip(leaf.key, leafIndex === 0)}
                                                className="flex size-6 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                              >
                                                <Caret open={leafOpen} />
                                              </button>
                                              <input
                                                type="checkbox"
                                                aria-label={t("pickGroup", { group: t(`categories.${leaf.category}`) })}
                                                checked={pickedHere === ids.length}
                                                ref={(box) => {
                                                  if (box) box.indeterminate = pickedHere > 0 && pickedHere < ids.length;
                                                }}
                                                onChange={() => pick(ids, pickedHere < ids.length)}
                                                className="size-4 shrink-0 cursor-pointer rounded accent-you"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => flip(leaf.key, leafIndex === 0)}
                                                className={cn("flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-1.5 text-left text-sm outline-none", !leafOpen && "text-muted-foreground")}
                                              >
                                                <span className="truncate">{t(`categories.${leaf.category}`)}</span>
                                                <Count value={leaf.rows.length} />
                                              </button>
                                            </div>
                                            {leafOpen && rowList(leaf.rows, leaf.key)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    rowList(branch.rows, branch.key)
                                  ))}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </section>
                );
              })
            )}

            {after && !split && <div className="mt-auto px-2 pt-6 pb-2">{after}</div>}
          </div>

          {(!split || picked.length > 0) && (
            <div className="sticky bottom-0 z-2 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-background px-4 py-2.5 text-sm sm:px-6">
              {picked.length > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="font-medium tabular-nums">{t("picked", { count: picked.length })}</span>
                    <button type="button" onClick={() => setPicked([])} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                      {t("clearPicks")}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {toRestore.length > 0 && (
                      <Button variant="outline" disabled={saveMany.isPending} onClick={() => changeMany(toRestore, "new")}>
                        <Undo2 aria-hidden data-icon="inline-start" />
                        {t("restore")}
                      </Button>
                    )}
                    {toReopen.length > 0 && (
                      <Button variant="outline" disabled={saveMany.isPending} onClick={() => changeMany(toReopen, "in_progress")}>
                        <RotateCcw aria-hidden data-icon="inline-start" />
                        {t("reopen")}
                      </Button>
                    )}
                    {toDecline.length > 0 && (
                      <Button variant="outline" disabled={saveMany.isPending} onClick={() => changeMany(toDecline, "declined")}>
                        <X aria-hidden data-icon="inline-start" />
                        {t("decline")}
                      </Button>
                    )}
                    {toFinish.length > 0 && (
                      <Button variant="outline" disabled={saveMany.isPending} onClick={() => changeMany(toFinish, "done")}>
                        <Check aria-hidden data-icon="inline-start" />
                        {t("markDone")}
                      </Button>
                    )}
                    {toAccept.length > 0 && (
                      <Button disabled={saveMany.isPending} onClick={() => changeMany(toAccept, "in_progress")}>
                        <Check aria-hidden data-icon="inline-start" />
                        {t("accept")}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground tabular-nums">{t("openCount", { count: openShown })}</span>
                  {newShown.length > 0 && (
                    <Button variant="secondary" disabled={saveMany.isPending} onClick={() => setDeclining(true)}>
                      <X aria-hidden data-icon="inline-start" />
                      {t("declineAll")}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* The opened action beside the list, staying in view while the list scrolls */}
        {selected && wide !== false && (
          <aside aria-label={title(selected)} className="hidden w-1/2 shrink-0 border-l @4xl:block @6xl:w-[55%]" onKeyDown={(event) => event.key === "Escape" && closePanel()}>
            <div className="sticky top-24.25 h-[calc(100svh-6rem-49px)] lg:h-[calc(100svh-4rem-2px-49px)]">{panel}</div>
          </aside>
        )}
      </div>

      {/* On a narrow screen it covers the page; out of the page's box, which would hold it in place */}
      {selected &&
        wide === false &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={title(selected)} className="fixed inset-0 z-40 flex flex-col bg-background">
            {panel}
          </div>,
          document.body,
        )}

      <AddContentDialog
        projectId={projectId}
        topics={topicOrder}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(action) => {
          setActions((list) => [...list, action]);
          setGoal(null);
          setFilters(NO_FILTERS);
          setStatuses((list) => (list.includes("new") ? list : [...list, "new"]));
          reveal(action, [...actions, action]);
          setSelectedId(action.id);
          setAnnouncement(t("added", { title: title(action) }));
        }}
      />

      <ConfirmModal
        open={declining}
        onOpenChange={setDeclining}
        title={t("declineAllTitle", { count: newShown.length })}
        description={t("declineAllText")}
        confirm={t("declineAll")}
        cancel={t("cancel")}
        danger
        onConfirm={() => {
          changeMany(
            newShown.map((action) => action.id),
            "declined",
          );
          setDeclining(false);
        }}
      />

      <ActionToast toast={toast} onOpenGroup={openGroup} onDismiss={() => setToast(null)} />

      <Tour
        steps={tourSteps}
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        // Back before the action was opened: close it again, so the goals show
        onStep={(index) => index < 3 && setSelectedId(undefined)}
        labels={{ skip: t("tour.skip"), back: t("tour.back"), next: t("tour.next"), done: t("tour.done"), close: common("close") }}
      />

      {/* Says what changed, also when a row moves to another group */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** Peec's small triangle that turns down when a group is open. */
function Caret({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden className={cn("size-2 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-90")}>
      <path d="M2 1l4 3-4 3z" fill="currentColor" />
    </svg>
  );
}

/** How many rows a group holds, in a small box beside its name. */
function Count({ value }: { value: number }) {
  return <span className="shrink-0 rounded-md border bg-background px-1.5 text-xs leading-5 font-normal text-muted-foreground tabular-nums">{value}</span>;
}

/** A menu choice with its box on the left, as in Peec's filters; the menu stays open for the next one. */
function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <DropdownMenuCheckboxItem checked={checked} onCheckedChange={onToggle} className="pr-2 **:data-[slot=dropdown-menu-checkbox-item-indicator]:hidden">
      <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-[4px] border", checked ? "border-you bg-you text-background" : "border-input bg-background")}>
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      {children}
    </DropdownMenuCheckboxItem>
  );
}
