import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { ConditionGauge } from "@/shared/components/condition-gauge";
import { TIME_ZONE } from "@/shared/constants";
import { CONDITION_AREAS, conditionStatus, STATUS_FILL } from "@/shared/helpers/condition";
import { formatLongDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import { REPORT_CHANNELS, SECTION } from "../../constants";
import { Panel, ProductFrame, Section, SectionHead } from "./section";

/**
 * The weekly report: the top of the sample clinic's status report as a paper (letterhead, the condition
 * score with its gauge, the five areas), beside where the report goes.
 */
export function ReportPreview() {
  const t = useTranslations("Landing.report");
  const report = useTranslations("Report");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const condition = DEMO_REPORT.conditionHistory.at(-1);
  const status = condition ? conditionStatus(condition.score) : "fair";

  return (
    <Section id={SECTION.report} labelledBy="report-title">
      <SectionHead id="report-title" kicker={t("kicker")} title={t("title")} text={t("text")} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6">
        <ProductFrame title={t("frame.title")} text={t("frame.text")}>
          {condition && (
            <div className="flex flex-col gap-5 rounded-[3px] border border-foreground/20 bg-card p-5 shadow-xs sm:p-7">
              <div className="flex items-end justify-between gap-3 border-b-[3px] border-double border-foreground/40 pb-3">
                <span className="flex flex-col">
                  <span className="text-sm font-bold">GEO</span>
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
                <div className="flex flex-col items-center gap-2">
                  <ConditionGauge score={condition.score} label={report("condition.gaugeLabel", { score: condition.score, status: report(`status.${status}`) })} />
                  <span className="text-sm font-semibold">
                    {report("condition.overall")} · {report(`status.${status}`)}
                  </span>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {CONDITION_AREAS.map((area) => {
                    const score = condition.areas[area];
                    return (
                      <li key={area} className="flex flex-col gap-1">
                        <span className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate">{report(`areas.${area}`)}</span>
                          <span className="font-semibold tabular-nums">{score}</span>
                        </span>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                          <span className={cn("block h-full rounded-full", STATUS_FILL[conditionStatus(score)])} style={{ width: `${Math.min(100, score)}%` }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
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
