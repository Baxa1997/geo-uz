/**
 * The report's sections in the order they are numbered: the answer first, what changed since the last
 * report, the evidence, what to do, then how it was measured. Titles in messages/Report.sections.
 */
export const REPORT_SECTIONS = ["summary", "changes", "scorecard", "competitors", "topics", "sources", "accuracy", "actions", "method", "glossary", "appendix"] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number];

/** The sections a long one may run over pages on paper. */
export const SPLITTING_SECTIONS: ReportSectionKey[] = ["competitors", "topics", "accuracy", "actions", "appendix"];
