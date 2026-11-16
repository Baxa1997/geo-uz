import { useFormatter, useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { outOf100, scoreOf } from "@/shared/helpers/scores";
import { SECTION } from "../../constants";
import { MetricTabs } from "./metric-tabs";
import { Section, SectionHead } from "./section";

/** The three numbers we measure, each shown on the same answer. The client's numbers are the sample clinic's. */
export function Metrics() {
  const t = useTranslations("Landing.metrics");
  const format = useFormatter();
  const you = scoreOf(DEMO_REPORT.scores, DEMO_REPORT.project.brand.id);

  return (
    <Section id={SECTION.metrics} labelledBy="metrics-title">
      <SectionHead id="metrics-title" kicker={t("pill")} title={t("title")} text={t("sub")} />
      <MetricTabs
        score={outOf100(you?.visibility ?? 0)}
        // Formatted here: the browser has no Uzbek number format, and the two must match
        position={format.number(you?.avgPosition ?? 1, { maximumFractionDigits: 1 })}
      />
    </Section>
  );
}
