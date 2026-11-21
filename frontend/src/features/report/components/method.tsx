import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { REPORT_AREAS } from "@/shared/helpers/areas";
import { formatLongDate } from "@/shared/helpers/dates";
import type { Report, WaveMetrics } from "@/shared/types/api";
import { BlockTitle, ReportCard } from "./report-parts";
import { DOMAIN_TYPES } from "./sources";

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
 * How the numbers were collected, so a reader can judge them and anyone can repeat the measurement: how the
 * assistants were asked, how many runs, when, which brands were compared, and what the numbers can't say.
 * What was asked of whom, with which model and as from where, is the scope card's at the top (from the slot
 * log, Phase 0 item 0.1): this section doesn't count it again. Since 0.2 it says the rules that keep a small
 * count honest (the small-sample badge, share of voice, tone, place, ties), with the thresholds the metrics use,
 * and since 0.4 how each cited site is typed and which sites a step to get listed may name (spec §4.6, §7).
 */
export function Method({ report, metrics }: { report: Report; metrics: WaveMetrics }) {
  const t = useTranslations("Report.method");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { project } = report;
  const { scope } = metrics;
  const date = (iso: string) => formatLongDate(iso, locale, timeZone);
  const previous = report.history.at(-2)?.collectedAt;
  const names = scope.engines.map(({ engine }) => (engine === "chatgpt" || engine === "gemini" ? engines(engine) : engine)).join(", ");

  return (
    <Rows
      rows={[
        { key: "assistants", label: t("assistants"), value: t("assistantsValue", { names }) },
        { key: "runs", label: t("runs"), value: t("runsValue", { runs: scope.runs_per_prompt }) },
        {
          key: "checks",
          label: t("checks"),
          value: previous ? t("checksValue", { date: date(scope.wave.collected_at), previous: date(previous) }) : t("checksFirst", { date: date(scope.wave.collected_at) }),
        },
        { key: "brands", label: t("brands"), value: [project.brand, ...project.competitors].map((brand) => brand.name).join(", ") },
        {
          key: "samples",
          label: t("samples"),
          value: t("samplesValue", { answers: metrics.visibility.small_sample_below, mentions: metrics.brands.share_of_voice.minimum, tone: metrics.brands.tone_summary_from }),
        },
        { key: "sites", label: t("sites"), value: t("sitesValue") },
        { key: "limits", label: t("limits"), value: t("limitsValue", { answers: metrics.visibility.answers }) },
      ]}
    />
  );
}

/**
 * The report's terms in a sentence or two each: the numbers and what a check is, then how the five areas are
 * read (each by its own counts, since 21 Nov 2026: no score and no status), ties and N/A, then the types of
 * cited sites (spec §4.6, Phase 0 item 0.4). A reader on paper has no hover. No example here is a number of the
 * client's.
 */
export function Glossary() {
  const t = useTranslations("Report.glossary");
  const labels = useTranslations("Report.scorecard.labels");
  const areas = useTranslations("Report.areas");
  const types = useTranslations("DomainTypes");
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <BlockTitle>{t("numbers")}</BlockTitle>
        <Rows
          rows={[
            ...(["visibility", "coverage", "shareOfVoice", "position", "sentiment", "usedAsSource"] as const).map((term) => ({ key: term, label: labels(term), value: t(term) })),
            { key: "check", label: t("checkTerm"), value: t("check") },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <BlockTitle>{t("areasTitle")}</BlockTitle>
        <Rows
          rows={[
            ...REPORT_AREAS.map((area) => ({ key: area, label: areas(area), value: t(`areas.${area}`) })),
            { key: "ties", label: t("tiesTerm"), value: t("ties") },
            { key: "na", label: t("naTerm"), value: t("na") },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <BlockTitle>{t("typesTitle")}</BlockTitle>
        <Rows rows={DOMAIN_TYPES.map(({ type }) => ({ key: type, label: types(`names.${type}`), value: types(`about.${type}`) }))} />
      </div>
    </div>
  );
}
