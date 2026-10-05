"use client";

import { ChevronRight, ListChecks, MessageCircleQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { ACTION_STEP_COUNT } from "@/shared/constants";
import type { Action } from "@/shared/types/api";

/** One action in the list: expected impact, what to do, how far along it is. Opens its details. */
export function ActionRow({ action, onOpen }: { action: Action; onOpen: () => void }) {
  const t = useTranslations("Actions");
  // Steps matter while the work is open; a done or declined row needs no progress
  const showSteps = action.stepsDone.length > 0 && (action.status === "new" || action.status === "in_progress");

  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        data-action-row={action.id}
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ImpactBadge impact={action.impact} compact />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-pretty">
            <ActionTitle action={action} />
          </span>
          {/* Two wrong facts would otherwise read the same */}
          {action.kind === "fact" && <span className="truncate text-xs text-muted-foreground">“{action.claim}”</span>}
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground @xl:flex">
          {showSteps && (
            <span className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 tabular-nums">
              <ListChecks aria-hidden className="size-3.5" />
              {t("stepsCount", { done: action.stepsDone.length, total: ACTION_STEP_COUNT })}
            </span>
          )}
          {action.promptIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 tabular-nums">
              <MessageCircleQuestion aria-hidden className="size-3.5" />
              {t("questionCount", { count: action.promptIds.length })}
            </span>
          )}
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}
