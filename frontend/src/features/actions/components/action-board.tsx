"use client";

import { useMutation } from "@tanstack/react-query";
import { BookOpenIcon as BookOpen } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { UploadSimpleIcon as Upload } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { XIcon as X } from "@phosphor-icons/react/dist/ssr/X";
import { useMessages, useTimeZone, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ActionWhy } from "@/shared/components/actions/action-why";
import { ACTION_KIND_ICONS, useActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { Hint } from "@/shared/components/hint";
import { ConfirmModal } from "@/shared/components/modal";
import { Tour, type TourStep } from "@/shared/components/tour";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { api } from "@/shared/api/client";
import { ACTION_STEP_COUNT, TIME_ZONE } from "@/shared/constants";
import { downloadCsv } from "@/shared/helpers/csv";
import { formatIsoDay } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { Action, ActionKind, ActionStatus, UpdateActionRequest } from "@/shared/types/api";
import { FIRST_SHOWN, GOALS, IMPACT_ORDER, STATUS_TABS } from "../constants";
import { downloadJson } from "../helpers/export";
import { categoryOf, ownerOf, topicOf } from "../helpers/grouping";
import type { PromptProfile } from "../hooks/use-ai-prompt";
import { ActionPanel, type QuestionInfo, type SitePages } from "./action-panel";
import { ActionRow } from "./action-row";
import { ActionToast, type ToastState } from "./action-toast";
import { AddContentDialog } from "./add-content-dialog";

/** From this width of the page (Tailwind's @4xl) an opened action sits beside the list; below it, it covers the screen. */
const SPLIT_WIDTH = 896;
/** Remembers in the browser that the tour was shown, so it starts by itself only once. */
const TOUR_KEY = "geo-tour:actions";

/** Most effective first; of equal effect, in the goals' order (a wrong fact before a listing). */
const byEffect = (a: Action, b: Action) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact) || GOALS.indexOf(a.kind) - GOALS.indexOf(b.kind);
/** Done ones, the latest first. */
const byDone = (a: Action, b: Action) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "");

