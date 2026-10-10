"use client";

import { ArrowDown, ArrowRight, ArrowUp, FileDown, Minus } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { CsvButton } from "@/shared/components/csv-button";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { CONDITION_AREAS, conditionStatus } from "@/shared/helpers/condition";
import { formatIsoDay, formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { seriesBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Condition, HistoryPoint, Project, SourceHistoryPoint } from "@/shared/types/api";
import { STATUS_FILL } from "../constants";
import { weekEvents } from "../helpers/weeks";
import { StatusChip } from "./report-parts";
import { WeekEventLine } from "./week-event";

/** A row tells at most this many of its week's events. */
const EVENTS_SHOWN = 2;

/**
 * Every weekly report as a document in a register, the latest first: its number, the period it covers, the
 * condition it found (the score, its status and its change from the report before), the five areas as
 * marks, what happened that week in a sentence or two, and its PDF. A row opens its report; the register
 * downloads as CSV, with every area's score and the week's main numbers.
 */
export function ReportsArchive({
  project,
  history,
  conditionHistory,
  sourceHistory,
  factDates,
  doneDates,
  base,
  shared,
  filename,
}: {
  project: Pick<Project, "brand" | "competitors">;
  /** The checks, oldest first (`Report.history`), and the condition after each. */
  history: HistoryPoint[];
  conditionHistory: Condition[];
  /** The cited sites over the same checks. */
  sourceHistory: SourceHistoryPoint[];
  /** When each wrong fact was first found. */
  factDates: string[];
  /** When each action done was marked done. */
  doneDates: string[];
  /** Hisobotlar's address: a report is under it by its run's id. */
  base: string;
  /** The shared report's address: `?run=` opens a week's, `&print=1` its print window. */
  shared: string;
  filename: string;
}) {
  const t = useTranslations("Reports.archive");
  const report = useTranslations("Report");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { brand } = project;
  const brands = seriesBrands(project);
  const points = (value: number) => Math.round(value * 100);
  const href = (runId: string) => `${base}/${encodeURIComponent(runId)}`;

  const rows = history
    .map((point, index) => {
      const before = history[index - 1];
      const you = point.scores.find((score) => score.brandId === brand.id);
      const ranked = [...point.scores].sort((a, b) => b.visibility - a.visibility);
      const leader = ranked[0] && ranked[0].visibility > 0 ? brands.find((candidate) => candidate.id === ranked[0]?.brandId) : undefined;
      const since = before ? Date.parse(before.collectedAt) : -Infinity;
      const until = Date.parse(point.collectedAt);
      const condition = conditionHistory[index];
      const conditionBefore = conditionHistory[index - 1];
      return {
        point,
        number: index + 1,
        from: before?.collectedAt,
        latest: index === history.length - 1,
        first: index === 0,
        condition,
        change: condition && conditionBefore ? condition.score - conditionBefore.score : null,
        visibility: you?.visibility ?? 0,
        shareOfVoice: you?.shareOfVoice ?? 0,
        place: ranked.findIndex((score) => score.brandId === brand.id) + 1,
        of: ranked.length,
        sentiment: you?.sentiment ?? null,
        leader,
        facts: factDates.filter((date) => Date.parse(date) <= until).length,
        done: doneDates.filter((date) => Date.parse(date) > since && Date.parse(date) <= until).length,
        events: weekEvents(index, { project, history, sourceHistory, factDates, doneDates }).slice(0, EVENTS_SHOWN),
      };
    })
    .reverse();

  const csvRows = () => [
    [
      t("csv.number"),
      t("csv.date"),
      t("csv.condition"),
      t("csv.status"),
      ...CONDITION_AREAS.map((area) => report(`areas.${area}`)),
      t("csv.visibility"),
      t("csv.shareOfVoice"),
      t("csv.place"),
      t("csv.tone"),
      t("csv.leader"),
      t("csv.facts"),
      t("csv.done"),
    ],
    ...rows.map((row) => [
      row.number,
      formatIsoDay(row.point.collectedAt, timeZone),
      row.condition?.score ?? null,
      row.condition ? report(`status.${conditionStatus(row.condition.score)}`) : null,
      ...CONDITION_AREAS.map((area) => row.condition?.areas[area] ?? null),
      points(row.visibility),
      points(row.shareOfVoice),
      `${row.place}/${row.of}`,
      row.sentiment,
      row.leader?.name ?? null,
      row.facts,
      row.done,
    ]),
  ];

  const heading = (key: "number" | "period" | "condition" | "areas" | "events", className?: string) => (
    <th scope="col" className={className}>
      <Hint text={t(`hints.${key}`)}>{t(`columns.${key}`)}</Hint>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-sm">
        <p className="text-muted-foreground">{t("count", { count: rows.length })}</p>
        <CsvButton filename={filename} label={t("csvLabel")} hint={t("csvHint")} rows={csvRows} />
      </div>
      <div className="relative min-w-0 overflow-x-auto">
        <table className="w-full min-w-232 text-sm">
          <thead>
            <tr className="border-b bg-muted text-left text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-normal [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
              {heading("number", "w-16")}
              {heading("period", "w-56")}
              {heading("condition", "w-60")}
              {heading("areas", "w-36")}
              {heading("events")}
              <th scope="col" className="w-12">
                <span className="sr-only">{t("pdf")}</span>
              </th>
              <th scope="col" className="w-10">
                <span className="sr-only">{t("open")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const Arrow = row.change === null || row.change === 0 ? Minus : row.change > 0 ? ArrowUp : ArrowDown;
              return (
                <LinkRow
                  key={row.point.runId}
                  href={href(row.point.runId)}
                  className={cn("group transition-colors [&>td]:px-3 [&>td]:py-3.5 [&>td:first-child]:pl-4 [&>td:last-child]:pr-4", row.latest ? "bg-you-soft/25 hover:bg-you-soft/40" : "hover:bg-muted/60")}
                >
                  <td className="font-medium whitespace-nowrap text-muted-foreground tabular-nums">{report("number", { number: row.number })}</td>
                  <td>
                    <span className="flex min-w-0 flex-col">
                      <Link href={href(row.point.runId)} className="font-medium underline-offset-4 outline-none hover:underline focus-visible:underline">
                        {row.from
                          ? report("meta.periodRange", { from: formatShortDate(row.from, locale, timeZone), to: formatLongDate(row.point.collectedAt, locale, timeZone) })
                          : formatLongDate(row.point.collectedAt, locale, timeZone)}
                      </Link>
                      <span className="text-xs text-muted-foreground">{row.latest ? t("latest") : row.first ? t("firstReport") : t("weekly")}</span>
                    </span>
                  </td>
                  <td>
                    {row.condition ? (
                      <span className="flex items-center gap-2.5">
                        <span className="flex items-baseline gap-0.5">
                          <span className="text-base font-semibold tabular-nums">{row.condition.score}</span>
                          <span className="text-xs text-muted-foreground">/100</span>
                        </span>
                        <StatusChip score={row.condition.score} />
                        {row.change !== null && row.change !== 0 && (
                          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", row.change > 0 ? "text-better" : "text-worse")}>
                            <Arrow aria-hidden className="size-3" />
                            <span aria-hidden>{Math.abs(row.change)}</span>
                            <span className="sr-only">{t("change", { points: row.change })}</span>
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    {row.condition && (
                      <span className="flex items-center gap-1.5">
                        {CONDITION_AREAS.map((area) => {
                          const score = row.condition?.areas[area] ?? 0;
                          const text = t("area", { area: report(`areas.${area}`), score, status: report(`status.${conditionStatus(score)}`) });
                          return (
                            <Hint key={area} text={text} focusable={false} described={false}>
                              <span aria-hidden className={cn("block size-3 rounded-[3px]", STATUS_FILL[conditionStatus(score)])} />
                              <span className="sr-only">{text}</span>
                            </Hint>
                          );
                        })}
                      </span>
                    )}
                  </td>
                  <td>
                    {row.events.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Minus aria-hidden className="size-3.5" />
                        {t(row.first ? "eventsFirst" : "eventsQuiet")}
                      </span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {row.events.map((event) => (
                          <li key={`${event.kind}-${JSON.stringify(event.values)}`}>
                            <WeekEventLine event={event} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <Hint text={t("pdfHint")} described={false}>
                      {() => (
                        <a
                          href={`${shared}?run=${encodeURIComponent(row.point.runId)}&print=1`}
                          target="_blank"
                          rel="noopener"
                          aria-label={t("pdfOf", { number: row.number })}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8 text-muted-foreground hover:text-foreground")}
                        >
                          <FileDown aria-hidden />
                        </a>
                      )}
                    </Hint>
                  </td>
                  <td className="text-right">
                    <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </td>
                </LinkRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
