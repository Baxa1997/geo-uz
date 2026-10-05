"use client";

import { CircleDashed } from "lucide-react";
import { useTranslations } from "next-intl";
import { ACTION_KIND_ICONS } from "@/shared/components/actions/action-title";
import { cn } from "@/shared/helpers/utils";
import type { ActionKind } from "@/shared/types/api";
import { GOALS } from "../constants";

/**
 * The four goals with what's still to do in each. A tile narrows the list to its goal; pressing it
 * again shows everything.
 */
export function GoalTiles({
  open,
  value,
  onChange,
}: {
  /** Actions still to do, per goal. */
  open: Record<ActionKind, number>;
  value: ActionKind | null;
  onChange: (goal: ActionKind | null) => void;
}) {
  const t = useTranslations("Actions");

  return (
    <div role="group" aria-label={t("goalsLabel")} className="grid grid-cols-2 border-t @3xl:grid-cols-4">
      {GOALS.map((goal, index) => {
        const Icon = ACTION_KIND_ICONS[goal];
        const pressed = value === goal;
        return (
          <button
            key={goal}
            type="button"
            aria-pressed={pressed}
            title={t("goalHint")}
            onClick={() => onChange(pressed ? null : goal)}
            className={cn(
              "flex min-w-0 flex-col items-start gap-1.5 p-3 text-left @md:p-4 transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
              // Dividers: a 2×2 grid on phones, one row from @3xl
              index % 2 === 1 && "border-l",
              index >= 2 && "border-t @3xl:border-t-0",
              index === 2 && "@3xl:border-l",
              pressed && "bg-muted/70 shadow-[inset_0_-2px_0_var(--foreground)]",
            )}
          >
            <span className="flex min-w-0 items-start gap-1.5 text-sm text-pretty text-muted-foreground">
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t(`goals.${goal}`)}
            </span>
            <span className="flex items-center gap-1.5 font-medium tabular-nums">
              <CircleDashed aria-hidden className="hidden size-4 shrink-0 text-muted-foreground @xs:block" />
              {t(`goalCounts.${goal}`, { count: open[goal] })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
