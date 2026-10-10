import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { CONDITION_AREAS, conditionStatus, FAIR_FROM, GOOD_FROM } from "@/shared/helpers/condition";
import { formatShortDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { ConditionArea, Report } from "@/shared/types/api";
import { STATUS_FILL } from "../constants";
import { ConditionColumns, ConditionGauge } from "./condition-gauge";
import { ScoreBar, StatusChip } from "./report-parts";

/**
 * The condition at a glance, what a status report opens with: the overall score as a gauge with its
 * status, its change since the report before and its columns over the reports; beside it the five areas,
 * each with its score as a bar, its status and, when given, the fact behind it in a sentence. The scale
 * (where "good" and "fair" begin) is written under the gauge, so nothing depends on hover.
 */
export function ConditionSummary({
  report,
  findings,
  className,
}: {
  report: Pick<Report, "conditionHistory" | "history">;
  /** A sentence per area; left out, the rows are the areas' scores alone. */
  findings?: Record<ConditionArea, string>;
  className?: string;
}) {
  const t = useTranslations("Report");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const condition = report.conditionHistory.at(-1);
  if (!condition) return null;

  const before = report.conditionHistory.at(-2);
  const change = before ? condition.score - before.score : null;
  const status = conditionStatus(condition.score);
  const scores = report.conditionHistory.map((point) => point.score);
  const first = report.history[0]?.collectedAt;
  const last = report.history.at(-1)?.collectedAt;
  const Arrow = change === null || change === 0 ? Minus : change > 0 ? ArrowUp : ArrowDown;

  return (
    <div data-tour="condition" className={cn("@container", className)}>
      {/* Side by side from the width of a sheet of paper */}
      <div className="grid gap-5 @2xl:grid-cols-[14rem_minmax(0,1fr)] @2xl:gap-6">
        <div className="flex flex-col gap-2.5 @2xl:border-r @2xl:pr-6">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("condition.overall")}</p>
          <ConditionGauge score={condition.score} label={t("condition.gaugeLabel", { score: condition.score, status: t(`status.${status}`) })} />
          <div className="flex flex-col items-center gap-0.5 text-center">
            <p className="flex items-center gap-2 pb-0.5 text-lg leading-tight font-semibold">
              <span aria-hidden className={cn("size-2.5 rounded-full", STATUS_FILL[status])} />
              {t(`status.${status}`)}
            </p>
            {change === null ? (
              <p className="text-sm text-pretty text-muted-foreground">{t("condition.first")}</p>
            ) : (
              <>
                <p className={cn("flex items-center gap-1 text-sm font-medium", change === 0 ? "text-muted-foreground" : change > 0 ? "text-better" : "text-worse")}>
                  <Arrow aria-hidden className="size-3.5 shrink-0" />
                  {change === 0 ? t("condition.changeSame") : t(change > 0 ? "condition.changeUp" : "condition.changeDown", { points: Math.abs(change) })}
                </p>
                <p className="text-xs text-muted-foreground">{t("condition.since")}</p>
              </>
            )}
          </div>

          {scores.length > 1 && first && last && (
            <div className="flex flex-col gap-1">
              <ConditionColumns
                scores={scores}
                label={t("condition.columnsLabel", { count: scores.length, from: scores[0] ?? 0, to: condition.score })}
              />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatShortDate(first, locale, timeZone)}</span>
                <span>{t("condition.reports", { count: scores.length })}</span>
                <span>{formatShortDate(last, locale, timeZone)}</span>
              </div>
            </div>
          )}

          {/* The scale in words: a reader on paper can't hover */}
          <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 border-t pt-2.5 text-xs text-muted-foreground">
            {(
              [
                ["good", t("condition.scaleGood", { from: GOOD_FROM })],
                ["fair", t("condition.scaleFair", { from: FAIR_FROM, to: GOOD_FROM - 1 })],
                ["weak", t("condition.scaleWeak", { to: FAIR_FROM - 1 })],
              ] as const
            ).map(([key, text]) => (
              <li key={key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_FILL[key])} />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="@container flex min-w-0 flex-col">
          <div className="flex items-end justify-between gap-4 border-b pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <span>{t("condition.byArea")}</span>
            <span className="hidden @md:grid @md:grid-cols-[7.5rem_2rem_6.5rem] @3xl:grid-cols-[13rem_2rem_6.5rem] @5xl:grid-cols-[18rem_2rem_6.5rem] @md:gap-x-4 @md:font-medium @md:tracking-normal @md:normal-case">
              <span>{t("condition.score")}</span>
              <span />
              <span>{t("condition.status")}</span>
            </span>
          </div>
          <ul className="divide-y">
            {CONDITION_AREAS.map((area) => {
              const score = condition.areas[area];
              return (
                <li key={area} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 @md:grid-cols-[minmax(0,1fr)_7.5rem_2rem_6.5rem] @3xl:grid-cols-[minmax(0,1fr)_13rem_2rem_6.5rem] @5xl:grid-cols-[minmax(0,1fr)_18rem_2rem_6.5rem] print:break-inside-avoid">
                  <p className="min-w-0 text-[0.9375rem] font-semibold">
                    {t(`areas.${area}`)}
                    <span className="sr-only">: {t("condition.outOf100", { score })}</span>
                  </p>
                  <ScoreBar score={score} className="hidden @md:block" />
                  <span aria-hidden className="hidden text-right font-semibold tabular-nums @md:block">
                    {score}
                  </span>
                  <StatusChip score={score} className="justify-self-end @md:justify-self-start" />
                  {/* Narrow: the bar and its number take a line of their own */}
                  <span aria-hidden className="col-span-full flex items-center gap-3 @md:hidden">
                    <ScoreBar score={score} className="flex-1" />
                    <span className="w-7 text-right text-sm font-semibold tabular-nums">{score}</span>
                  </span>
                  {findings && <p className="col-span-full text-sm text-pretty text-muted-foreground">{findings[area]}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
