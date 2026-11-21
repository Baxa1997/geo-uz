import { useTranslations } from "next-intl";
import type { Report, ReportArea, WaveMetrics } from "@/shared/types/api";
import { useCountWords } from "@/shared/hooks/use-count-words";

/** What the report says of one area. */
export interface AreaFinding {
  /** The area's counts in a sentence or two: what the summary's row says, and the conclusion of its section. */
  finding: string;
  /** What the area's own section adds to it; "" when nothing. */
  detail: string;
}

/**
 * The report's sentence on each of the five areas, written from the check's counts (report spec Phase 0 item
 * 0.2: no score, no status): the buyers' answers that name the client, where it stands among the tracked
 * brands with ties named together, the questions that name it, how often its site is cited among the answers
 * that cite a site, and how it is spoken of (its tone per mention, N/A when it isn't named) with the wrong
 * facts found. Every number is the metrics'; the wrong facts are the report's.
 */
export function useAreaFindings(report: Pick<Report, "project" | "wrongFacts" | "factsChecked">, metrics: WaveMetrics): Record<ReportArea, AreaFinding> {
  const t = useTranslations("Report.findings");
  const words = useCountWords();
  const seen = metrics.visibility;
  const { rows, leaders: leaderIds } = metrics.brands;
  const client = rows.find((row) => row.own);
  const leaders = leaderIds.flatMap((id) => rows.filter((row) => row.id === id));
  const others = leaders.filter((row) => !row.own);
  const you = client?.named ?? 0;

  const visibility = [t("visibility", { named: seen.named, answers: seen.answers }), seen.small_sample ? t("smallSample") : ""];

  const [first] = leaders;
  const competition =
    report.project.competitors.length === 0
      ? t("competitionAlone")
      : !first
        ? t("competitionNobody")
        : leaders.length === 1 && first.own
          ? t("competitionYouLead", { named: first.named, answers: seen.answers })
          : leaders.some((row) => row.own)
            ? t("competitionShared", { names: words.names(others.map((row) => row.name)), named: first.named, answers: seen.answers })
            : leaders.length === 1
              ? t("competitionLeader", { leader: first.name, named: first.named, answers: seen.answers, you })
              : t("competitionTied", { names: words.names(others.map((row) => row.name)), named: first.named, answers: seen.answers, you });

  const coverage = [
    t("coverage", { named: seen.prompts_named, total: seen.prompts }),
    seen.prompts_only_rivals > 0 ? t("coverageMissing", { count: seen.prompts_only_rivals }) : t("coverageAll"),
  ];

  const sources = seen.cited_answers === 0 ? t("sourcesNoCitations") : t("sourcesClient", { cited: seen.client_cited, answers: seen.cited_answers });

  const tone = client?.tone;
  const accuracy = [
    !tone || tone.mentions === 0
      ? t("accuracyNotNamed")
      : tone.summary === null
        ? t("accuracyFew", { count: tone.mentions, minimum: metrics.brands.tone_summary_from })
        : t("accuracyTone", { tone: words.tone(client).toLowerCase(), count: tone.mentions }),
    report.wrongFacts.length > 0 ? t("accuracyFacts", { count: report.wrongFacts.length }) : t(report.factsChecked === false ? "accuracyNotChecked" : "accuracyClean"),
  ];

  const sentence = (parts: string[]) => parts.filter(Boolean).join(" ");
  return {
    visibility: { finding: sentence(visibility), detail: "" },
    competition: { finding: competition, detail: "" },
    coverage: { finding: sentence(coverage), detail: "" },
    sources: { finding: sources, detail: "" },
    accuracy: { finding: sentence(accuracy), detail: "" },
  };
}
