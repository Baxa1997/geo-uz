"use client";

import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, CircleCheck, Minus, Plus, TriangleAlert, type LucideIcon } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { CsvButton } from "@/shared/components/csv-button";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatIsoDay, formatLongDate } from "@/shared/helpers/dates";
import { formatPercent } from "@/shared/helpers/numbers";
import { seriesBrands, toneOf } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { HistoryPoint, Project, SourceHistoryPoint, Tone } from "@/shared/types/api";
import { weekEvents, type WeekEvent } from "../helpers/weeks";

const TONE_DOTS: Record<Tone, string> = { positive: "bg-positive", neutral: "bg-muted-foreground/60", negative: "bg-negative" };

/** How each kind of event is marked in a row: its way, colored by what it means for the client. */
const EVENT_ICONS: Record<WeekEvent["kind"], LucideIcon> = {
  placeUp: ArrowUp,
  placeDown: ArrowDown,
  passedYou: ArrowDown,
  youPassed: ArrowUp,
  factsNew: TriangleAlert,
  done: CircleCheck,
  visibilityUp: ArrowUp,
  visibilityDown: ArrowDown,
  competitorUp: ArrowUp,
  siteNew: Plus,
};
const EVENT_COLORS: Record<WeekEvent["tone"], string> = { good: "text-better", bad: "text-worse", neutral: "text-muted-foreground" };
/** A row tells at most this many of its week's events. */
const EVENTS_SHOWN = 2;

