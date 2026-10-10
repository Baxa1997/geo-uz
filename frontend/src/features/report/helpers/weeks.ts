import type { HistoryPoint, Project, SourceHistoryPoint } from "@/shared/types/api";

/** What a week's row tells: the event, good or bad news for the client (or neither), and its numbers. */
export interface WeekEvent {
  kind: "placeUp" | "placeDown" | "passedYou" | "youPassed" | "factsNew" | "done" | "visibilityUp" | "visibilityDown" | "competitorUp" | "siteNew";
  tone: "good" | "bad" | "neutral";
  values: Record<string, string | number>;
}

/** A visibility change told as an event, in points, and a competitor's. */
const OWN_MOVE = 3;
const RIVAL_MOVE = 5;

const ranking = (point: HistoryPoint) => [...point.scores].sort((a, b) => b.visibility - a.visibility).map((score) => score.brandId);
const points = (point: HistoryPoint | undefined, id: string) => Math.round((point?.scores.find((score) => score.brandId === id)?.visibility ?? 0) * 100);

/**
 * What happened in the week up to a check, the most telling first: the client's place, who passed whom,
 * new wrong facts, actions done, a large move of its visibility or a competitor's, a site cited for the
 * first time. Each archive row tells the first one or two, so a week reads as a sentence.
 */
export function weekEvents(
  index: number,
  { project, history, sourceHistory, factDates, doneDates }: {
    project: Pick<Project, "brand" | "competitors">;
    history: HistoryPoint[];
    sourceHistory: SourceHistoryPoint[];
    factDates: string[];
    doneDates: string[];
  },
): WeekEvent[] {
  const now = history[index];
  const before = history[index - 1];
  if (!now || !before) return [];
  const { brand, competitors } = project;
  const names = new Map([brand, ...competitors].map((tracked) => [tracked.id, tracked.name]));
  const rankNow = ranking(now);
  const rankBefore = ranking(before);
  const placeNow = rankNow.indexOf(brand.id) + 1;
  const placeBefore = rankBefore.indexOf(brand.id) + 1;
  const since = Date.parse(before.collectedAt);
  const until = Date.parse(now.collectedAt);
  const inWeek = (date: string) => Date.parse(date) > since && Date.parse(date) <= until;
  const events: WeekEvent[] = [];

  if (placeNow < placeBefore) events.push({ kind: "placeUp", tone: "good", values: { now: placeNow } });
  if (placeNow > placeBefore) events.push({ kind: "placeDown", tone: "bad", values: { now: placeNow } });
  for (const id of rankNow) {
    if (id === brand.id) continue;
    const ahead = rankNow.indexOf(id) < placeNow - 1;
    const wasAhead = rankBefore.indexOf(id) < placeBefore - 1;
    if (ahead && !wasAhead) events.push({ kind: "passedYou", tone: "bad", values: { name: names.get(id) ?? "" } });
    if (!ahead && wasAhead) events.push({ kind: "youPassed", tone: "good", values: { name: names.get(id) ?? "" } });
  }
  const facts = factDates.filter(inWeek).length;
  if (facts > 0) events.push({ kind: "factsNew", tone: "bad", values: { count: facts } });
  const done = doneDates.filter(inWeek).length;
  if (done > 0) events.push({ kind: "done", tone: "good", values: { count: done } });
  const own = points(now, brand.id) - points(before, brand.id);
  if (own >= OWN_MOVE) events.push({ kind: "visibilityUp", tone: "good", values: { points: own } });
  if (own <= -OWN_MOVE) events.push({ kind: "visibilityDown", tone: "bad", values: { points: -own } });
  const rival = competitors
    .map((competitor) => ({ name: competitor.name, change: points(now, competitor.id) - points(before, competitor.id) }))
    .sort((a, b) => b.change - a.change)[0];
  if (rival && rival.change >= RIVAL_MOVE) events.push({ kind: "competitorUp", tone: "bad", values: { name: rival.name, points: rival.change } });
  // A site no earlier check cited
  const earlier = new Set(sourceHistory.slice(0, index).flatMap((point) => point.sources.map((source) => source.domain)));
  const fresh = sourceHistory[index]?.sources.find((source) => !earlier.has(source.domain));
  if (fresh && index > 0) events.push({ kind: "siteNew", tone: "neutral", values: { site: fresh.domain } });
  return events;
}
