// Presentation helpers for the report. Scores themselves come from the backend.
import type {
  Brand,
  BrandScore,
  HistoryPoint,
  Project,
  PromptResult,
  Report,
  Source,
  SourceType,
  Tone,
} from "@/shared/types/api";
import type { Metric, NamedBrand, SeriesBrand } from "@/shared/types/scores";

export const METRICS: Metric[] = ["visibility", "shareOfVoice", "sentiment", "position"];

type Scored = Omit<BrandScore, "trend">;

/** Visibility (0–1) as "named in N of 10 answers", for sentences. */
export const outOfTen = (visibility: number) => Math.round(visibility * 10);

/** Visibility (0–1) as the headline score out of 100. */
export const outOf100 = (visibility: number) => Math.round(visibility * 100);

export function scoreOf<T extends { brandId: string }>(scores: T[], brandId: string): T | undefined {
  return scores.find((score) => score.brandId === brandId);
}

/** Every tracked brand with its scores, highest visibility first. */
export function rankedBrands({ project, scores }: Pick<Report, "project" | "scores">) {
  return [project.brand, ...project.competitors]
    .flatMap((brand) => {
      const score = scoreOf(scores, brand.id);
      return score ? [{ brand, score, isYou: brand.id === project.brand.id }] : [];
    })
    .sort((a, b) => b.score.visibility - a.score.visibility);
}

/** The competitor with the highest visibility. */
export function topCompetitor(
  competitors: Brand[],
  scores: BrandScore[],
): { brand: Brand; score: BrandScore } | undefined {
  return competitors
    .flatMap((brand) => {
      const score = scoreOf(scores, brand.id);
      return score ? [{ brand, score }] : [];
    })
    .sort((a, b) => b.score.visibility - a.score.visibility)[0];
}

/** Sources the brand could get listed on: not listed yet, and not a competitor's own website. */
export function missingSources(sources: Source[], competitors: Brand[]): Source[] {
  const competitorDomains = new Set(competitors.map((brand) => brand.domain));
  return sources.filter((source) => !source.brandListed && !competitorDomains.has(source.domain));
}

export function answersNaming(result: PromptResult, brandId: string): number {
  return result.answers.filter((a) => a.mentions.some((m) => m.brandId === brandId)).length;
}

/** Prompts whose answers name at least one of `rivalIds` but never the client. */
export function promptsWithoutYou(results: PromptResult[], youId: string, rivalIds: string[]): PromptResult[] {
  return results.filter(
    (result) => answersNaming(result, youId) === 0 && rivalIds.some((id) => answersNaming(result, id) > 0),
  );
}

/** Tracked brands named in a prompt's answers: the client first, then by how often they were named. */
export function namedBrands(result: PromptResult, brands: Brand[], youId: string): NamedBrand[] {
  return brands
    .map((brand) => ({
      brand,
      tones: result.answers.flatMap((a) =>
        a.mentions.filter((m) => m.brandId === brand.id).map((m) => m.tone),
      ),
    }))
    .filter((named) => named.tones.length > 0)
    .sort(
      (a, b) =>
        Number(b.brand.id === youId) - Number(a.brand.id === youId) ||
        b.tones.length - a.tones.length,
    );
}

/**
 * A brand's value on a metric as it is shown: visibility as a score out of 100, share of voice in
 * percent, tone 0–100, mean position. Null if it was never named.
 */
export function metricValue(score: Scored | undefined, metric: Metric): number | null {
  if (!score) return null;
  if (metric === "visibility") return outOf100(score.visibility);
  if (metric === "shareOfVoice") return outOf100(score.shareOfVoice);
  return metric === "sentiment" ? score.sentiment : score.avgPosition;
}

/** Share of voice is the one metric shown with a percent sign. */
export const metricUnit = (metric: Metric) => (metric === "shareOfVoice" ? "%" : "");

/**
 * The client's numbers in the latest run, each with its change since the run before (null on a first
 * run or when it wasn't named then). For the row of numbers at the top of the Overview.
 */
export function headlineMetrics(history: HistoryPoint[], brandId: string): { metric: Metric; value: number | null; change: number | null }[] {
  const latest = history.at(-1)?.scores ?? [];
  const previous = history.at(-2)?.scores;
  return METRICS.map((metric) => {
    const value = metricValue(scoreOf(latest, brandId), metric);
    const before = previous ? metricValue(scoreOf(previous, brandId), metric) : null;
    return { metric, value, change: value !== null && before !== null ? value - before : null };
  });
}

/** Share of answers (0–1) citing the client's own website: how much ChatGPT uses it as a source. */
export function ownSourceShare(results: PromptResult[], domain: string): number {
  const answers = results.flatMap((result) => result.answers);
  const citing = answers.filter((answer) => answer.citations.some((citation) => citation.domain === domain)).length;
  return answers.length ? citing / answers.length : 0;
}

/** Position is the one metric where the smaller number is the better one. */
export const lowerIsBetter = (metric: Metric) => metric === "position";

/** Sorts values best first; brands without a value go last. */
export function byMetric(a: number | null, b: number | null, metric: Metric): number {
  if (a === null || b === null) return Number(a === null) - Number(b === null);
  return lowerIsBetter(metric) ? a - b : b - a;
}

/** The brand's place among the tracked brands on a metric, e.g. 3 of 4. Null if it has no value. */
export function standing(scores: Scored[], brandId: string, metric: Metric): { rank: number; of: number } | null {
  const own = metricValue(scoreOf(scores, brandId), metric);
  if (own === null) return null;
  const better = scores.filter((score) => byMetric(metricValue(score, metric), own, metric) < 0).length;
  return { rank: better + 1, of: scores.length };
}

/** The run before the latest one; undefined on a first run. */
export const previousRun = (history: HistoryPoint[]): HistoryPoint | undefined => history.at(-2);

/** Sentiment (0–100) as one of the three tones, for the icon beside the number. */
export const toneOf = (sentiment: number): Tone => (sentiment >= 67 ? "positive" : sentiment <= 33 ? "negative" : "neutral");

const SERIES_COLORS = [2, 3, 4, 5, 6].map((slot) => `var(--series-${slot})`);

/**
 * Every tracked brand with its color: the client always takes the first, competitors follow in
 * the project's order, so a brand keeps its color whatever its rank. Past the palette, gray.
 */
export function seriesBrands({ brand, competitors }: Pick<Project, "brand" | "competitors">): SeriesBrand[] {
  return [
    { id: brand.id, name: brand.name, isYou: true, color: "var(--series-1)" },
    ...competitors.map((competitor, index) => ({
      id: competitor.id,
      name: competitor.name,
      isYou: false,
      color: SERIES_COLORS[index] ?? "var(--rival-strong)",
    })),
  ];
}

/** Kinds of cited sites in a fixed order, so a kind keeps its place and neighbours in every chart. */
export const SOURCE_TYPE_ORDER: SourceType[] = ["own", "competitor", "directory", "news", "social", "other"];

/** Each kind's share of all citations; kinds nobody cited are left out. */
export function sourceTypeShares(sources: Source[]): { type: SourceType; share: number }[] {
  const total = sources.reduce((sum, source) => sum + source.count, 0);
  return SOURCE_TYPE_ORDER.map((type) => ({
    type,
    share: total ? sources.filter((source) => source.type === type).reduce((sum, source) => sum + source.count, 0) / total : 0,
  })).filter(({ share }) => share > 0);
}

/** All answers of a report: what "share of answers" is counted against. */
export const totalAnswers = (results: PromptResult[]) => results.reduce((sum, result) => sum + result.answers.length, 0);
