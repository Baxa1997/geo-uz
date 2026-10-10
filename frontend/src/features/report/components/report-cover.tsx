import { ArrowDown, ArrowRight, ArrowUp, Minus } from "lucide-react";
import { useId } from "react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { engineOf, TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { formatPercent } from "@/shared/helpers/numbers";
import { outOfTen, scoreOf, topCompetitor, totalAnswers } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Report } from "@/shared/types/api";
import { REPORT_SECTIONS } from "../constants";
import { TrendSpark } from "./trend-spark";

/**
 * A weekly report's cover, the first thing its reader sees: the week and the brand, the week's message as
 * a headline, the client's visibility large with its change and its line over the checks, then the way
 * in. In Hisobotlar ("landing") it also says the week in a sentence and opens the report; on the report's
 * own page ("page") it says how much was asked, of which assistant. `share` sits at its top right.
 */
export function ReportCover({
  report,
  variant,
  openHref,
  share,
}: {
  report: Report;
  variant: "landing" | "page";
  /** The report's page, for the landing's button. */
  openHref?: string;
  share?: React.ReactNode;
}) {
  const t = useTranslations("Reports.cover");
  const headline = useTranslations("Headline");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const id = useId();
  const { brand, competitors } = report.project;
  const now = report.history.at(-1);
  const before = report.history.at(-2);
  const visibilityOf = (point: (typeof report.history)[number] | undefined) => point?.scores.find((score) => score.brandId === brand.id)?.visibility ?? 0;
  const series = report.history.map(visibilityOf);
  const value = scoreOf(report.scores, brand.id)?.visibility ?? visibilityOf(now);
  const change = before ? Math.round(value * 100) - Math.round(visibilityOf(before) * 100) : null;
  const state = change === null ? "first" : change > 0 ? "up" : change < 0 ? "down" : "steady";
  const rival = topCompetitor(competitors, report.scores);
  const issued = formatLongDate(report.method.collectedAt, locale, timeZone);
  const Icon = state === "up" ? ArrowUp : state === "down" ? ArrowDown : Minus;

  return (
    <section aria-labelledby={id} data-tour="cover" className="@container relative overflow-hidden rounded-2xl bg-foreground text-background shadow-sm">
      {/* A glow of the client's color from the top right corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_120%_at_100%_0%,color-mix(in_oklab,var(--you)_40%,transparent),transparent_62%)]"
      />
      <div className="relative flex flex-col gap-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-background/60 uppercase">
            {t("kicker")} · {before ? t("period", { from: formatShortDate(before.collectedAt, locale, timeZone), to: issued }) : issued}
          </p>
          {share}
        </div>

        <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] @3xl:items-end @3xl:gap-10">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="text-sm font-medium text-background/70">{brand.name}</p>
            <h2 id={id} className="text-3xl leading-[1.15] font-semibold tracking-tight text-balance @xl:text-4xl">
              {t(`headline.${state}`)}
            </h2>
            {variant === "landing" && (
              <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-pretty text-background/80">
                {rival
                  ? headline("summary", {
                      you: outOfTen(value),
                      percent: formatPercent(value, locale),
                      competitor: rival.brand.name,
                      them: outOfTen(rival.score.visibility),
                    })
                  : headline("summaryAlone", { you: outOfTen(value), percent: formatPercent(value, locale) })}
              </p>
            )}
            {variant === "page" && (
              <p className="text-sm text-background/70">
                {t("scope", { prompts: report.prompts.length, answers: totalAnswers(report.prompts), engine: engines(engineOf(report.method.engine)) })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-background/[0.06] p-4 ring-1 ring-background/10">
            <div className="flex items-end justify-between gap-3">
              <span className="pb-1 text-sm text-background/70">{t("visibility")}</span>
              <span className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatPercent(value, locale)}</span>
                {change !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums",
                      state === "up" ? "bg-positive/20 text-positive" : state === "down" ? "bg-negative/20 text-negative" : "bg-background/10 text-background/70",
                    )}
                  >
                    <Icon aria-hidden className="size-3.5" />
                    <span aria-hidden>{Math.abs(change)}</span>
                    <span className="sr-only">{t(state === "up" ? "change.up" : state === "down" ? "change.down" : "change.steady", { points: Math.abs(change) })}</span>
                  </span>
                )}
              </span>
            </div>
            {series.length > 1 && (
              <>
                <TrendSpark
                  values={series}
                  className="mt-1 text-foreground"
                  label={t("chart", { weeks: series.length, from: formatPercent(series[0] ?? 0, locale), to: formatPercent(value, locale) })}
                />
                <div className="flex justify-between text-xs text-background/55 tabular-nums">
                  <span>{formatShortDate(report.history[0]?.collectedAt ?? report.method.collectedAt, locale, timeZone)}</span>
                  <span>{t("weeks", { count: series.length })}</span>
                  <span>{formatShortDate(report.method.collectedAt, locale, timeZone)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {variant === "landing" && openHref && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={openHref} className={cn(buttonVariants({ size: "lg" }), "h-11 bg-background px-5 text-[0.9375rem] text-foreground hover:bg-background/90")}>
              {t("open")}
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
            <span className="text-sm text-background/60">{t("openNote", { sections: REPORT_SECTIONS.length })}</span>
          </div>
        )}
      </div>
    </section>
  );
}
