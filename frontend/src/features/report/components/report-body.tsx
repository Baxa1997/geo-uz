import { useTranslations } from "next-intl";
import type { Action, Report } from "@/shared/types/api";
import { REPORT_SECTIONS, SPLITTING_SECTIONS, type ReportSectionKey } from "../constants";
import { Accuracy } from "./accuracy";
import { CompetitivePosition } from "./competitive-position";
import { ExecutiveSummary } from "./executive-summary";
import { Glossary, Method } from "./method";
import { PromptTable } from "./prompt-table";
import { Recommendations } from "./recommendations";
import { ReportChanges } from "./report-changes";
import { ReportSection } from "./report-parts";
import { Scorecard } from "./scorecard";
import { Sources } from "./sources";
import { Topics } from "./topics";

/** The sections with a line under their title on how to read them. */
const WITH_LEAD = ["changes", "scorecard", "competitors", "topics", "sources", "accuracy", "actions", "method", "appendix"] as const;

/** A section's number, for the page's contents. */
export const sectionNumber = (key: ReportSectionKey) => REPORT_SECTIONS.indexOf(key) + 1;

/**
 * The report's sections, numbered, as a standard business report runs: the answer first, what changed
 * since the report before, the evidence, the recommendations, then the method, the definitions and every
 * question. The same in the shared report and on its page in Hisobotlar.
 */
export function ReportBody({ report, actions, cover = false }: { report: Report; actions: Action[]; /** A cover above shows visibility and its change. */ cover?: boolean }) {
  const t = useTranslations("Report");
  const { brand, competitors } = report.project;
  const content: Record<ReportSectionKey, React.ReactNode> = {
    summary: <ExecutiveSummary report={report} actions={actions} actionsSection={sectionNumber("actions")} trend={!cover} />,
    changes: <ReportChanges report={report} actions={actions} />,
    scorecard: <Scorecard report={report} />,
    competitors: <CompetitivePosition report={report} />,
    topics: <Topics report={report} />,
    sources: <Sources report={report} />,
    accuracy: <Accuracy report={report} />,
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

  return REPORT_SECTIONS.map((key) => (
    <ReportSection key={key} id={key} number={sectionNumber(key)} title={t(`sections.${key}`)} lead={lead(key)} splits={SPLITTING_SECTIONS.includes(key)}>
      {content[key]}
    </ReportSection>
  ));
}
