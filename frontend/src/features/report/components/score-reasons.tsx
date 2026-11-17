import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useLocale, useTranslations } from "next-intl";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { ACTION_KIND_ICONS, useActionTitle } from "@/shared/components/actions/action-title";
import { Link } from "@/i18n/navigation";
import { CONDITION_AREAS, conditionStatus } from "@/shared/helpers/condition";
import { formatDecimal } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Action, Condition, ConditionArea } from "@/shared/types/api";
import { ACTION_AREAS, STATUS_FILL } from "../constants";

/** Each area is a fifth of the score: at most this many of its 100 points. */
const AREA_POINTS = 100 / CONDITION_AREAS.length;
/** The open actions listed under an area. */
const ACTIONS_SHOWN = 2;
const IMPACT_ORDER = ["high", "medium", "low"] as const;

const points = (score: number) => Math.round((score / CONDITION_AREAS.length) * 10) / 10;

/**
 * Why the score is what it is (the user, 17 Nov 2026: "reason of scoring, what factors influence, what
 * reason triggered for scoring, more actions"). First the arithmetic, in points: each of the five areas
 * gives up to 20, and the strip shows what each gave. Then the areas that cost points, the costliest first,
 * each with the fact that set its score and the open actions that would raise it, most effective first; an
 * area no action answers says where to look instead.
 */
export function ScoreReasons({
  condition,
  findings,
  actions,
  projectId,
}: {
  condition: Condition;
  /** The fact behind each area's score, in a sentence (`useAreaFindings`). */
  findings: Record<ConditionArea, string>;
  actions: Action[];
  projectId: string;
}) {
  const t = useTranslations("Reports.reasons");
  const areas = useTranslations("Report.areas");
  const title = useActionTitle();
  const locale = useLocale();
  const base = `/projects/${projectId}`;

  const costly = CONDITION_AREAS.map((area) => ({ area, score: condition.areas[area], lost: points(100 - condition.areas[area]) }))
    .filter(({ lost }) => lost > 0)
    .sort((a, b) => b.lost - a.lost);
  const open = actions
    .filter((action) => action.status === "new" || action.status === "in_progress")
    .sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact));
  // Where an area with no action of its own is raised
  const elsewhere: Record<ConditionArea, string> = {
    visibility: `${base}/actions`,
    competition: `${base}/competitors`,
    coverage: `${base}/prompts`,
    sources: `${base}/sources`,
    accuracy: `${base}/settings/facts`,
  };

  return (
    <section aria-labelledby="score-reasons" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id="score-reasons" className="text-base font-semibold">
          {t("title", { score: condition.score })}
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">{t("text", { points: AREA_POINTS })}</p>
      </div>

      {/* The sum: five cells of 20 points, each filled with what its area gave */}
      {/* A row an area on a phone, a column an area from sm */}
      <div className="grid gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto] sm:items-end">
        {CONDITION_AREAS.map((area) => {
          const score = condition.areas[area];
          return (
            <div key={area} className="grid min-w-0 grid-cols-[8.5rem_minmax(0,1fr)_3.75rem] items-center gap-3 sm:flex sm:flex-col sm:items-stretch sm:gap-1.5">
              <span className="truncate text-xs text-muted-foreground">{areas(area)}</span>
              <span aria-hidden className="block h-2.5 overflow-hidden rounded-sm bg-muted">
                <span className={cn("block h-full", STATUS_FILL[conditionStatus(score)])} style={{ width: `${score}%` }} />
              </span>
              <span className="text-right text-sm font-semibold whitespace-nowrap tabular-nums sm:text-left">
                {t("earned", { points: formatDecimal(points(score), locale), max: AREA_POINTS })}
              </span>
            </div>
          );
        })}
        <div className="flex items-baseline justify-between gap-1.5 border-t pt-2 sm:flex-col sm:items-end sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
          <span className="text-xs text-muted-foreground">{t("total")}</span>
          <span className="text-lg leading-none font-semibold tabular-nums">{condition.score}</span>
        </div>
      </div>

      {costly.length === 0 ? (
        <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-pretty">{t("nothingLost")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("lowersTitle")}</h4>
          <ol className="flex flex-col divide-y rounded-lg border">
            {costly.map(({ area, score, lost }) => {
              const answers = open.filter((action) => ACTION_AREAS[action.kind] === area);
              return (
                <li key={area} className="grid gap-x-4 gap-y-2 px-3 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:px-4">
                  <p className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5">
                    <span className="text-lg leading-none font-semibold whitespace-nowrap text-worse tabular-nums">{t("lost", { points: formatDecimal(lost, locale) })}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{t("areaScore", { score })}</span>
                  </p>
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-sm">
                      <span className="font-semibold">{areas(area)}.</span> <span className="text-pretty text-muted-foreground">{findings[area]}</span>
                    </p>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">{t("todo")}</span>
                      {answers.length > 0 ? (
                        <ul className="flex flex-col gap-1">
                          {answers.slice(0, ACTIONS_SHOWN).map((action) => {
                            const Icon = ACTION_KIND_ICONS[action.kind];
                            return (
                              <li key={action.id}>
                                <Link
                                  href={{ pathname: `${base}/actions`, query: { action: action.id } }}
                                  className="group flex items-center gap-2.5 rounded-md border bg-background px-2.5 py-2 text-sm transition-colors hover:bg-muted/50"
                                >
                                  <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                                  <span className="min-w-0 flex-1 truncate font-medium">{title(action)}</span>
                                  <ImpactBadge impact={action.impact} compact />
                                  <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                </Link>
                              </li>
                            );
                          })}
                          {answers.length > ACTIONS_SHOWN && (
                            <li>
                              <Link href={`${base}/actions`} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                                {t("more", { count: answers.length - ACTIONS_SHOWN })}
                              </Link>
                            </li>
                          )}
                        </ul>
                      ) : (
                        <Link href={elsewhere[area]} className="group inline-flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
                          {t(`advice.${area}`)}
                          <ArrowRight aria-hidden className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
