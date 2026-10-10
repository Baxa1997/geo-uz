import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Fragment } from "react";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { Action, ConditionArea, Report } from "@/shared/types/api";
import { ACTION_AREAS, REPORT_PARTS, SECTION_AREAS, sectionNumber, type ReportSectionKey } from "../constants";
import { openActions } from "../helpers/report";
import { ACTIONS_SHOWN } from "../helpers/risks";
import { useAreaFindings } from "../hooks/use-area-findings";
import { Accuracy } from "./accuracy";
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
const WITH_LEAD = ["scorecard", "changes", "competitors", "topics", "sources", "accuracy", "risks", "actions", "method", "appendix"] as const;

/** The part after which the report proper ends and is signed off; the reference follows. */
const SIGNED_AFTER = "decisions";

/**
 * The report as one official document on one paper (the user's correction of Oct 10: "inside of report
 * make as official report page"): the letterhead and title; part I, the condition (the summary with the
 * overall score and the five areas, the key figures, what changed); part II, the analysis, a section per
 * area, each opening with its status and its conclusion and closing with the action that answers it; part
 * III, the decisions (risks and opportunities, the action plan); the sign-off; part IV, the reference
 * (method, definitions, every question); and a line on what the numbers are. The same in the shared
 * report and on its page in Hisobotlar.
 */
export function ReportBody({ report, actions, fill = false }: { report: Report; actions: Action[]; /** The paper takes the whole width it is given. */ fill?: boolean }) {
  const t = useTranslations("Report");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const findings = useAreaFindings(report);
  const condition = report.conditionHistory.at(-1);
  const { brand, competitors } = report.project;
  const open = openActions(actions);
  // The plan's first action for an area: what its section recommends
  const nextFor = (area: ConditionArea) => {
    const index = open.findIndex((action) => ACTION_AREAS[action.kind] === area);
    const action = open[index];
    return action && index < ACTIONS_SHOWN ? { action, number: index + 1 } : null;
  };

  const content: Record<ReportSectionKey, React.ReactNode> = {
    summary: (
      <ExecutiveSummary
        report={report}
        actions={actions}
        findings={{
          visibility: findings.visibility.finding,
          competition: findings.competition.finding,
          coverage: findings.coverage.finding,
          sources: findings.sources.finding,
          accuracy: findings.accuracy.finding,
        }}
      />
    ),
    scorecard: <Scorecard report={report} />,
    changes: <ReportChanges report={report} actions={actions} />,
    competitors: <CompetitivePosition report={report} />,
    topics: <Topics report={report} />,
    sources: <Sources report={report} />,
    accuracy: <Accuracy report={report} />,
    risks: <Risks report={report} actions={actions} />,
    actions: <Recommendations report={report} actions={actions} />,
    method: <Method report={report} />,
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
      <ReportLetterhead report={report} />
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
                score={area && condition ? condition.areas[area] : undefined}
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
