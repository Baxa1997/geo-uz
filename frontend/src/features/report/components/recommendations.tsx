import { CircleCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ActionWhy } from "@/shared/components/actions/action-why";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { StatusBadge } from "@/shared/components/actions/status-badge";
import { formatPercent } from "@/shared/helpers/numbers";
import type { Action, Report } from "@/shared/types/api";
import { ACTION_AREAS } from "../constants";
import { openActions } from "../helpers/report";
import { ACTIONS_SHOWN } from "../helpers/risks";
import { BlockTitle, ReportCard } from "./report-parts";

/** The plan's columns from the width where they fit side by side (wider than a sheet of paper): number, action, area, effect, status. */
const COLUMNS = "@3xl:grid-cols-[1.5rem_minmax(0,1fr)_9.5rem_7.5rem_6.5rem]";

/**
 * The action plan. First how far it has come: the actions done, in progress and not started, as one bar.
 * Then what is still to do, the most effective first, each with the evidence behind it, the area of the
 * condition it improves, its expected effect and whether the client has started; then what is already
 * done, with what it changed (visibility on its questions before and after) once a later check has
 * measured it.
 */
export function Recommendations({ report, actions }: { report: Report; actions: Action[] }) {
  const t = useTranslations("Report.actions");
  const areas = useTranslations("Report.areas");
  const locale = useLocale();
  const competitors = new Map(report.project.competitors.map((competitor) => [competitor.id, competitor.name]));
  const open = openActions(actions);
  const done = actions.filter((action) => action.status === "done");
  const started = open.filter((action) => action.status === "in_progress").length;
  const total = open.length + done.length;
  const progress = [
    { key: "done", count: done.length, color: "var(--positive)" },
    { key: "started", count: started, color: "var(--progress)" },
    { key: "waiting", count: open.length - started, color: "color-mix(in oklab, var(--muted-foreground) 30%, transparent)" },
  ] as const;

  return (
    <div className="flex flex-col gap-3.5">
      {total > 0 && (
        <ReportCard className="flex flex-col gap-3 p-4 print:break-inside-avoid">
          <p className="text-[0.9375rem] font-semibold">{t("progress", { done: done.length, total })}</p>
          <div role="img" aria-label={progress.map((part) => `${t(`parts.${part.key}`)}: ${part.count}`).join(", ")} className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {progress
              .filter((part) => part.count > 0)
              .map((part) => (
                <span key={part.key} className="h-full" style={{ width: `${(part.count / total) * 100}%`, background: part.color }} />
              ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {progress.map((part) => (
              <li key={part.key} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: part.color }} />
                {t(`parts.${part.key}`)}
                <span className="font-semibold tabular-nums">{part.count}</span>
              </li>
            ))}
          </ul>
        </ReportCard>
      )}

      {open.length === 0 ? (
        <p className="flex items-start gap-2 text-sm">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
          {t("none")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <BlockTitle count={open.length}>{t("openTitle")}</BlockTitle>
          <ReportCard className="@container">
            <div aria-hidden className={`hidden gap-x-4 border-b bg-muted/60 px-4 py-2.5 text-xs font-medium text-muted-foreground @3xl:grid ${COLUMNS}`}>
              <span>#</span>
              <span>{t("what")}</span>
              <span>{t("area")}</span>
              <span>{t("impact")}</span>
              <span>{t("status")}</span>
            </div>
            <ol className="divide-y">
              {open.slice(0, ACTIONS_SHOWN).map((action, index) => (
                <li key={action.id} className={`grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-2 px-4 py-3 print:break-inside-avoid ${COLUMNS}`}>
                  <span aria-hidden className="mt-px flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background tabular-nums">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm font-medium text-pretty">
                      <ActionTitle action={action} />
                    </p>
                    <ActionWhy action={action} competitors={competitors} />
                  </div>
                  {/* Narrow: the three marks share a line under the action */}
                  <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 @3xl:contents">
                    <span className="text-sm text-pretty @3xl:pt-0.5">{areas(ACTION_AREAS[action.kind])}</span>
                    <span className="@3xl:pt-0.5">
                      <ImpactBadge impact={action.impact} />
                    </span>
                    <span>
                      <StatusBadge status={action.status} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            {open.length > ACTIONS_SHOWN && <p className="border-t px-4 py-2 text-xs text-muted-foreground">{t("more", { count: open.length - ACTIONS_SHOWN })}</p>}
          </ReportCard>
        </div>
      )}

      {done.length > 0 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle count={done.length}>{t("doneTitle")}</BlockTitle>
          <ReportCard>
            <ul className="divide-y">
              {done.map((action) => (
                <li key={action.id} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-pretty">
                      <ActionTitle action={action} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {action.proof
                        ? t("doneProof", { before: formatPercent(action.proof.before, locale), after: formatPercent(action.proof.after, locale) })
                        : t("donePending")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </ReportCard>
        </div>
      )}
    </div>
  );
}
