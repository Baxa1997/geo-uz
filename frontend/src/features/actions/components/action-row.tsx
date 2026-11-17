"use client";

import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { FileTextIcon as FileText } from "@phosphor-icons/react/dist/ssr/FileText";
import { GlobeIcon as Globe } from "@phosphor-icons/react/dist/ssr/Globe";
import { ListChecksIcon as ListChecks } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { ACTION_KIND_ICONS, useActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { Hint } from "@/shared/components/hint";
import { Button } from "@/shared/components/ui/button";
import { ACTION_STEP_COUNT, TIME_ZONE } from "@/shared/constants";
import { formatShortDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { Action, ActionStatus } from "@/shared/types/api";
import { ownerOf } from "../helpers/grouping";

/** The one step a row offers, by its status: take it on, finish it, open it again, bring it back. */
const NEXT: Record<ActionStatus, { status: ActionStatus; label: "start" | "markDone" | "reopen" | "restore" }> = {
  new: { status: "in_progress", label: "start" },
  in_progress: { status: "done", label: "markDone" },
  done: { status: "in_progress", label: "reopen" },
  declined: { status: "new", label: "restore" },
};

/**
 * One action in the list: the kind of work as an icon, what to do (a wrong fact with what AI said), where the
 * work is done, the expected effect, and the one step its status calls for; in progress, the steps ticked;
 * done, when, and what it changed once the next check has measured it. A click anywhere else opens it.
 */
export function ActionRow({
  action,
  open,
  tour,
  busy,
  onOpen,
  onStatus,
}: {
  action: Action;
  /** Open beside the list. */
  open: boolean;
  /** The guided tour points at it. */
  tour?: boolean;
  busy: boolean;
  onOpen: () => void;
  onStatus: (status: ActionStatus) => void;
}) {
  const t = useTranslations("Actions");
  const title = useActionTitle();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const owner = ownerOf(action);
  const Icon = ACTION_KIND_ICONS[action.kind];
  const next = NEXT[action.status];

  return (
    <li
      data-action-row={action.id}
      data-tour={tour ? "row" : undefined}
      onClick={(event) => {
        // Its buttons and hints keep their own click
        if (event.target instanceof Element && event.target.closest("button, a, [data-hint]")) return;
        onOpen();
      }}
      className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors sm:px-4", open ? "bg-muted" : "hover:bg-muted/40")}
    >
      <Hint text={t(`goals.${action.kind}`)} focusable={false} className="flex shrink-0">
        <Icon aria-hidden className="size-4 text-muted-foreground" />
      </Hint>
      <button type="button" data-open aria-haspopup="dialog" onClick={onOpen} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left outline-none focus-visible:underline">
        <span className="text-sm text-pretty">{title(action)}</span>
        {/* Two wrong facts would otherwise read the same */}
        {action.kind === "fact" && <span className="truncate text-xs text-muted-foreground">“{action.claim}”</span>}
      </button>

      {/* Where the work is done, on a wide list */}
      <Hint text={t(`ownerHints.${owner}`)} focusable={false} className="hidden max-w-44 shrink-0 items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground @2xl:inline-flex">
        {owner === "own" ? <FileText aria-hidden className="size-3.5 shrink-0" /> : <Globe aria-hidden className="size-3.5 shrink-0" />}
        <span className="truncate">{action.kind === "listing" ? action.domain : t(`ownerBadges.${owner}`)}</span>
      </Hint>

      {action.status === "in_progress" && (
        <Hint text={t("stepsHint")} focusable={false} className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums @md:inline-flex">
          <ListChecks aria-hidden className="size-3.5" />
          {action.stepsDone.length}/{ACTION_STEP_COUNT}
        </Hint>
      )}
      {action.status === "done" && (
        <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums @md:inline-flex">
          {action.proof ? (
            <span className={cn("inline-flex items-center gap-1 font-medium", action.proof.after >= action.proof.before ? "text-better" : "text-worse")}>
              {Math.round(action.proof.before * 100)}%
              <ArrowRight aria-hidden className="size-3" />
              {Math.round(action.proof.after * 100)}%
            </span>
          ) : (
            action.doneAt && formatShortDate(action.doneAt, locale, timeZone)
          )}
        </span>
      )}

      <Hint text={t("impactHint", { impact: t(`impact.${action.impact}`) })} focusable={false} className="flex shrink-0">
        <ImpactBadge impact={action.impact} compact />
      </Hint>

      <Button
        size="sm"
        variant={action.status === "new" ? "outline" : "ghost"}
        disabled={busy}
        onClick={() => onStatus(next.status)}
        className={cn("shrink-0", action.status === "new" && "bg-background", action.status !== "new" && "text-muted-foreground")}
      >
        {t(next.label)}
      </Button>
    </li>
  );
}
