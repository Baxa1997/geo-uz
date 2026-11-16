import type { ActionKind, ConditionArea } from "@/shared/types/api";

/**
 * The report's sections in the order they are numbered, as a status report runs: the condition and its
 * numbers, the analysis behind each area, the decisions, then how it was measured. Titles in
 * messages/Report.sections.
 */
// Every question stands right after the topics it is grouped into, and the definitions close the report
// (the user's order, 16 Nov 2026); "appendix" keeps its key from when it was the last section.
export const REPORT_SECTIONS = ["summary", "scorecard", "changes", "competitors", "topics", "appendix", "sources", "accuracy", "risks", "actions", "method", "glossary"] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number];

/** The report's four parts, each a run of sections. Titles in messages/Report.parts. */
export const REPORT_PARTS = [
  { key: "condition", sections: ["summary", "scorecard", "changes"] },
  { key: "analysis", sections: ["competitors", "topics", "appendix", "sources", "accuracy"] },
  { key: "decisions", sections: ["risks", "actions"] },
  { key: "reference", sections: ["method", "glossary"] },
] as const satisfies readonly { key: string; sections: readonly ReportSectionKey[] }[];

export type ReportPartKey = (typeof REPORT_PARTS)[number]["key"];

/** The area of the condition a section is the evidence for: its status stands beside the section's title. */
export const SECTION_AREAS: Partial<Record<ReportSectionKey, ConditionArea>> = {
  scorecard: "visibility",
  competitors: "competition",
  topics: "coverage",
  sources: "sources",
  accuracy: "accuracy",
};

/** The area a kind of action improves, so the plan reads against the condition. */
export const ACTION_AREAS: Record<ActionKind, ConditionArea> = { technical: "visibility", content: "coverage", listing: "sources", fact: "accuracy" };

/** A section's number, for its title and the contents. */
export const sectionNumber = (key: ReportSectionKey) => REPORT_SECTIONS.indexOf(key) + 1;

// The status colours moved to the shared helpers with the gauge (16 Nov 2026: the landing page draws it too)
export { STATUS_COLOR, STATUS_FILL } from "@/shared/helpers/condition";
