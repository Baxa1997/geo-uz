import type { ConditionStatus } from "@/shared/helpers/condition";
import type { ActionKind, ConditionArea } from "@/shared/types/api";

/**
 * The report's sections in the order they are numbered, as a status report runs: the condition and its
 * numbers, the analysis behind each area, the decisions, then how it was measured. Titles in
 * messages/Report.sections.
 */
export const REPORT_SECTIONS = ["summary", "scorecard", "changes", "competitors", "topics", "sources", "accuracy", "risks", "actions", "method", "glossary", "appendix"] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number];

/** The report's four parts, each a run of sections. Titles in messages/Report.parts. */
export const REPORT_PARTS = [
  { key: "condition", sections: ["summary", "scorecard", "changes"] },
  { key: "analysis", sections: ["competitors", "topics", "sources", "accuracy"] },
  { key: "decisions", sections: ["risks", "actions"] },
  { key: "reference", sections: ["method", "glossary", "appendix"] },
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

/** A status as a fill (dots, bars) and as a CSS color (a gauge's arc): green, amber, red, always beside its word. */
export const STATUS_FILL: Record<ConditionStatus, string> = { good: "bg-positive", fair: "bg-progress", weak: "bg-negative" };
export const STATUS_COLOR: Record<ConditionStatus, string> = { good: "var(--positive)", fair: "var(--progress)", weak: "var(--negative)" };
