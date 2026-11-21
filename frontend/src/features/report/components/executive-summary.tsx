import { useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import type { Action, Report, ReportArea, WaveMetrics } from "@/shared/types/api";
import { ACTION_AREAS, sectionNumber } from "../constants";
import { openActions } from "../helpers/report";
import { weekEvents } from "../helpers/weeks";
import { HeadlineSummary } from "./headline-summary";
import { BlockTitle, Verdict } from "./report-parts";
import { WeekEventLine } from "./week-event";

/** The summary tells this many of the week's events, and this many of the plan's first actions. */
const HIGHLIGHTS = 4;
const FIRST_ACTIONS = 3;

/**
 * The report's answer on one page, for the reader who reads nothing else: the buyers' answers that name the
 * client, as a count, beside the five areas each with its own count (no score since 21 Nov 2026: report spec
 * Phase 0 item 0.2); the conclusion in a sentence, the count and who is named most; then the week's
 * highlights beside the decisions it asks for (the plan's first three actions). Everything after this page
 * is the evidence.
 */
export function ExecutiveSummary({
  report,
  actions,
  metrics,
  findings,
  moreHref = "#actions",
}: {
  report: Report;
  actions: Action[];
  metrics: WaveMetrics;
  /** The sentence on each area. */
  findings: Record<ReportArea, string>;
  /** Where "the whole plan" leads: the section below, or the report's page from Hisobotlar. */
  moreHref?: string;
}) {
  const t = useTranslations("Report");
  const seen = metrics.visibility;
  const first = openActions(actions).slice(0, FIRST_ACTIONS);
  const compared = report.history.length > 1;
  const highlights = weekEvents(report.history.length - 1, {
    project: report.project,
    history: report.history,
    sourceHistory: report.sourceHistory,
    factDates: report.wrongFacts.map((fact) => fact.foundAt),
    doneDates: actions.flatMap((action) => (action.doneAt ? [action.doneAt] : [])),
  }).slice(0, HIGHLIGHTS);

  return (
    <div className="flex flex-col gap-4">
      <HeadlineSummary metrics={metrics} findings={findings} />

      <Verdict>
        {t("headline.verdict", { brand: report.project.brand.name, named: seen.named, answers: seen.answers })} {findings.competition}
      </Verdict>

      {/* Side by side once there is room: on paper too */}
      <div data-tour="decisions" className="@container print:break-inside-avoid">
        <div className="grid gap-x-8 gap-y-4 @2xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2.5">
            <BlockTitle>{t("summary.highlights")}</BlockTitle>
            {highlights.length === 0 ? (
              <p className="text-sm text-pretty text-muted-foreground">{t(compared ? "summary.highlightsQuiet" : "summary.highlightsFirst")}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {highlights.map((event) => (
                  <li key={`${event.kind}-${JSON.stringify(event.values)}`}>
                    <WeekEventLine event={event} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2.5">
            <BlockTitle>{t("summary.decisions")}</BlockTitle>
            {first.length === 0 ? (
              <p className="text-sm text-pretty text-muted-foreground">{t("summary.noActions")}</p>
            ) : (
              <>
                <ol className="flex flex-col gap-2.5">
                  {first.map((action, index) => (
                    <li key={action.id} className="flex items-start gap-2.5 text-sm">
                      <span aria-hidden className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background tabular-nums">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium text-pretty">
                          <ActionTitle action={action} />
                        </span>
                        {/* Two wrong facts would otherwise read the same */}
                        {action.kind === "fact" && <span className="text-pretty text-muted-foreground">“{action.claim}”</span>}
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {t(`areas.${ACTION_AREAS[action.kind]}`)}
                          <span aria-hidden>·</span>
                          <ImpactBadge impact={action.impact} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">
                  <a href={moreHref} className="underline-offset-4 hover:underline">
                    {t("summary.more", { section: sectionNumber("actions") })}
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
