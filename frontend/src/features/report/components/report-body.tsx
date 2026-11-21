import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Fragment } from "react";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { Action, ReportArea, Report, WaveResponse } from "@/shared/types/api";
import { ACTION_AREAS, REPORT_PARTS, SECTION_AREAS, sectionNumber, type ReportSectionKey } from "../constants";
import { openActions } from "../helpers/report";
import { ACTIONS_SHOWN } from "../helpers/risks";
import { useAreaFindings } from "../hooks/use-area-findings";
import { Accuracy } from "./accuracy";
import { Assistants } from "./assistants";
import { CompetitivePosition } from "./competitive-position";
import { ExecutiveSummary } from "./executive-summary";
import { Glossary, Method } from "./method";
import { PromptTable } from "./prompt-table";
import { Recommendations } from "./recommendations";
import { ReportChanges } from "./report-changes";
import { ReportLetterhead, ReportSignOff } from "./report-header";
import { NextStep, PartHeading, ReportPaper, ReportSection } from "./report-parts";
import { Risks } from "./risks";
import { Scorecard } from "./scorecard";
import { Sources } from "./sources";
import { Topics } from "./topics";

/** The sections with a line under their title on what they show and how to read them. */
const WITH_LEAD = ["scorecard", "changes", "assistants", "competitors", "topics", "sources", "accuracy", "risks", "actions", "method", "appendix"] as const;

/** The part after which the report proper ends and is signed off; the reference follows. */
const SIGNED_AFTER = "decisions";

/**
 * The report as one official document on one paper (the user's correction of Oct 10: "inside of report
 * make as official report page"): the letterhead and title; part I, the condition (the summary with the
 * count of answers naming the client and the five areas by their counts, the key figures, what changed;
 * no score since 21 Nov 2026); part II, the analysis, a section per area, each opening with its conclusion
 * and closing with the action that answers it; part
 * III, the decisions (risks and opportunities, the action plan); the sign-off; part IV, the reference
 * (method, definitions, every question); and a line on what the numbers are. The same in the shared
 * report and on its page in Hisobotlar.
 */
export function ReportBody({
  report,
  wave,
  actions,
  fill = false,
}: {
  report: Report;
  /** The check's data object and its metrics: the scope card, the counts and every section built on them read it (Phase 0 items 0.1, 0.2). */
  wave: WaveResponse;
  actions: Action[];
  /** The paper takes the whole width it is given. */
  fill?: boolean;
}) {
  const { metrics } = wave;
  const { scope } = metrics;
  const t = useTranslations("Report");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const findings = useAreaFindings(report, metrics);
  const { brand, competitors } = report.project;
  const open = openActions(actions);
  // The plan's first action for an area: what its section recommends
  const nextFor = (area: ReportArea) => {
    const index = open.findIndex((action) => ACTION_AREAS[action.kind] === area);
    const action = open[index];
    return action && index < ACTIONS_SHOWN ? { action, number: index + 1 } : null;
  };

  const content: Record<ReportSectionKey, React.ReactNode> = {
    summary: (
      <ExecutiveSummary
        report={report}
        actions={actions}
        metrics={metrics}
        findings={{
          visibility: findings.visibility.finding,
          competition: findings.competition.finding,
          coverage: findings.coverage.finding,
          sources: findings.sources.finding,
          accuracy: findings.accuracy.finding,
        }}
      />
    ),
    scorecard: <Scorecard report={report} metrics={metrics} />,
    changes: <ReportChanges report={report} actions={actions} />,
    assistants: <Assistants report={report} metrics={metrics} />,
    competitors: <CompetitivePosition report={report} metrics={metrics} />,
    topics: <Topics report={report} metrics={metrics} />,
    sources: <Sources metrics={metrics} />,
    accuracy: <Accuracy report={report} metrics={metrics} />,
    risks: <Risks report={report} actions={actions} metrics={metrics} />,
    actions: <Recommendations report={report} actions={actions} />,
    method: <Method report={report} metrics={metrics} />,
    glossary: <Glossary />,
    appendix: <PromptTable results={report.prompts} brands={[brand, ...competitors]} youId={brand.id} />,
  };
  // The summary and the definitions say what they are without a line under their title
  const lead = (key: ReportSectionKey) => {
    const withLead = WITH_LEAD.find((candidate) => candidate === key);
    return withLead ? t(`${withLead}.lead`) : undefined;
  };

  return (
    <ReportPaper fill={fill}>
      <ReportLetterhead report={report} scope={scope} />
      {REPORT_PARTS.map((part, index) => (
        <Fragment key={part.key}>
          <PartHeading number={index + 1} title={t(`parts.${part.key}`)} />
          {part.sections.map((key) => {
            const area = SECTION_AREAS[key];
            const finding = area ? findings[area] : undefined;
            const next = area ? nextFor(area) : null;
            return (
              <ReportSection
                key={key}
                id={key}
                number={sectionNumber(key)}
                title={t(`sections.${key}`)}
                lead={lead(key)}
                verdict={finding ? [finding.finding, finding.detail].filter(Boolean).join(" ") : undefined}
                next={
                  next ? (
                    <NextStep>
                      <ActionTitle action={next.action} />
                      {next.action.kind === "fact" && ` (“${next.action.claim}”)`}.{" "}
                      <a href="#actions" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                        {t("condition.inPlan", { number: next.number, section: sectionNumber("actions") })}
                      </a>
                    </NextStep>
                  ) : undefined
                }
              >
                {content[key]}
              </ReportSection>
            );
          })}
          {part.key === SIGNED_AFTER && <ReportSignOff report={report} />}
        </Fragment>
      ))}
      <footer className="border-t pt-3 text-xs text-pretty text-muted-foreground">{t("footer", { date: formatLongDate(report.method.collectedAt, locale, timeZone) })}</footer>
    </ReportPaper>
  );
}
