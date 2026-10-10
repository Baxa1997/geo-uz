"use client";

import { FileText, Globe, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionTitle, useActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { Hint } from "@/shared/components/hint";
import { ACTION_STEP_COUNT } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { Action } from "@/shared/types/api";
import { ownerOf } from "../helpers/grouping";

/**
 * One action in the list, as Peec's row: a box to pick it (on hover, on a picked row, always on a touch
 * screen), the expected impact as bars, what to do, and where the work is done at the end (your site, the
 * site to get onto, or everywhere for a wrong fact), with the steps checked while it is in progress. A
 * click anywhere on it opens it beside the list.
 */
export function ActionRow({
  action,
  open,
  picked,
  picking,
  tour,
  onOpen,
  onPick,
}: {
  action: Action;
  /** Open beside the list. */
  open: boolean;
  picked: boolean;
  /** Some rows are picked: every box shows. */
  picking: boolean;
  /** The first row: the guided tour points at it. */
  tour?: boolean;
  onOpen: () => void;
  onPick: () => void;
}) {
  const t = useTranslations("Actions");
  const title = useActionTitle();
  const owner = ownerOf(action);

  return (
    <li>
      <div
        data-action-row={action.id}
        data-tour={tour ? "row" : undefined}
        onClick={(event) => {
          // The box, the button and the hints keep their own click
          if (event.target instanceof Element && event.target.closest("input, button, [data-hint]")) return;
          onOpen();
        }}
        className={cn(
          "group/row flex cursor-pointer items-center gap-2.5 rounded-lg py-2 pr-2 pl-1 transition-colors",
          open ? "bg-muted" : picked ? "bg-you-soft/40" : "hover:bg-muted/50",
        )}
      >
        <span className="flex w-6 shrink-0 justify-center">
          <input
            type="checkbox"
            aria-label={t("pickOne", { title: title(action) })}
            checked={picked}
            onChange={onPick}
            className={cn(
              "size-4 cursor-pointer rounded accent-you transition-opacity [@media(hover:none)]:opacity-100",
              picked || picking ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
            )}
          />
        </span>
        {/* The bars explain themselves on hover and on a tap, which doesn't open the row */}
        <span data-tour={tour ? "impact" : undefined} className="flex shrink-0">
          <Hint text={t("impactHint", { impact: t(`impact.${action.impact}`) })} focusable={false} className="flex">
            <ImpactBadge impact={action.impact} compact />
          </Hint>
        </span>
        <button type="button" aria-haspopup="dialog" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:underline">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm text-pretty">
              <ActionTitle action={action} />
            </span>
            {/* Two wrong facts would otherwise read the same */}
            {action.kind === "fact" && <span className="truncate text-xs text-muted-foreground">“{action.claim}”</span>}
          </span>
        </button>
        {/* Where the work is done; a narrow list (an action open beside it) keeps the icon, as on Peec */}
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {action.status === "in_progress" && action.stepsDone.length > 0 && (
            <Hint text={t("stepsHint")} focusable={false} className="hidden items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 tabular-nums @xl:inline-flex">
              <ListChecks aria-hidden className="size-3.5" />
              {action.stepsDone.length}/{ACTION_STEP_COUNT}
            </Hint>
          )}
          <Hint text={t(`ownerHints.${owner}`)} focusable={false} className="max-w-48 items-center gap-1.5 rounded-lg border bg-background p-1 @xl:px-2">
            {owner === "own" ? <FileText aria-hidden className="size-3.5 shrink-0" /> : <Globe aria-hidden className="size-3.5 shrink-0" />}
            <span className="hidden truncate @xl:inline">{action.kind === "listing" ? action.domain : t(`ownerBadges.${owner}`)}</span>
          </Hint>
        </span>
      </div>
    </li>
  );
}
