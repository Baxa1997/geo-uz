import { ArrowDown, ArrowUp, CircleCheck, Minus } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatWeekdayDate } from "@/shared/helpers/dates";
import { outOf100 } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Action } from "@/shared/types/api";

/** Fix → proof: the client's visibility on the action's questions before it was done, and now. */
export function ActionProof({ action, nextRunAt }: { action: Action; nextRunAt: string | null }) {
  const t = useTranslations("Actions");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const done = action.doneAt ? t("doneOn", { date: formatLongDate(action.doneAt, locale, timeZone) }) : null;

  if (!action.proof) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-pretty">
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
        <span>
          {done}
          {done && " · "}
          {nextRunAt
            ? t("proofPendingDate", { date: formatWeekdayDate(nextRunAt, locale, timeZone) })
            : t("proofPending")}
        </span>
      </p>
    );
  }

  const { before, after, runs } = action.proof;
  const change = outOf100(after) - outOf100(before);
  const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Icon
          aria-hidden
          className={cn("size-4 shrink-0", change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground")}
        />
        {t("proof", { before: outOf100(before), after: outOf100(after) })}
      </p>
      <p className="pl-6 text-xs text-muted-foreground">
        {done}
        {done && " · "}
        {t("proofRuns", { runs })}
      </p>
    </div>
  );
}
