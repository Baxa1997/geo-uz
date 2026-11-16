import { CheckCircleIcon as CircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { XCircleIcon as CircleX } from "@phosphor-icons/react/dist/ssr/XCircle";
import { useFormatter, useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { BrandTable } from "@/shared/components/scores/brand-table";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Source } from "@/shared/types/api";
import { SECTION, SHOWN_SOURCES } from "../../constants";
import { ProductFrame, Section, SectionHead } from "./section";

/**
 * You against your competitors, and the sites AI relies on: the app's brands table beside the most cited
 * sites with whether the client is on each, both from the sample clinic's report.
 */
export function Compare() {
  const t = useTranslations("Landing.compare");
  const table = useTranslations("BrandTable");
  const report = DEMO_REPORT;

  return (
    <Section id={SECTION.compare} labelledBy="compare-title">
      <SectionHead id="compare-title" kicker={t("kicker")} title={t("title")} text={t("text")} />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
        <ProductFrame title={t("ranking.title")} text={t("ranking.text")}>
          <BrandTable history={report.history} brands={seriesBrands(report.project)} title={table("titleShort")} description={table("description")} />
        </ProductFrame>
        <ProductFrame title={t("sources.title")} text={t("sources.text")}>
          <CitedSites />
        </ProductFrame>
      </div>
    </Section>
  );
}

/** The most cited sites: kind, the share of answers citing each, and whether the client is on it. */
function CitedSites() {
  const t = useTranslations("Landing.compare.table");
  const types = useTranslations("SourcesPage.types");
  const format = useFormatter();
  const total = totalAnswers(DEMO_REPORT.prompts);
  const sources = DEMO_REPORT.topSources.slice(0, SHOWN_SOURCES);

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-sm shadow-xs">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <span className="font-semibold">{t("title")}</span>
        <span className="text-xs text-muted-foreground">{t("of", { count: total })}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,6.5rem)] gap-2 border-b bg-muted/40 px-3 py-2 text-xs @md:gap-3 @md:px-4 text-muted-foreground">
        <span>{t("site")}</span>
        <span className="text-right">{t("share")}</span>
        <span>{t("listed")}</span>
      </div>
      <ul className="divide-y">
        {sources.map((source) => (
          <li key={source.domain} className="grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,6.5rem)] items-center gap-2 px-3 py-2.5 @md:gap-3 @md:px-4">
            <span className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-2">
                <SourceTypeDot type={source.type} />
                <span className="truncate font-medium">{source.domain}</span>
              </span>
              <span className="truncate pl-4 text-xs text-muted-foreground">{types(source.type)}</span>
            </span>
            <span className="text-right font-medium tabular-nums">{format.number(source.count / total, { style: "percent", maximumFractionDigits: 0 })}</span>
            <Listed source={source} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Listed({ source }: { source: Source }) {
  const t = useTranslations("Landing.compare.table");
  if (source.type === "own" || source.type === "competitor") {
    return (
      <span className={cn("w-fit truncate rounded-md px-1.5 py-0.5 text-xs", source.type === "own" ? "bg-you-soft" : "bg-muted text-muted-foreground")}>
        {t(source.type)}
      </span>
    );
  }
  const Icon = source.brandListed ? CircleCheck : CircleX;
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", source.brandListed ? "text-positive" : "text-negative")}>
      <Icon aria-hidden weight="fill" className="size-4 shrink-0" />
      {t(source.brandListed ? "yes" : "no")}
    </span>
  );
}
