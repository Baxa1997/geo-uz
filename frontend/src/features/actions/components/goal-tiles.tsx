"use client";

import { useTranslations } from "next-intl";
import { ACTION_KIND_ICONS } from "@/shared/components/actions/action-title";
import { InfoTip } from "@/shared/components/info-tip";
import { cn } from "@/shared/helpers/utils";
import type { ActionKind } from "@/shared/types/api";
import { GOALS } from "../constants";

export interface GoalCount {
  /** Still to do: new and in progress. */
  open: number;
  done: number;
  /** All but the declined. */
  total: number;
}

/**
 * The four goals in a strip across the panel, as Peec's: each with what it covers behind its ⓘ, a ring
 * that fills as its actions get done, and how many are still open. A tile narrows the list to its goal;
 * pressing it again shows everything.
 */
export function GoalTiles({ counts, value, onChange }: { counts: Record<ActionKind, GoalCount>; value: ActionKind | null; onChange: (goal: ActionKind | null) => void }) {
  const t = useTranslations("Actions");
  const common = useTranslations("Common");

  return (
    <div role="group" aria-label={t("goalsLabel")} className="grid grid-cols-2 border-y @3xl:grid-cols-4">
      {GOALS.map((goal, index) => {
        const Icon = ACTION_KIND_ICONS[goal];
        const pressed = value === goal;
        const { open, done, total } = counts[goal];
        return (
          <div
            key={goal}
            className={cn(
              "relative flex min-w-0 flex-col gap-2 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-6",
              // Dividers: a 2×2 grid on phones, one row from @3xl
              index % 2 === 1 && "border-l",
              index >= 2 && "border-t @3xl:border-t-0",
              index === 2 && "@3xl:border-l",
              pressed && "bg-muted/70",
            )}
          >
            {/* The whole tile presses; the ⓘ above it keeps its own click */}
            <button
              type="button"
              aria-pressed={pressed}
              aria-label={`${t(`goals.${goal}`)}: ${t(`goalCounts.${goal}`, { count: open })}`}
              onClick={() => onChange(pressed ? null : goal)}
              className="absolute inset-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            />
            <span className="pointer-events-none flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="truncate">{t(`goals.${goal}`)}</span>
              <span className="pointer-events-auto relative">
                <InfoTip label={common("about")}>{t(`goalHints.${goal}`)}</InfoTip>
              </span>
            </span>
            <span className="pointer-events-none flex items-center gap-2 text-[0.9375rem] tabular-nums">
              <Ring done={done} total={total} />
              {t(`goalCounts.${goal}`, { count: open })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** How far a goal is: a circle that fills with the share of its actions done. */
function Ring({ done, total }: { done: number; total: number }) {
  const length = 2 * Math.PI * 7;
  const share = total > 0 ? done / total : 0;
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-[18px] shrink-0 -rotate-90">
      <circle cx="9" cy="9" r="7" fill="none" strokeWidth="2" className="stroke-foreground/25" />
      {share > 0 && (
        <circle cx="9" cy="9" r="7" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-positive" strokeDasharray={length} strokeDashoffset={length * (1 - share)} />
      )}
    </svg>
  );
}
