import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { engineOf, TIME_ZONE } from "@/shared/constants";
import { CONDITION_AREAS, FAIR_FROM, GOOD_FROM, WRONG_FACT_PENALTY } from "@/shared/helpers/condition";
import { formatLongDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { totalAnswers } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { BlockTitle, ReportCard } from "./report-parts";

/** A label beside its text, one under another; on a phone the label goes above. */
function Rows({ rows }: { rows: { key: string; label: string; value: string }[] }) {
  return (
    <ReportCard>
      <dl className="divide-y text-sm">
        {rows.map(({ key, label, value }) => (
          <div key={key} className="grid gap-x-6 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)] print:break-inside-avoid">
            <dt className="font-medium">{label}</dt>
            <dd className="text-pretty text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </ReportCard>
  );
}

/**
 * How the numbers were collected, so a reader can judge them and anyone can repeat the measurement: which
 * assistant and how it was asked, as whom, what was asked and how many times, when, which brands were
 * compared, and what the numbers can't say.
 */
export function Method({ report }: { report: Report }) {
  const t = useTranslations("Report.method");
  const engines = useTranslations("Engines");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { project, method } = report;
  const date = (iso: string) => formatLongDate(iso, locale, timeZone);
  const previous = report.history.at(-2)?.collectedAt;
  const inLanguage = (language: string) => report.prompts.filter((result) => result.prompt.language === language).length;

  return (
    <Rows
      rows={[
        { key: "assistant", label: t("assistant"), value: t("assistantValue", { engine: engines(engineOf(method.engine)), model: method.model }) },
        { key: "location", label: t("location"), value: t("locationValue", { city: labelFor(messages.Cities, project.city) }) },
        { key: "questions", label: t("questions"), value: t("questionsValue", { count: report.prompts.length, uz: inLanguage("uz"), ru: inLanguage("ru") }) },
        { key: "samples", label: t("samples"), value: t("samplesValue", { samples: method.samples }) },
        {
          key: "checks",
          label: t("checks"),
          value: previous ? t("checksValue", { date: date(method.collectedAt), previous: date(previous) }) : t("checksFirst", { date: date(method.collectedAt) }),
        },
        { key: "brands", label: t("brands"), value: [project.brand, ...project.competitors].map((brand) => brand.name).join(", ") },
        { key: "condition", label: t("condition"), value: t("conditionValue", { areas: CONDITION_AREAS.length, good: GOOD_FROM, fair: FAIR_FROM }) },
        { key: "limits", label: t("limits"), value: t("limitsValue", { answers: totalAnswers(report.prompts) }) },
      ]}
    />
  );
}

/**
 * The report's terms in a sentence or two each: the five numbers and what a check is, then the condition
 * score, how each of its areas is counted and where a status begins. A reader on paper has no hover.
 */
export function Glossary() {
  const t = useTranslations("Report.glossary");
  const labels = useTranslations("Kpi.labels");
  const areas = useTranslations("Report.areas");
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <BlockTitle>{t("numbers")}</BlockTitle>
        <Rows
          rows={[
            ...(["visibility", "shareOfVoice", "position", "sentiment", "usedAsSource"] as const).map((term) => ({ key: term, label: labels(term), value: t(term) })),
            { key: "check", label: t("checkTerm"), value: t("check") },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <BlockTitle>{t("conditionTitle")}</BlockTitle>
        <Rows
          rows={[
            { key: "condition", label: t("conditionTerm"), value: t("condition", { areas: CONDITION_AREAS.length }) },
            ...CONDITION_AREAS.map((area) => ({ key: area, label: areas(area), value: t(`areas.${area}`, { penalty: WRONG_FACT_PENALTY }) })),
            { key: "status", label: t("statusTerm"), value: t("status", { good: GOOD_FROM, fair: FAIR_FROM }) },
          ]}
        />
      </div>
    </div>
  );
}
