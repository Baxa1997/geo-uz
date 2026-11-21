"use client";

import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { MinusIcon as Minus } from "@phosphor-icons/react/dist/ssr/Minus";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { CsvButton } from "@/shared/components/csv-button";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatIsoDay, formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { seriesBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { HistoryPoint, Project, SourceHistoryPoint } from "@/shared/types/api";
import { weekEvents } from "../helpers/weeks";
import { WeekEventLine } from "./week-event";
import { PdfButton } from "./pdf-button";
import { useCountWords } from "@/shared/hooks/use-count-words";

/** A row tells at most this many of its week's events. */
const EVENTS_SHOWN = 2;

/**
 * Every weekly report as a document in a register, the latest first: its number, the period it covers, the
 * answers that named the client out of that check's answers with who was named most (every brand that ties),
 * what happened that week in a sentence or two, and its PDF. A row opens its report; the register downloads
 * as CSV with the same counts. No score since 21 Nov 2026 (report spec Phase 0 item 0.2).
 */
export function ReportsArchive({
  project,
  history,
  sourceHistory,
  factDates,
  doneDates,
  base,
  shared,
  projectId,
  filename,
}: {
  project: Pick<Project, "brand" | "competitors">;
  /** The checks, oldest first (`Report.history`), each with its answers and those naming the client. */
  history: HistoryPoint[];
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
  /** For each report's PDF. */
  projectId: string;
  filename: string;
}) {
  const t = useTranslations("Reports.archive");
  const report = useTranslations("Report");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const brands = seriesBrands(project);
  const words = useCountWords();
  const href = (runId: string) => `${base}/${encodeURIComponent(runId)}`;

  const rows = history
    .map((point, index) => {
      const before = history[index - 1];
      // Who was named most that check: every brand at the top count (visibility is a share of the same answers)
      const top = Math.max(0, ...point.scores.map((score) => score.visibility));
      const leaders = top > 0 ? point.scores.filter((score) => score.visibility === top).flatMap((score) => brands.filter((candidate) => candidate.id === score.brandId)) : [];
      const since = before ? Date.parse(before.collectedAt) : -Infinity;
      const until = Date.parse(point.collectedAt);
      return {
        point,
        number: index + 1,
        from: before?.collectedAt,
        latest: index === history.length - 1,
        first: index === 0,
        leaders,
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
      t("csv.named"),
      t("csv.answers"),
      t("csv.leader"),
      t("csv.facts"),
      t("csv.done"),
    ],
    ...rows.map((row) => [
      row.number,
      formatIsoDay(row.point.collectedAt, timeZone),
      row.point.named,
      row.point.answers,
      row.leaders.map((leader) => leader.name).join(", ") || null,
      row.facts,
      row.done,
    ]),
  ];

  const heading = (key: "number" | "period" | "named" | "events", className?: string) => (
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
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className="border-b bg-muted text-left text-muted-foreground [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-normal [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
              {heading("number", "w-16")}
              {heading("period", "w-56")}
              {heading("named", "w-64")}
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
                    <span className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold tabular-nums">
                        {row.point.named}/{row.point.answers}
                        <span className="sr-only"> {t("namedOf", { named: row.point.named, answers: row.point.answers })}</span>
                      </span>
                      <span className="text-xs text-pretty text-muted-foreground">
                        {row.leaders.length === 0
                          ? t("nobodyNamed")
                          : t(row.leaders.length > 1 ? "namedMostTied" : "namedMost", { names: words.names(row.leaders.map((leader) => leader.name)) })}
                      </span>
                    </span>
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
                    <PdfButton
                      compact
                      variant="ghost"
                      projectId={projectId}
                      runId={row.point.runId}
                      printHref={`${shared}?run=${encodeURIComponent(row.point.runId)}&print=1`}
                      className="size-8 text-muted-foreground hover:text-foreground"
                    />
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
