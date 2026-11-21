import type { ActionKind, ReportArea } from "@/shared/types/api";

/**
 * The report's sections in the order they are numbered, as a status report runs: the condition and its
 * numbers, the analysis behind each area, the decisions, then how it was measured. Titles in
 * messages/Report.sections.
 */
// Every question stands right after the topics it is grouped into, and the definitions close the report
// (the user's order, 16 Nov 2026); "appendix" keeps its key from when it was the last section.
// "assistants" opens the analysis: each assistant apart, and what each knows of the business (17 Nov 2026).
// "evidence" closes the report: every answer in full, which the findings link to (Phase 0 item 0.5, spec §4.13)
export const REPORT_SECTIONS = ["summary", "scorecard", "changes", "assistants", "competitors", "topics", "appendix", "sources", "accuracy", "risks", "actions", "method", "glossary", "evidence"] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number];

/** The report's four parts, each a run of sections. Titles in messages/Report.parts. */
export const REPORT_PARTS = [
  { key: "condition", sections: ["summary", "scorecard", "changes"] },
  { key: "analysis", sections: ["assistants", "competitors", "topics", "appendix", "sources", "accuracy"] },
  { key: "decisions", sections: ["risks", "actions"] },
  { key: "reference", sections: ["method", "glossary", "evidence"] },
] as const satisfies readonly { key: string; sections: readonly ReportSectionKey[] }[];

export type ReportPartKey = (typeof REPORT_PARTS)[number]["key"];

/** The area a section is the evidence for: its sentence is the section's conclusion. */
export const SECTION_AREAS: Partial<Record<ReportSectionKey, ReportArea>> = {
  scorecard: "visibility",
  competitors: "competition",
  topics: "coverage",
  sources: "sources",
  accuracy: "accuracy",
};

/** The area a kind of action improves, so the plan reads against the five areas. */
export const ACTION_AREAS: Record<ActionKind, ReportArea> = { technical: "visibility", content: "coverage", listing: "sources", fact: "accuracy" };

/** A section's number, for its title and the contents. */
export const sectionNumber = (key: ReportSectionKey) => REPORT_SECTIONS.indexOf(key) + 1;
