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
import { SITE_SLOT } from "@/shared/helpers/domain";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { missingSources, ownSourceShare, seriesBrands, totalAnswers as countAnswers } from "@/shared/helpers/scores";
import { SourceMovers } from "../components/source-movers";
import { SourcesChart } from "../components/sources-chart";
import { SourcesTabs } from "../components/sources-tabs";
import { SOURCE_TYPES } from "../constants";
import { sourceMovers } from "../helpers/history";
import { siteLines } from "../helpers/lines";
import { ownSiteUse } from "../helpers/outreach";

type Props = PageProps<"/[locale]/projects/[id]/sources">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("sources")} — ${project.brand.name}` };
}

/**
 * The sites and pages ChatGPT relies on, laid out like Peec's Sources › Domains: four numbers the table
 * below doesn't show as such (how often the client's own site is cited, how often it is cited without the
 * client being named, the sites the client is missing from, links per answer); the most cited sites over
 * the checks beside what changed since the last one (sites used more, less, for the first time); then
 * sites, pages and gaps (pages naming competitors, not the client) in one card, whose tabs carry the
 * counts. A site anywhere on the page (the chart's legend, the changes, a table row) opens the site's own
 * page. ?tab=pages|gaps opens a tab, &type= one kind of site (own: the client's pages).
 *
 * Left out of Peec's page: "Top" among the movers and the kinds of sites as a chart (the table here and
 * the Overview already show them), retrieved as a number apart from cited (we have what the answer cites),
 * hosts, and free tags.
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
  const { tab, type } = query;
  const kind = SOURCE_TYPES.find((candidate) => candidate === type) ?? "";
  const own = ownSiteUse(report.prompts, brand.domain, brand.id);
  const sitePattern = withFilters(`${base}/sources/${SITE_SLOT}`, filters);
  const lines = siteLines(report.topSources, sitePattern);

  return (
    <Page title={t("sources")} engines>
      <ReportFilterBar topics={topics} />
      {/* How many sites and pages are cited is on the tabs below; the kinds of sites are on the Overview */}
      <KpiStrip
        items={[
          {
            key: "own",
            label: tSources("kpi.own"),
            hint: tSources("kpi.ownHint"),
            value: formatPercent(ownSourceShare(report.prompts, brand.domain), locale),
            note: tSources("kpi.ownNote", { count: own.citing }),
          },
          {
            key: "unnamed",
            label: tSources("kpi.unnamed"),
            hint: tSources("kpi.unnamedHint"),
            value: own.citing > 0 ? String(own.unnamed) : null,
            note: own.citing > 0 ? tSources("kpi.unnamedNote", { total: own.citing }) : undefined,
          },
          {
            key: "missing",
            label: tSources("kpi.missing"),
            hint: tSources("kpi.missingHint"),
            value: String(missingSources(report.topSources, report.project.competitors).length),
          },
          {
            key: "citations",
            label: tSources("kpi.citations"),
            hint: tSources("kpi.citationsHint"),
            value: formatDecimal(answers.length ? citations / answers.length : 0, locale),
          },
        ]}
      />
      {/* How the sites moved, before the full list: columns follow the panel's width, which shrinks when GEO AI is open */}
      <div className="@container">
        <div className="grid gap-4 sm:gap-5 @4xl:grid-cols-5">
          <SourcesChart
            className="@4xl:col-span-3"
            title={tSources("chart.title")}
            hint={tSources("chart.hint")}
            footer={tSources("chart.footer", { count: lines.length })}
            label={tSources("chart.label", { sites: lines.length, checks: report.sourceHistory.length })}
            history={report.sourceHistory}
            lines={lines}
          />
          <SourceMovers className="@4xl:col-span-2" movers={sourceMovers(report.sourceHistory)} sitePattern={sitePattern} />
        </div>
      </div>
      <SourcesTabs
        // Keyed: a link to another tab or kind opens it, even from this same page
        key={`${tab}:${kind}`}
        sources={report.topSources}
        totalAnswers={totalAnswers}
        youId={brand.id}
        brands={seriesBrands(report.project)}
        filename={`${brand.domain}-sources-${report.method.collectedAt.slice(0, 10)}`}
        initialTab={tab === "pages" || tab === "gaps" ? tab : "sites"}
        initialType={kind}
        sitePattern={sitePattern}
      />
      <MethodLabel method={report.method} />
    </Page>
  );
}
