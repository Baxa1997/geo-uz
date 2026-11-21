import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { mockWave } from "@/mocks/wave";
import { Wordmark } from "@/shared/components/logo";
import { TIME_ZONE } from "@/shared/constants";
import { REPORT_AREAS } from "@/shared/helpers/areas";
import { formatLongDate } from "@/shared/helpers/dates";
import { useCountWords } from "@/shared/hooks/use-count-words";
import type { ReportArea } from "@/shared/types/api";
import { cn } from "@/shared/helpers/utils";
import { REPORT_CHANNELS, SECTION } from "../../constants";
import { Panel, ProductFrame, Section, SectionHead } from "./section";

// The sample check's counts, as the report's own data object gives them
const DEMO_METRICS = mockWave(DEMO_REPORT, DEMO_REPORT.history.at(-1)?.runId ?? "demo", DEMO_REPORT.history.length).metrics;

/**
 * The weekly report: the top of the sample clinic's status report as a paper (letterhead, the buyers' answers
 * that name it as a count, the five areas by their counts: no score since 21 Nov 2026), beside where the
 * report goes.
 */
export function ReportPreview() {
  const t = useTranslations("Landing.report");
  const report = useTranslations("Report");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const words = useCountWords();
  const seen = DEMO_METRICS.visibility;
  const client = DEMO_METRICS.brands.rows.find((row) => row.own);
  const value: Record<ReportArea, string> = {
    visibility: words.fraction(seen.named, seen.answers),
    competition: client ? words.rank(client) : words.na,
    coverage: words.fraction(seen.prompts_named, seen.prompts),
    sources: seen.cited_answers > 0 ? words.fraction(seen.client_cited, seen.cited_answers) : words.na,
    accuracy: client ? words.tone(client) : words.na,
  };

  return (
    <Section id={SECTION.report} labelledBy="report-title">
      <SectionHead id="report-title" kicker={t("kicker")} title={t("title")} text={t("text")} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6">
        <ProductFrame title={t("frame.title")} text={t("frame.text")}>
          <div className="flex flex-col gap-5 rounded-[3px] border border-foreground/20 bg-card p-5 shadow-xs sm:p-7">
            <div className="flex items-end justify-between gap-3 border-b-[3px] border-double border-foreground/40 pb-3">
              <span className="flex flex-col">
                <Wordmark className="text-sm" />
                <span className="text-xs text-muted-foreground">{report("letterhead")}</span>
              </span>
              <span className="flex flex-col items-end text-xs text-muted-foreground tabular-nums">
                <span>{report("number", { number: DEMO_REPORT.history.length })}</span>
                <span>{formatLongDate(DEMO_REPORT.method.collectedAt, locale, timeZone)}</span>
              </span>
            </div>
            <p className="flex flex-col items-center gap-1 text-center">
              <span className="text-sm font-bold tracking-[0.12em] uppercase">{report("kicker")}</span>
              <span className="text-xs text-muted-foreground">{DEMO_REPORT.project.brand.name}</span>
            </p>
            <div className="grid items-center gap-6 @lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{report("headline.label")}</span>
                <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{words.fraction(seen.named, seen.answers)}</span>
                <span className="text-sm text-muted-foreground">{report("headline.of", { answers: seen.answers })}</span>
              </div>
              <ul className="flex flex-col divide-y">
                {REPORT_AREAS.map((area) => (
                  <li key={area} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                    <span className="truncate">{report(`areas.${area}`)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{value[area]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ProductFrame>
        <ul data-reveal className="flex flex-col gap-3">
          {REPORT_CHANNELS.map(({ key, icon: Icon, soon }) => (
            <li key={key}>
              <Panel className={cn("flex gap-4 p-5", soon && "bg-background/60")}>
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/50">
                  <Icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {t(`channels.${key}.title`)}
                    {soon && <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{t("soon")}</span>}
                  </span>
                  <span className="text-sm text-pretty text-muted-foreground">{t(`channels.${key}.text`)}</span>
                </span>
              </Panel>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