/** The tab an action's status falls in: the first tab with actions, when nothing is asked for. */
function tabFor(actions: Action[], opened: Action | undefined): ActionStatus {
  if (opened) return opened.status;
  return STATUS_TABS.find((status) => status !== "declined" && actions.some((action) => action.status === status)) ?? "new";
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

/**
 * The project's actions, made simple (the user, 17 Nov 2026: "logic is good, but UI is not very
 * understandable"; until then Peec's layout: three menus, four goal tiles and a tree of status, goal and kind
 * of work with boxes to pick rows). Now: the actions by status as tabs (to do, in progress, done, declined);
 * on "to do" the three most effective as cards with the evidence behind each and a Start button, then the
 * rest as a flat list, narrowed by goal; every row carries the one step its status calls for (start, done,
 * reopen, restore) and opens beside the list (over the screen on a phone), where it is worked through. A
 * toast says where an action went. Changes show at once and are saved in the background; if saving fails,
 * they go back.
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
  profile,
  nextRunAt,
  filename,
  after,
}: {
  projectId: string;
  initial: Action[];
  /** Opens this action at once (?action= in the URL, from the Overview, Manbalar or Hisobotlar). */
  initialOpenId?: string;
  /** The questions the actions should move, by id. */
  questions: Record<string, QuestionInfo>;
  /** The cited sites the actions are about (listings, the client's own), by domain. */
  sites: Record<string, SitePages>;
  /** The project's topics, in their order. */
  topics: string[];
  competitors: { id: string; name: string }[];
  brand: { name: string; domain: string };
  /** What the business is, for the AI prompts. */
  profile: PromptProfile;
  nextRunAt: string | null;
  filename: string;
  /** Shown under the list (the Managed GEO offer). */
  after?: React.ReactNode;
}) {
  const t = useTranslations("Actions");
  const messages = useMessages();
  const title = useActionTitle();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const root = useRef<HTMLDivElement>(null);
  const opened = initial.find((action) => action.id === initialOpenId);
  const [actions, setActions] = useState(initial);
  const [tab, setTab] = useState<ActionStatus>(() => tabFor(initial, opened));
  const [goal, setGoal] = useState<ActionKind | null>(null);
  const [selectedId, setSelectedId] = useState(opened?.id);
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

  const selected = actions.find((action) => action.id === selectedId) ?? null;
  const split = selected !== null && wide !== false;
  const inTab = actions.filter((action) => action.status === tab).sort(tab === "done" ? byDone : byEffect);
  const goalsHere = GOALS.filter((kind) => inTab.some((action) => action.kind === kind));
  const listed = goal ? inTab.filter((action) => action.kind === goal) : inTab;
  // The three most effective new ones as cards; with a goal picked, the list holds them all
  const first = tab === "new" && !goal ? listed.slice(0, FIRST_SHOWN) : [];
  const rest = listed.slice(first.length);
  const done = actions.filter((action) => action.status === "done").length;
  const kept = actions.filter((action) => action.status !== "declined").length;
  const newListed = listed.filter((action) => action.status === "new");

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

  function announce(status: ActionStatus, count: number, action?: Action) {
    setToast((current) => ({ key: (current?.key ?? 0) + 1, status, count }));
    setAnnouncement(action ? t("changed", { title: title(action), status: t(`status.${status}`) }) : t("changedMany", { count, status: t(`status.${status}`) }));
  }

  /** One action moved on: from its row's button, its panel or its first ticked step. */
  function changeStatus(action: Action, status: ActionStatus, stepsDone?: number[]) {
    save.mutate({ id: action.id, change: stepsDone ? { status, stepsDone } : { status } });
    announce(status, 1, action);
  }

  function changeMany(ids: string[], status: ActionStatus) {
    if (ids.length === 0) return;
    saveMany.mutate({ ids, status });
    announce(status, ids.length);
  }

  function toggleStep(action: Action, step: number) {
    const stepsDone = action.stepsDone.includes(step) ? action.stepsDone.filter((ticked) => ticked !== step) : [...action.stepsDone, step].sort((a, b) => a - b);
    // Ticking a step of a new action takes it on
    if (action.status === "new" && stepsDone.length > action.stepsDone.length) changeStatus(action, "in_progress", stepsDone);
    else save.mutate({ id: action.id, change: { stepsDone } });
  }

  function showTab(status: ActionStatus) {
    setTab(status);
    setGoal(null);
  }

  /** The toast's link: the tab the action went to. */
  function openGroup(status: ActionStatus) {
    showTab(status);
    requestAnimationFrame(() => root.current?.closest("main")?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function closePanel() {
    const id = selectedId;
    setSelectedId(undefined);
    // Back to the action's row or card
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-action-row="${CSS.escape(id)}"] [data-open]`)?.focus());
  }

  // The guided tour opens an action with a brief when there is one, to show the brief
  const tourAction =
    actions.find((action) => action.kind === "content" && action.brief && action.status === "new") ??
    actions.find((action) => action.kind === "content" && action.brief) ??
    actions.find((action) => action.status === "new") ??
    actions[0];
  const tourSteps: TourStep[] = [
    { target: '[data-tour="first"]', title: t("tour.first.title"), text: t("tour.first.text") },
    { target: '[data-tour="tabs"]', title: t("tour.tabs.title"), text: t("tour.tabs.text") },
    {
      target: '[data-tour="row"]',
      title: t("tour.row.title"),
      text: t("tour.row.text"),
      action: { label: t("tour.row.action"), run: () => tourAction && setSelectedId(tourAction.id) },
    },
    { target: '[data-tour="why"]', title: t("tour.why.title"), text: t("tour.why.text") },
    { target: '[data-tour="prompt"]', title: t("tour.prompt.title"), text: t("tour.prompt.text") },
    ...(tourAction?.kind === "content" && tourAction.brief
      ? [
          { target: '[data-tour="brief"]', title: t("tour.brief.title"), text: t("tour.brief.text") },
          { target: '[data-tour="assistant"]', title: t("tour.assistant.title"), text: t("tour.assistant.text") },
        ]
      : []),
    { target: '[data-tour="decide"]', title: t("tour.decide.title"), text: t("tour.decide.text"), side: "top" },
  ];
  // The steps up to the one that opens an action show the list: going back to them closes the action
  const opensAt = tourSteps.findIndex((step) => step.action);

  function startTour() {
    if (!tourAction) return;
    setSelectedId(undefined);
    showTab(tourAction.status);
    setTourOpen(true);
  }

  // The tour starts by itself on the first visit, once per browser
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
    actions.map((action) => ({
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

  const rowProps = (action: Action) => ({
    action,
    open: action.id === selectedId,
    tour: tourOpen && action.id === tourAction?.id,
    busy: save.isPending && save.variables?.id === action.id,
    onOpen: () => setSelectedId(action.id),
    onStatus: (status: ActionStatus) => changeStatus(action, status),
  });

  const panel = selected && (
    <ActionPanel
      action={selected}
      questions={questions}
      sites={sites}
      competitors={namesById}
      brand={brand}
      profile={profile}
      nextRunAt={nextRunAt}
      questionHref={(promptId) => `/projects/${projectId}/prompts/${encodeURIComponent(promptId)}`}
      busy={save.isPending && save.variables?.id === selected.id && save.variables.change.status !== undefined}
      autoFocus={wide === false}
      onClose={closePanel}
      onStatus={(status) => changeStatus(selected, status)}
      onStep={(step) => toggleStep(selected, step)}
    />
  );

  return (
    <div ref={root} className="@container flex flex-1 flex-col">
      {/* The statuses as tabs on the left, the page's tools on the right */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2 sm:px-6 @4xl:sticky @4xl:top-12 @4xl:z-5 @4xl:h-12.25 @4xl:flex-nowrap">
        <div role="tablist" aria-label={t("tabsLabel")} data-tour="tabs" className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1">
          {STATUS_TABS.map((status) => {
            const count = actions.filter((action) => action.status === status).length;
            const on = tab === status;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => showTab(status)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(`tabs.${status}`)}
                <span className={cn("tabular-nums", on ? "text-background/70" : "text-muted-foreground")}>{count}</span>
              </button>
            );
          })}
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
          <Button variant="outline" aria-label={t("addContent")} onClick={() => setAddOpen(true)} className="bg-background @max-md:size-8 @max-md:px-0">
            <Plus aria-hidden data-icon="inline-start" />
            <span className="hidden @md:inline">{t("addContent")}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1">
        <div className="@container flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-6 px-4 py-5 sm:px-6">
            {!split && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold tracking-tight text-pretty">{t("heading")}</h2>
                  <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{t("subtitle")}</p>
                </div>
                {/* How far the plan has come: what's done of all not declined */}
                {kept > 0 && (
                  <div className="flex max-w-md items-center gap-3">
                    <span aria-hidden className="block h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-positive transition-[width] duration-500" style={{ width: `${(done / kept) * 100}%` }} />
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{t("progress", { done, total: kept })}</span>
                  </div>
                )}
              </div>
            )}

            {(save.isError || saveMany.isError) && (
              <p role="alert" className="text-sm text-destructive">
                {t("saveFailed")}
              </p>
            )}

            {first.length > 0 && (
              <section data-tour="first" aria-labelledby="actions-first" className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <h3 id="actions-first" className="text-base font-semibold">
                    {t("first.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t("first.text")}</p>
                </div>
                <ol className={cn("grid gap-3", !split && "@3xl:grid-cols-3")}>
                  {first.map((action) => (
                    <ActionCard key={action.id} {...rowProps(action)} competitors={namesById} />
                  ))}
                </ol>
              </section>
            )}

            <section aria-labelledby="actions-list" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h3 id="actions-list" className="text-base font-semibold">
                  {first.length > 0 ? t("rest") : t(`tabs.${tab}`)}
                  <span className="ml-2 font-normal text-muted-foreground tabular-nums">{first.length > 0 ? rest.length : listed.length}</span>
                </h3>
                {/* The goals as a filter, when the tab holds more than one */}
                {goalsHere.length > 1 && (
                  <div role="group" aria-label={t("goalFilter")} className="flex flex-wrap items-center gap-1">
                    {([null, ...goalsHere] as (ActionKind | null)[]).map((kind) => {
                      const Icon = kind ? ACTION_KIND_ICONS[kind] : null;
                      const on = goal === kind;
                      return (
                        <button
                          key={kind ?? "all"}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setGoal(kind)}
                          className={cn(
                            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
                            on ? "border-foreground/30 bg-muted font-medium text-foreground" : "bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          )}
                        >
                          {Icon && <Icon aria-hidden className="size-3.5" />}
                          {kind ? t(`goals.${kind}`) : t("allGoals")}
                          <span className="tabular-nums">{kind ? inTab.filter((action) => action.kind === kind).length : inTab.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {tab === "new" && newListed.length > 1 && (
                  <div className="flex items-center gap-2 @lg:ml-auto">
                    <Button variant="ghost" size="sm" disabled={saveMany.isPending} onClick={() => setDeclining(true)} className="text-muted-foreground">
                      <X aria-hidden data-icon="inline-start" />
                      {t("declineAll")}
                    </Button>
                    <Button variant="outline" size="sm" disabled={saveMany.isPending} onClick={() => changeMany(newListed.map((action) => action.id), "in_progress")} className="bg-background">
                      <Check aria-hidden data-icon="inline-start" />
                      {t("acceptAll")}
                    </Button>
                  </div>
                )}
              </div>

              {listed.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-pretty text-muted-foreground">{t(`emptyTab.${tab}`)}</p>
              ) : (
                rest.length > 0 && (
                  <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
                    {rest.map((action) => (
                      <ActionRow key={action.id} {...rowProps(action)} />
                    ))}
                  </ul>
                )
              )}
            </section>

            {after && !split && <div className="mt-auto pt-2">{after}</div>}
          </div>
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
          showTab(action.status);
          setSelectedId(action.id);
          setAnnouncement(t("added", { title: title(action) }));
        }}
      />

      <ConfirmModal
        open={declining}
        onOpenChange={setDeclining}
        title={t("declineAllTitle", { count: newListed.length })}
        description={t("declineAllText")}
        confirm={t("declineAll")}
        cancel={t("cancel")}
        danger
        onConfirm={() => {
          changeMany(
            newListed.map((action) => action.id),
            "declined",
          );
          setDeclining(false);
        }}
      />

      <ActionToast toast={toast} onOpenGroup={openGroup} onDismiss={() => setToast(null)} />

      <Tour steps={tourSteps} open={tourOpen} onClose={() => setTourOpen(false)} onStep={(index) => index <= opensAt && setSelectedId(undefined)} />

      {/* Says what changed, also when an action moves to another tab */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/**
 * One of the three to do first, as a card: what kind of work it is and its effect, what to do, the evidence
 * from AI's answers, and Start beside the way into it.
 */
function ActionCard({
  action,
  open,
  tour,
  busy,
  competitors,
  onOpen,
  onStatus,
}: {
  action: Action;
  open: boolean;
  tour?: boolean;
  busy: boolean;
  competitors: Map<string, string>;
  onOpen: () => void;
  onStatus: (status: ActionStatus) => void;
}) {
  const t = useTranslations("Actions");
  const title = useActionTitle();
  const Icon = ACTION_KIND_ICONS[action.kind];
  return (
    <li
      data-action-row={action.id}
      data-tour={tour ? "row" : undefined}
      className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 transition-colors", open ? "border-foreground/30 bg-muted/40" : "hover:border-foreground/20")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{t(`goals.${action.kind}`)}</span>
        </span>
        <ImpactBadge impact={action.impact} />
      </div>
      <button type="button" data-open aria-haspopup="dialog" onClick={onOpen} className="text-left text-[0.9375rem] leading-snug font-semibold text-pretty underline-offset-4 outline-none hover:underline focus-visible:underline">
        {title(action)}
      </button>
      <ActionWhy action={action} competitors={competitors} />
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button size="sm" disabled={busy} onClick={() => onStatus("in_progress")}>
          {t("start")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpen}>
          {t("details")}
        </Button>
      </div>
    </li>
  );
}