/** A change in points since the report before: an arrow and its size, green when better, red when worse. */
function Change({ points, label }: { points: number | null; label: string }) {
  if (points === null || points === 0) return null;
  const better = points > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", better ? "text-better" : "text-worse")}>
      {better ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />}
      <span aria-hidden>{Math.abs(points)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Every weekly report, the latest first, as a history of the client's week: the check's date, its
 * visibility (a bar and the change from the report before), share of voice, place and tone, then what
 * happened that week in a sentence or two (its place, who passed whom, new wrong facts, actions done, large
 * moves, a new site). A row opens its report; the table downloads as CSV, the leader and counts included.
 */
export function ReportsArchive({
  project,
  history,
  sourceHistory,
  factDates,
  doneDates,
  base,
  filename,
}: {
  project: Pick<Project, "brand" | "competitors">;
  /** The checks, oldest first (`Report.history`). */
  history: HistoryPoint[];
  /** The cited sites over the same checks. */
  sourceHistory: SourceHistoryPoint[];
  /** When each wrong fact was first found. */
  factDates: string[];
  /** When each action done was marked done. */
  doneDates: string[];
  /** Hisobotlar's address: a report is under it by its run's id. */
  base: string;
  filename: string;
}) {
  const t = useTranslations("Reports.archive");
  const tones = useTranslations("Tone");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { brand } = project;
  const brands = seriesBrands(project);
  const points = (value: number) => Math.round(value * 100);
  const href = (runId: string) => `${base}/${encodeURIComponent(runId)}`;
  const top = Math.max(0.01, ...history.flatMap((point) => point.scores.filter((score) => score.brandId === brand.id).map((score) => score.visibility)));

  const rows = history
    .map((point, index) => {
      const before = history[index - 1];
      const you = point.scores.find((score) => score.brandId === brand.id);
      const youBefore = before?.scores.find((score) => score.brandId === brand.id);
      const ranked = [...point.scores].sort((a, b) => b.visibility - a.visibility);
      const leader = ranked[0] && ranked[0].visibility > 0 ? brands.find((candidate) => candidate.id === ranked[0]?.brandId) : undefined;
      const since = before ? Date.parse(before.collectedAt) : -Infinity;
      const until = Date.parse(point.collectedAt);
      return {
        point,
        latest: index === history.length - 1,
        first: index === 0,
        visibility: you?.visibility ?? 0,
        visibilityChange: youBefore && you ? points(you.visibility) - points(youBefore.visibility) : null,
        shareOfVoice: you?.shareOfVoice ?? 0,
        shareChange: youBefore && you ? points(you.shareOfVoice) - points(youBefore.shareOfVoice) : null,
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
    [t("csv.date"), t("csv.visibility"), t("csv.shareOfVoice"), t("csv.place"), t("csv.tone"), t("csv.leader"), t("csv.facts"), t("csv.done")],
    ...rows.map((row) => [
      formatIsoDay(row.point.collectedAt, timeZone),
      points(row.visibility),
      points(row.shareOfVoice),
      `${row.place}/${row.of}`,
      row.sentiment,
      row.leader?.name ?? null,
      row.facts,
      row.done,
    ]),
  ];

  const heading = (key: "report" | "visibility" | "shareOfVoice" | "place" | "tone" | "events", className?: string) => (
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
        <table className="w-full min-w-[60rem] text-sm">
          <thead>
            <tr className="border-b bg-muted text-left text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-normal [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
              {heading("report", "w-64")}
              {heading("visibility", "w-44")}
              {heading("shareOfVoice", "w-28 text-right")}
              {heading("place", "w-20 text-right")}
              {heading("tone", "w-20 text-right")}
              {heading("events")}
              <th scope="col" className="w-10">
                <span className="sr-only">{t("open")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <LinkRow
                key={row.point.runId}
                href={href(row.point.runId)}
                className={cn("group transition-colors [&>td]:px-3 [&>td]:py-3.5 [&>td:first-child]:pl-4 [&>td:last-child]:pr-4", row.latest ? "bg-you-soft/25 hover:bg-you-soft/40" : "hover:bg-muted/60")}
              >
                <td>
                  <span className="flex items-center gap-3">
                    <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", row.latest ? "bg-you text-white" : "bg-muted text-muted-foreground")}>
                      <CalendarDays className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <Link href={href(row.point.runId)} className="font-medium underline-offset-4 outline-none hover:underline focus-visible:underline">
                        {formatLongDate(row.point.collectedAt, locale, timeZone)}
                      </Link>
                      <span className="text-xs text-muted-foreground">{row.latest ? t("latest") : row.first ? t("firstReport") : t("weekly")}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="flex items-center gap-2.5">
                    {/* Visibility as a bar, so the weeks compare at a glance */}
                    <span aria-hidden className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-you" style={{ width: `${Math.round((row.visibility / top) * 100)}%` }} />
                    </span>
                    <span className="font-medium tabular-nums">{formatPercent(row.visibility, locale)}</span>
                    <Change points={row.visibilityChange} label={t("change", { points: row.visibilityChange ?? 0 })} />
                  </span>
                </td>
                <td className="text-right">
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="tabular-nums">{formatPercent(row.shareOfVoice, locale)}</span>
                    <Change points={row.shareChange} label={t("change", { points: row.shareChange ?? 0 })} />
                  </span>
                </td>
                <td className="text-right font-medium tabular-nums">{t("placeValue", { place: row.place, of: row.of })}</td>
                <td className="text-right">
                  {row.sentiment === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <span aria-hidden className={cn("size-2 rounded-full", TONE_DOTS[toneOf(row.sentiment)])} />
                      {row.sentiment}
                      <span className="sr-only">{tones(toneOf(row.sentiment))}</span>
                    </span>
                  )}
                </td>
                <td>
                  {row.events.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Minus aria-hidden className="size-3.5" />
                      {t(row.first ? "events.first" : "events.quiet")}
                    </span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {row.events.map((event) => {
                        const Icon = EVENT_ICONS[event.kind];
                        return (
                          <li key={`${event.kind}-${JSON.stringify(event.values)}`} className="flex items-start gap-1.5">
                            <Icon aria-hidden className={cn("mt-0.5 size-3.5 shrink-0", EVENT_COLORS[event.tone])} />
                            <span className="text-pretty">{t(`events.${event.kind}`, event.values)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                <td className="text-right">
                  <ArrowRight aria-hidden className="ml-auto size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </td>
              </LinkRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
