"use client";

import { useMutation } from "@tanstack/react-query";
import { Ban, ChevronRight, CircleCheck, CircleDot, Play, type LucideIcon } from "lucide-react";
import { useTimeZone, useTranslations } from "next-intl";
import { useState } from "react";
import { ACTION_KIND_ICONS, useActionTitle } from "@/shared/components/actions/action-title";
import { CsvButton } from "@/shared/components/csv-button";
import { api } from "@/shared/api/client";
import { ACTION_STEP_COUNT, TIME_ZONE } from "@/shared/constants";
import { formatIsoDay } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { Action, ActionKind, ActionStatus, Prompt, UpdateActionRequest } from "@/shared/types/api";
import { GOALS, OPEN_GROUPS, OPEN_STATUSES, SHOWN_ROWS, STATUS_GROUPS } from "../constants";
import { ActionDrawer } from "./action-drawer";
import { ActionRow } from "./action-row";
import { GoalTiles } from "./goal-tiles";

const STATUS_ICONS: Record<ActionStatus, LucideIcon> = {
  in_progress: Play,
  new: CircleDot,
  done: CircleCheck,
  declined: Ban,
};

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
 * The project's actions: four goal tiles that narrow the list, then the list by status and goal. A row
 * opens the action at the side. Changes show at once and are saved in the background; if saving fails,
 * the action goes back to how it was.
 */
