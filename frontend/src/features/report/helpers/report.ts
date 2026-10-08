import { normalizeDomain } from "@/shared/helpers/domain";
import { byMetric, metricValue, scoreOf, sliceShare, slicesBy, totalAnswers } from "@/shared/helpers/scores";
import type { Action, Prompt, Report } from "@/shared/types/api";
import type { Metric } from "@/shared/types/scores";

/** The competitor that does best on a metric, with its value as shown; null when none is tracked or named. */
export function bestCompetitor({ project, scores }: Pick<Report, "project" | "scores">, metric: Metric): { name: string; value: number } | null {
  return (
    project.competitors
      .flatMap((competitor) => {
        const value = metricValue(scoreOf(scores, competitor.id), metric);
        return value === null ? [] : [{ name: competitor.name, value }];
      })
      .sort((a, b) => byMetric(a.value, b.value, metric))[0] ?? null
  );
}

/** The competitor whose own website the answers cite most, with the share of answers in whole percent. */
export function bestCompetitorSite(report: Pick<Report, "project" | "topSources" | "prompts">): { name: string; value: number } | null {
  const total = totalAnswers(report.prompts);
  if (total === 0) return null;
  return (
    report.project.competitors
      .flatMap((competitor) => {
        const source = report.topSources.find((candidate) => candidate.domain === normalizeDomain(competitor.domain));
        return source ? [{ name: competitor.name, value: Math.round((source.count / total) * 100) }] : [];
      })
      .sort((a, b) => b.value - a.value)[0] ?? null
  );
}

/** A group of questions (a topic, a language): the client's visibility there against the strongest competitor's. */
export interface GroupRow {
  key: string;
  prompts: number;
  /** Visibility in whole percent. */
  you: number;
  /** The competitor named most in the group; null when no competitor is tracked. */
  leader: { name: string; value: number } | null;
}

/** The questions grouped by `keyOf`, the groups where the client trails most first. */
export function groupsAgainstLeader(report: Pick<Report, "project" | "prompts">, keyOf: (prompt: Prompt) => string): GroupRow[] {
  const { brand, competitors } = report.project;
  const gap = (row: GroupRow) => row.you - (row.leader?.value ?? 0);
  return slicesBy(report.prompts, keyOf, [brand.id, ...competitors.map((competitor) => competitor.id)])
    .map((slice) => ({
      key: slice.key,
      prompts: slice.prompts,
      you: Math.round(sliceShare(slice, brand.id) * 100),
      leader:
        competitors
          .map((competitor) => ({ name: competitor.name, value: Math.round(sliceShare(slice, competitor.id) * 100) }))
          .sort((a, b) => b.value - a.value)[0] ?? null,
    }))
    .sort((a, b) => gap(a) - gap(b));
}

/** What is still to do, in the backend's order: the most effective first. */
export const openActions = (actions: Action[]) => actions.filter((action) => action.status === "new" || action.status === "in_progress");
