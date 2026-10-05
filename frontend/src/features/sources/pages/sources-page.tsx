import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { KpiStrip } from "@/shared/components/scores/kpi-strip";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { hasFilters } from "@/shared/helpers/report-filters";
import { missingSources, ownSourceShare, seriesBrands, totalAnswers as countAnswers } from "@/shared/helpers/scores";
import { SourcesTabs } from "../components/sources-tabs";

type Props = PageProps<"/[locale]/projects/[id]/sources">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("sources")} — ${project.brand.name}` };
}

/**
 * The sites and pages ChatGPT relies on, laid out like Peec's sources pages: the sources in numbers, then
 * sites, pages and gaps (pages naming competitors, not the client) in one card. ?tab=pages|gaps opens a tab.
 */
export default async function SourcesPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const query = await searchParams;
  const [{ report, prompts, filters, topics }, t, tSources] = await Promise.all([
    loadReport(id, query),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "SourcesPage" }),
  ]);
  const base = `/projects/${report.project.id}`;

  if (report.prompts.length === 0) {
    return (
      <Page title={t("sources")} engines>
        {hasFilters(filters) ? (
          <>
            <ReportFilterBar topics={topics} />
            <FilteredEmpty resetHref={`${base}/sources`} />
          </>
        ) : (
          <NoData projectId={report.project.id} promptCount={prompts.length} />
        )}
      </Page>
    );
  }

  const totalAnswers = countAnswers(report.prompts);
  const { brand } = report.project;
  const answers = report.prompts.flatMap((result) => result.answers);
  const citations = answers.reduce((sum, answer) => sum + new Set(answer.citations.map((citation) => citation.url)).size, 0);
  const pages = report.topSources.reduce((sum, source) => sum + source.pages.length, 0);
  const { tab } = query;

  return (
    <Page title={t("sources")} engines>
      <ReportFilterBar topics={topics} />
      <KpiStrip
        items={[
          { key: "sites", label: tSources("kpi.sites"), hint: tSources("kpi.sitesHint"), value: String(report.topSources.length) },
          { key: "pages", label: tSources("kpi.pages"), hint: tSources("kpi.pagesHint"), value: String(pages) },
          {
            key: "citations",
            label: tSources("kpi.citations"),
            hint: tSources("kpi.citationsHint"),
            value: formatDecimal(answers.length ? citations / answers.length : 0, locale),
          },
          {
            key: "own",
            label: tSources("kpi.own"),
            hint: tSources("kpi.ownHint"),
            value: formatPercent(ownSourceShare(report.prompts, brand.domain), locale),
          },
          {
            key: "missing",
            label: tSources("kpi.missing"),
            hint: tSources("kpi.missingHint"),
            value: String(missingSources(report.topSources, report.project.competitors).length),
          },
        ]}
      />
      <SourcesTabs
        sources={report.topSources}
        totalAnswers={totalAnswers}
        youId={brand.id}
        brands={seriesBrands(report.project)}
        filename={`${brand.domain}-sources-${report.method.collectedAt.slice(0, 10)}`}
        initialTab={tab === "pages" || tab === "gaps" ? tab : "sites"}
      />
      <MethodLabel method={report.method} />
    </Page>
  );
}