export function ActionBoard({
  projectId,
  initial,
  initialOpenId,
  prompts,
  competitors,
  nextRunAt,
  filename,
}: {
  projectId: string;
  initial: Action[];
  /** Opens this action at once (?action= in the URL, from the Overview). */
  initialOpenId?: string;
  prompts: Prompt[];
  competitors: { id: string; name: string }[];
  nextRunAt: string | null;
  filename: string;
}) {
  const t = useTranslations("Actions");
  const title = useActionTitle();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const [actions, setActions] = useState(initial);
  const [goal, setGoal] = useState<ActionKind | null>(null);
  const [openGroups, setOpenGroups] = useState<ActionStatus[]>(OPEN_GROUPS);
  // Goal groups showing all their rows, as "status:goal"
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState(initial.some((action) => action.id === initialOpenId) ? initialOpenId : undefined);
  const [announcement, setAnnouncement] = useState("");
  const promptsById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const namesById = new Map(competitors.map((competitor) => [competitor.id, competitor.name]));
  const selected = actions.find((action) => action.id === selectedId) ?? null;

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
    onSuccess: (saved, { change }) => {
      setActions((list) => list.map((action) => (action.id === saved.id ? saved : action)));
      setAnnouncement(
        change.status
          ? t("changed", { title: title(saved), status: t(`status.${saved.status}`) })
          : t("stepSaved", { title: title(saved), done: saved.stepsDone.length, total: ACTION_STEP_COUNT }),
      );
    },
  });

  function toggleStep(action: Action, step: number) {
    const stepsDone = action.stepsDone.includes(step)
      ? action.stepsDone.filter((done) => done !== step)
      : [...action.stepsDone, step].sort((a, b) => a - b);
    // Checking off a step of a new action starts it
    const starts = action.status === "new" && stepsDone.length > action.stepsDone.length;
    save.mutate({ id: action.id, change: starts ? { status: "in_progress", stepsDone } : { stepsDone } });
  }

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const open = Object.fromEntries(
    GOALS.map((kind) => [kind, actions.filter((action) => action.kind === kind && OPEN_STATUSES.includes(action.status)).length]),
  ) as Record<ActionKind, number>;
  const done = actions.filter((action) => action.status === "done").length;
  const counted = actions.filter((action) => action.status !== "declined").length;
  const visible = goal ? actions.filter((action) => action.kind === goal) : actions;
  const nothingOpen = !visible.some((action) => OPEN_STATUSES.includes(action.status));

  const csvRows = () => [
    [t("csvHeaders.action"), t("csvHeaders.goal"), t("csvHeaders.impact"), t("csvHeaders.status"), t("csvHeaders.steps"), t("csvHeaders.questions"), t("csvHeaders.doneAt")],
    ...actions.map((action) => [
      title(action),
      t(`goals.${action.kind}`),
      t(`impact.${action.impact}`),
      t(`status.${action.status}`),
      `${action.stepsDone.length}/${ACTION_STEP_COUNT}`,
      action.promptIds.length,
      action.doneAt ? formatIsoDay(action.doneAt, timeZone) : "",
    ]),
  ];

  return (
    <div className="@container flex flex-col gap-4">
      <section aria-labelledby="actions-plan" className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-4">
          <div className="flex max-w-2xl min-w-0 flex-col gap-1">
            <h2 id="actions-plan" className="text-base font-semibold text-pretty">
              {t("planTitle")}
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">{t("intro")}</p>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                role="progressbar"
                aria-label={t("progressLabel")}
                aria-valuemin={0}
                aria-valuemax={counted}
                aria-valuenow={done}
                aria-valuetext={t("progress", { done, total: counted })}
                className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:w-24"
              >
                <div
                  className="h-full rounded-full bg-positive transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${counted ? (done / counted) * 100 : 0}%` }}
                />
              </div>
              <span className="min-w-0 text-sm text-pretty text-muted-foreground tabular-nums sm:whitespace-nowrap">
                {t("progress", { done, total: counted })}
              </span>
            </div>
            <CsvButton filename={filename} rows={csvRows} label={t("csv")} hint={t("csvHint")} className="shrink-0" />
          </div>
        </div>
        <GoalTiles open={open} value={goal} onChange={setGoal} />
      </section>

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("saveFailed")}
        </p>
      )}

      {nothingOpen && (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {goal ? t("emptyGoal") : t("emptyTodo")}
        </p>
      )}

      <div className="flex flex-col gap-1">
        {STATUS_GROUPS.map((status) => {
          const items = visible.filter((action) => action.status === status);
          if (items.length === 0) return null;
          const isOpen = openGroups.includes(status);
          const StatusIcon = STATUS_ICONS[status];
          const panelId = `actions-${status}`;
          // Inside a status: one group per goal, unless a tile already picked the goal
          const goals = (goal ? [goal] : GOALS).filter((kind) => items.some((action) => action.kind === kind));
          return (
            <section key={status} aria-labelledby={`${panelId}-title`}>
              <h3 id={`${panelId}-title`}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  data-status-toggle={status}
                  onClick={() => setOpenGroups((list) => toggle(list, status))}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ChevronRight
                    aria-hidden
                    className={cn("size-4 text-muted-foreground transition-transform motion-reduce:transition-none", isOpen && "rotate-90")}
                  />
                  <StatusIcon aria-hidden className={cn("size-4", status === "done" ? "text-positive" : "text-muted-foreground")} />
                  {t(`status.${status}`)}
                  <span className="font-normal text-muted-foreground tabular-nums">{items.length}</span>
                </button>
              </h3>
              {isOpen && (
                <div id={panelId} className="flex flex-col gap-2 pb-2 pl-4">
                  {goals.map((kind) => {
                    const rows = items.filter((action) => action.kind === kind);
                    const key = `${status}:${kind}`;
                    const all = expanded.includes(key);
                    const GoalIcon = ACTION_KIND_ICONS[kind];
                    return (
                      <div key={kind} className="flex flex-col border-l pl-3">
                        {!goal && (
                          <p className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                            <GoalIcon aria-hidden className="size-4" />
                            {t(`goals.${kind}`)}
                            <span className="rounded-md bg-muted px-1.5 text-xs tabular-nums">{rows.length}</span>
                          </p>
                        )}
                        <ul className="flex flex-col">
                          {(all ? rows : rows.slice(0, SHOWN_ROWS)).map((action) => (
                            <ActionRow key={action.id} action={action} onOpen={() => setSelectedId(action.id)} />
                          ))}
                        </ul>
                        {rows.length > SHOWN_ROWS && (
                          <button
                            type="button"
                            onClick={() => setExpanded((list) => toggle(list, key))}
                            className="mt-1 w-fit rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                          >
                            {all ? t("showLess") : t("showAll", { count: rows.length })}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <ActionDrawer
        action={selected}
        prompts={promptsById}
        competitors={namesById}
        nextRunAt={nextRunAt}
        answersHref={(promptId) => `/projects/${projectId}/answers?prompt=${encodeURIComponent(promptId)}`}
        busy={save.isPending && save.variables?.id === selected?.id && save.variables.change.status !== undefined}
        onClose={() => setSelectedId(undefined)}
        onStatus={(status) => selected && save.mutate({ id: selected.id, change: { status } })}
        onStep={(step) => selected && toggleStep(selected, step)}
      />

      {/* Says what changed, also when a row moves to another group */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
