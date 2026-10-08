import { CircleCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ActionWhy } from "@/shared/components/actions/action-why";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { StatusBadge } from "@/shared/components/actions/status-badge";
import { formatPercent } from "@/shared/helpers/numbers";
import type { Action, Report } from "@/shared/types/api";
import { openActions } from "../helpers/report";
import { ReportCard } from "./report-parts";

/** The recommendations the report writes out; the rest are counted. */
const ACTIONS_SHOWN = 8;

/**
 * The action plan: what is still to do, the most effective first, each with the evidence behind it, its
 * expected effect and whether the client has started; then what is already done, with what it changed
 * (visibility on its questions before and after) once a later check has measured it.
 */
export function Recommendations({ report, actions }: { report: Report; actions: Action[] }) {
  const t = useTranslations("Report.actions");
  const locale = useLocale();
  const competitors = new Map(report.project.competitors.map((competitor) => [competitor.id, competitor.name]));
  const open = openActions(actions);
  const done = actions.filter((action) => action.status === "done");

  return (
    <div className="flex flex-col gap-4">
      {open.length === 0 ? (
        <p className="flex items-start gap-2 text-sm">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
          {t("none")}
        </p>
      ) : (
        <ReportCard>
          <ol className="divide-y">
            {open.slice(0, ACTIONS_SHOWN).map((action, index) => (
              <li key={action.id} className="flex items-start gap-3 px-4 py-3 print:break-inside-avoid">
                <span aria-hidden className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background tabular-nums">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-6 gap-y-2">
                  <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
                    <p className="text-sm font-medium text-pretty">
                      <ActionTitle action={action} />
                    </p>
                    <ActionWhy action={action} competitors={competitors} />
                  </div>
                  <div className="flex shrink-0 items-center gap-3 pt-0.5">
                    <ImpactBadge impact={action.impact} />
                    <StatusBadge status={action.status} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {open.length > ACTIONS_SHOWN && <p className="border-t px-4 py-2 text-xs text-muted-foreground">{t("more", { count: open.length - ACTIONS_SHOWN })}</p>}
        </ReportCard>
      )}

      {done.length > 0 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <h3 className="text-sm font-medium">
            {t("doneTitle")}
            <span className="font-normal text-muted-foreground tabular-nums"> · {done.length}</span>
          </h3>
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
