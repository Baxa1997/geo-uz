"use client";

import { Ban, CircleCheck, Play, RotateCcw, Undo2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ACTION_KIND_ICONS, ActionTitle, listingKind } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { StatusBadge } from "@/shared/components/actions/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { ACTION_STEP_COUNT } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { Action, ActionStatus, Prompt } from "@/shared/types/api";
import { STEPS } from "../constants";
import { ActionProof } from "./action-proof";
import { ActionWhy } from "./action-why";

interface DetailsProps {
  action: Action;
  prompts: Map<string, Prompt>;
  competitors: Map<string, string>;
  nextRunAt: string | null;
  answersHref: (promptId: string) => string;
  busy: boolean;
  onStatus: (status: ActionStatus) => void;
  onStep: (step: number) => void;
}

/**
 * One action opened at the side: why it matters, the steps to check off one by one, the questions it
 * should move, and its status. A done one shows what changed since (fix → proof).
 */
export function ActionDrawer({
  action,
  onClose,
  ...props
}: Omit<DetailsProps, "action"> & { action: Action | null; onClose: () => void }) {
  const t = useTranslations("Actions");
  // Keeps the last action on screen while the panel slides away
  const [last, setLast] = useState(action);
  if (action && action !== last) setLast(action);
  const shown = action ?? last;

  return (
    <Sheet open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        // Back to the action's row, or to its group when that group is folded
        finalFocus={() =>
          (shown &&
            (document.querySelector<HTMLElement>(`[data-action-row="${CSS.escape(shown.id)}"]`) ??
              document.querySelector<HTMLElement>(`[data-status-toggle="${shown.status}"]`))) ??
          true
        }
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        {shown && <Details action={shown} {...props} />}
        <SheetClose render={<Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" />}>
          <X aria-hidden />
          <span className="sr-only">{t("close")}</span>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}

function Details({ action, prompts, competitors, nextRunAt, answersHref, busy, onStatus, onStep }: DetailsProps) {
  const t = useTranslations("Actions");
  const KindIcon = ACTION_KIND_ICONS[action.kind];
  const steps = action.kind === "listing" ? listingKind(action.sourceType) : action.kind === "technical" ? action.check : action.kind;
  const questions = action.promptIds.flatMap((id) => prompts.get(id) ?? []);
  // Steps are checked off while the work is open; a done or declined action keeps them as they were
  const editable = action.status === "new" || action.status === "in_progress";
  const allDone = action.stepsDone.length === ACTION_STEP_COUNT;

  return (
    <>
      <SheetHeader className="gap-2 border-b pr-12">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ImpactBadge impact={action.impact} />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <KindIcon aria-hidden className="size-3.5" />
            {t(`goals.${action.kind}`)}
          </span>
          <StatusBadge status={action.status} />
        </div>
        <SheetTitle className="text-lg font-semibold text-pretty">
          <ActionTitle action={action} />
        </SheetTitle>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">{t("whyTitle")}</h3>
          <ActionWhy action={action} competitors={competitors} />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-xs font-medium text-muted-foreground">{t("how")}</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("stepsProgress", { done: action.stepsDone.length, total: ACTION_STEP_COUNT })}
            </span>
          </div>
          <ol className="flex flex-col gap-0.5">
            {STEPS.map((step, index) => {
              const checked = action.stepsDone.includes(index);
              return (
                <li key={step}>
                  <label
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-2 text-sm text-pretty transition-colors",
                      editable && "cursor-pointer hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!editable}
                      onChange={() => onStep(index)}
                      className="mt-0.5 size-4 shrink-0 accent-foreground disabled:opacity-60"
                    />
                    <span className={cn(checked && "text-muted-foreground line-through decoration-foreground/30")}>
                      {t(`steps.${steps}.${step}`, { domain: action.kind === "listing" ? action.domain : "" })}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
          {allDone && action.status === "in_progress" && (
            <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-pretty">
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
              {t("allStepsDone")}
            </p>
          )}
        </section>

        {questions.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              {t("questions")} · {questions.length}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {questions.map((prompt) => (
                <li key={prompt.id} className="min-w-0">
                  <Link href={answersHref(prompt.id)} className="block text-sm text-pretty underline-offset-4 hover:underline">
                    <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">
                      {prompt.language}
                    </span>
                    {prompt.text}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {action.status === "done" && <ActionProof action={action} nextRunAt={nextRunAt} />}
      </div>

      <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
        {action.status === "new" && (
          <>
            <Button variant="ghost" disabled={busy} onClick={() => onStatus("declined")}>
              <Ban aria-hidden data-icon="inline-start" />
              {t("decline")}
            </Button>
            <Button disabled={busy} onClick={() => onStatus("in_progress")}>
              <Play aria-hidden data-icon="inline-start" />
              {t("start")}
            </Button>
          </>
        )}
        {action.status === "in_progress" && (
          <>
            <Button variant="ghost" disabled={busy} onClick={() => onStatus("declined")}>
              <Ban aria-hidden data-icon="inline-start" />
              {t("decline")}
            </Button>
            <Button disabled={busy} onClick={() => onStatus("done")}>
              <CircleCheck aria-hidden data-icon="inline-start" />
              {t("markDone")}
            </Button>
          </>
        )}
        {action.status === "done" && (
          <Button variant="outline" disabled={busy} onClick={() => onStatus("in_progress")}>
            <RotateCcw aria-hidden data-icon="inline-start" />
            {t("reopen")}
          </Button>
        )}
        {action.status === "declined" && (
          <Button variant="outline" disabled={busy} onClick={() => onStatus("new")}>
            <Undo2 aria-hidden data-icon="inline-start" />
            {t("restore")}
          </Button>
        )}
      </SheetFooter>
    </>
  );
}
