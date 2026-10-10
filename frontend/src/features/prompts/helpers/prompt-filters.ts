import type { HistoryPoint, Source, SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/** The checks a question's page shows: all of them, or the last eight or four (a check a week). "all" first: FilterMenu takes the first for no filter. */
export const PERIODS = ["all", "8", "4"] as const;
export type Period = (typeof PERIODS)[number];

export type PromptFilters = {
  period: Period;
  /** Competitors to compare with; null = every tracked one. */
  brands: string[] | null;
  /** Kinds of cited sites to count; null = every kind. */
  kinds: SourceType[] | null;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const list = (value: string | string[] | undefined) => {
  const items = (first(value) ?? "").split(",").filter(Boolean);
  return items.length > 0 ? items : null;
};

/** The question page's own filters from its address (`?period=8&brands=b1,b2&kinds=directory`). */
export function parsePromptFilters(params: Record<string, string | string[] | undefined>): PromptFilters {
  return {
    period: PERIODS.find((period) => period === first(params.period)) ?? "all",
    brands: list(params.brands),
    kinds: list(params.kinds) as SourceType[] | null,
  };
}

/** The last checks of the period; the chart and the brands table's change follow them. */
export function inPeriod(history: HistoryPoint[], period: Period): HistoryPoint[] {
  return period === "all" ? history : history.slice(-Number(period));
}

/** The client always stays; competitors only when picked. */
export function shownBrands(brands: SeriesBrand[], picked: string[] | null): SeriesBrand[] {
  return picked ? brands.filter((brand) => brand.isYou || picked.includes(brand.id)) : brands;
}

export function shownSources(sources: Source[], kinds: SourceType[] | null): Source[] {
  return kinds ? sources.filter((source) => kinds.includes(source.type)) : sources;
}
