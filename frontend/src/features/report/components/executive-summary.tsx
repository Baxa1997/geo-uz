import { useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import type { Action, Report, ReportArea, WaveResponse } from "@/shared/types/api";
import { ACTION_AREAS, sectionNumber } from "../constants";
import { openActions } from "../helpers/report";
import { weekEvents } from "../helpers/weeks";
import { HeadlineSummary } from "./headline-summary";
import { BlockTitle, Share, Verdict } from "./report-parts";
import { researchShown } from "./research";
import { ShelfStatus } from "./shelf-status";
import { TopFinding } from "./top-finding";
import { WeekEventLine } from "./week-event";

/** The summary tells this many of the week's events, and this many of the plan's first actions. */
const HIGHLIGHTS = 4;
const FIRST_ACTIONS = 3;
/** The businesses named in the client's place that the decision page lists. */
const INSTEAD = 4;

/**
 * The report's answer on one page, for the reader who reads nothing else: the buyers' answers that name the
 * client, as a count, beside the five areas each with its own count (no score since 21 Nov 2026: report spec
 * Phase 0 item 0.2); the conclusion in a sentence, the count and who is named most; the top finding with its
 * answers (0.5); then the week's highlights beside the decisions it asks for (the plan's first three actions).
 * Everything after this page is the evidence.
 */
export function ExecutiveSummary({
  report,
  actions,
  wave,
  findings,
  moreHref = "#actions",
}: {
  report: Report;
  actions: Action[];
  /** The check's data object and metrics: the counts and the top finding's answers. */
  wave: WaveResponse;
  /** The sentence on each area. */
  findings: Record<ReportArea, string>;
  /** Where "the whole plan" leads: the section below, or the report's page from Hisobotlar. */
  moreHref?: string;
}) {
  const t = useTranslations("Report");
  const { metrics } = wave;
  const seen = metrics.visibility;
  const first = openActions(actions).slice(0, FIRST_ACTIONS);
  const compared = report.history.length > 1;
  // Who AI named in the client's place, the most named first: tracked or not (spec rule 7)
  const { providers } = metrics;
  const instead = providers.rows.filter((row) => !row.own && row.answers > 0).slice(0, INSTEAD);
  // Why, from the research: the lost questions compared, and the facts the rivals' pages state that the client's don't
  const researched = researchShown(report);
  const comparedFindings = researched?.filter((finding) => finding.status === "compared") ?? [];
  const why = researched && researched.length > 0 && comparedFindings.length > 0 ? { compared: comparedFindings.length, lost: researched.length, facts: comparedFindings.reduce((sum, finding) => sum + (finding.missing?.length ?? 0), 0) } : null;
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

      {/* The decision page (spec §4.1; 23 Nov 2026, the user's "Build research + decision page"): who holds each
          question, who AI named in the client's place, and why, from the research */}
      <div className="grid gap-x-8 gap-y-4 @container print:break-inside-avoid">
        <div className="flex min-w-0 flex-col gap-2">
          <BlockTitle>{t("summary.shelf")}</BlockTitle>
          <ShelfStatus wave={wave} list={false} />
        </div>
        {instead.length > 0 && (
          <div className="flex min-w-0 flex-col gap-2">
            <BlockTitle>{t("summary.instead")}</BlockTitle>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {instead.map((row) => (
                <li key={row.key} className="flex items-baseline gap-1.5">
                  <span className="font-medium">{row.name}</span>
                  <Share k={row.answers} n={providers.answers} text={t("summary.insteadCount", { count: row.answers, total: providers.answers })} className="text-muted-foreground" />
                </li>
              ))}
            </ul>
            {why && (
              <p className="text-sm text-pretty">
                {t("summary.why", { compared: why.compared, lost: why.lost, facts: why.facts })}{" "}
                <a href="#research" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {t("summary.whySection", { section: sectionNumber("research") })}
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <TopFinding wave={wave} brands={[report.project.brand, ...report.project.competitors]} youId={report.project.brand.id} />

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
                <p className="text-sm font-medium text-pretty">{t("summary.decide")}</p>
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
