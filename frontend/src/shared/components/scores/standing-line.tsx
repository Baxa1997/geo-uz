import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/shared/helpers/numbers";
import { byMetric, lowerIsBetter, metricUnit, metricValue, scoreOf } from "@/shared/helpers/scores";
import type { HistoryPoint } from "@/shared/types/api";
import type { Metric, SeriesBrand } from "@/shared/types/scores";

/**
 * Where the client stands on a metric in the latest run, in words: its place among the tracked brands,
 * its number, who leads (or who follows, when the client leads), and how its number moved in a week.
 * The takeaway of a card opened large.
 */
export function StandingLine({ history, brands, metric }: { history: HistoryPoint[]; brands: SeriesBrand[]; metric: Metric }) {
  const t = useTranslations("Standing");
  const names = useTranslations("MetricChart.metrics");
  const locale = useLocale();
  const latest = history.at(-1)?.scores ?? [];
  const previous = history.at(-2)?.scores;
  const you = brands.find((brand) => brand.isYou);
  const text = (value: number) => `${metric === "position" ? "#" : ""}${formatDecimal(value, locale)}${metricUnit(metric)}`;

  // Brands with a number, best first. Compared as shown, to one decimal: two brands at "#1,8" share a place
  const ranked = brands
    .flatMap((brand) => {
      const value = metricValue(scoreOf(latest, brand.id), metric);
      return value === null ? [] : [{ brand, value: Math.round(value * 10) / 10, exact: value }];
    })
    .sort((a, b) => byMetric(a.value, b.value, metric));
  const leader = ranked[0];
  if (!leader) return <p>{t("nobody")}</p>;

  const name = names(metric);
  const own = ranked.find(({ brand }) => brand.id === you?.id);
  if (!own) return <p>{t("unnamed", { metric: name, leader: leader.brand.name, leaderValue: text(leader.value) })}</p>;

  const rank = ranked.filter(({ value }) => byMetric(value, own.value, metric) < 0).length + 1;
  const next = ranked.find(({ brand }) => brand.id !== own.brand.id);
  const before = previous ? metricValue(scoreOf(previous, own.brand.id), metric) : null;
  const change = before === null ? null : own.exact - before;
  const amount = change === null ? null : formatDecimal(Math.abs(change), locale);

  return (
    <>
      <p>
        {rank > 1
          ? t("behind", {
              metric: name,
              rank,
              of: brands.length,
              value: text(own.value),
              leader: leader.brand.name,
              leaderValue: text(leader.value),
            })
          : next
            ? t("first", { metric: name, of: brands.length, value: text(own.value), next: next.brand.name, nextValue: text(next.value) })
            : t("only", { metric: name, value: text(own.value) })}
      </p>
      {change !== null && amount !== null && (
        <p className="text-muted-foreground">
          {amount === "0" ? t("same") : t((lowerIsBetter(metric) ? change < 0 : change > 0) ? "better" : "worse", { amount })}
        </p>
      )}
    </>
  );
}
