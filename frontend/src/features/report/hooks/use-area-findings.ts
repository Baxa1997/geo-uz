import { useLocale, useMessages, useTranslations } from "next-intl";
import { conditionFacts, WRONG_FACT_PENALTY } from "@/shared/helpers/condition";
import { labelFor } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { missingSources, outOfTen, ownSourceShare, promptsWithoutYou, rankedBrands, scoreOf, standing, toneOf } from "@/shared/helpers/scores";
import type { ConditionArea, Report } from "@/shared/types/api";
import { groupsAgainstLeader } from "../helpers/report";

/** A finding names this many of the sites the client is missing from. */
const SITES_NAMED = 3;

/** What the report says of one area of the condition. */
export interface AreaFinding {
  /** The fact behind the area's score, in a sentence or two: what the summary's row says. */
  finding: string;
  /** What the area's own section adds to it; "" when nothing. */
  detail: string;
}

/**
 * The report's sentence on each area of the condition, written from the same facts its score is counted
 * from: how often the client is named and how that moved, where it stands among the brands, how many of
 * the questions name it, how much of what ChatGPT cites lists it, and how well and how truly it is spoken of.
 */
export function useAreaFindings(report: Report): Record<ConditionArea, AreaFinding> {
  const t = useTranslations("Report.findings");
  const tones = useTranslations("Tone");
  const messages = useMessages();
  const locale = useLocale();
  const { brand, competitors } = report.project;
  const facts = conditionFacts(report);
  const you = scoreOf(report.scores, brand.id);
  const percent = (share: number) => formatPercent(share, locale);

  const before = report.history.at(-2)?.scores.find((score) => score.brandId === brand.id);
  const moved = before ? Math.round(facts.visibility * 100) - Math.round(before.visibility * 100) : null;
  const visibility = [
    t("visibility", { you: outOfTen(facts.visibility), percent: percent(facts.visibility) }),
    moved === null ? "" : moved > 0 ? t("visibilityUp", { points: moved }) : moved < 0 ? t("visibilityDown", { points: -moved }) : t("visibilitySame"),
  ];

  const place = standing(report.scores, brand.id, "visibility");
  const ranked = rankedBrands(report);
  const leader = ranked[0];
  const next = ranked.find((row) => !row.isYou);
  const competition =
    !place || competitors.length === 0 || !leader || !next
      ? t("competitionAlone")
      : place.rank === 1
        ? t("competitionFirst", { of: place.of, next: next.brand.name, nextValue: percent(next.score.visibility) })
        : t("competitionBehind", {
            rank: place.rank,
            of: place.of,
            leader: leader.brand.name,
            leaderValue: percent(leader.score.visibility),
            gap: Math.round((leader.score.visibility - facts.visibility) * 100),
          });

  const without = promptsWithoutYou(report.prompts, brand.id, competitors.map((competitor) => competitor.id)).length;
  const weakest = groupsAgainstLeader(report, (prompt) => prompt.topic)[0];

  const missing = missingSources(report.topSources, competitors);
  const sources =
    facts.listableCitations === 0
      ? [t("sourcesNoneCited")]
      : [
          t("sources", { percent: percent(facts.listedCitations / facts.listableCitations) }),
          missing.length > 0
            ? t("sourcesMissing", {
                count: missing.length,
                sites: missing
                  .slice(0, SITES_NAMED)
                  .map((source) => source.domain)
                  .join(", "),
              })
            : t("sourcesAll"),
        ];

  const accuracy =
    !you || you.sentiment === null
      ? [t("accuracyNotNamed")]
      : [
          t("accuracy", { score: Math.round(you.sentiment), tone: tones(toneOf(you.sentiment)).toLowerCase() }),
          facts.wrongFacts > 0 ? t("accuracyFacts", { count: facts.wrongFacts, penalty: WRONG_FACT_PENALTY }) : t("accuracyClean"),
        ];

  const sentence = (parts: string[]) => parts.filter(Boolean).join(" ");
  return {
    visibility: { finding: sentence(visibility), detail: "" },
    competition: { finding: competition, detail: "" },
    coverage: {
      finding: sentence([t("coverage", { named: facts.questionsNamed, total: facts.questions }), without > 0 ? t("coverageMissing", { count: without }) : t("coverageAll")]),
      // The topic to start with, when a competitor is ahead there
      detail:
        weakest?.leader && weakest.leader.value > weakest.you
          ? t("weakTopic", {
              topic: labelFor(messages.Topics, weakest.key),
              value: percent(weakest.you / 100),
              leader: weakest.leader.name,
              leaderValue: percent(weakest.leader.value / 100),
            })
          : "",
    },
    sources: { finding: sentence(sources), detail: t("ownSite", { own: percent(ownSourceShare(report.prompts, brand.domain)) }) },
    accuracy: { finding: sentence(accuracy), detail: "" },
  };
}
