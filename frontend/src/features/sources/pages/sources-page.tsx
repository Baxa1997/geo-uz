import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { PageSection } from "@/shared/components/page-section";
import { PageTabs } from "@/shared/components/page-tabs";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { SITE_SLOT } from "@/shared/helpers/domain";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { MoversCard } from "../components/movers-card";
import { MoversDescription } from "../components/movers-description";
import { PagesTable } from "../components/pages-table";
import { PresenceCard } from "../components/presence-card";
import { SitesTable } from "../components/sites-table";
import { SourcesChart } from "../components/sources-chart";
import { SOURCE_TYPES } from "../constants";
import { pageMovers, siteMovers } from "../helpers/history";
import { siteLines, topPageLines } from "../helpers/lines";
import { pagePresence, sitePresence } from "../helpers/presence";

type Props = PageProps<"/[locale]/projects/[id]/sources">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("sources")} — ${project.brand.name}` };
}

/**
 * The sites and pages ChatGPT relies on, laid out like Peec's Sources › Domains and Sources › URLs, as the
 * two views of one page (`?view=pages` for the pages): the breadcrumb, the filters, the views as tabs;
 * then "Overview", the five most cited sites (or pages) over the checks; "What changed", the sites (or
 * pages) cited for the first time, more and less since the last check beside how the citations split by
 * whether they work for the client; then every site (or page) in a table with the gap switch. A site
 * anywhere on the page opens the site's own page; a page opens it on the answers citing that page.
 * `&type=` starts the sites table on one kind of site.
 *
 * Left out of Peec's pages: "Top" among the movers (the table is that list), domain and URL types (the
 * kinds of sites are on the Overview; page types would need classifying in the backend), retrieved as a
 * number apart from cited, hosts, free tags and bookmarks.
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
  const scope = query.view === "pages" ? "pages" : "sites";
  const home = withFilters(`${base}/sources`, filters);
  const crumbs = [{ href: home, label: t("sources") }];
  const tabs = (
    <div data-tour="views" className="w-fit max-w-full">
      <PageTabs
        label={tSources("views.label")}
        current={scope}
        tabs={[
          { key: "sites", label: tSources("views.sites"), href: home, hint: tSources("views.hints.sites") },
          { key: "pages", label: tSources("views.pages"), href: withFilters(`${base}/sources`, filters, { view: "pages" }), hint: tSources("views.hints.pages") },
        ]}
      />
    </div>
  );

  if (report.prompts.length === 0) {
    return (
      <Page title={tSources(`views.${scope}`)} crumbs={crumbs} engines toolbar={hasFilters(filters) && <ReportFilterBar topics={topics} />}>
        {hasFilters(filters) ? <FilteredEmpty resetHref={`${base}/sources`} /> : <NoData projectId={report.project.id} promptCount={prompts.length} />}
      </Page>
    );
  }

  const { brand } = report.project;
  const sitePattern = withFilters(`${base}/sources/${SITE_SLOT}`, filters);
  const lines = scope === "pages" ? topPageLines(report.topSources, sitePattern) : siteLines(report.topSources, sitePattern);
  const movers = scope === "pages" ? pageMovers(report.sourceHistory) : siteMovers(report.sourceHistory);
  const kind = SOURCE_TYPES.find((candidate) => candidate === query.type) ?? "";
  const filename = `${brand.domain}-sources-${report.method.collectedAt.slice(0, 10)}`;
  const tableProps = { sources: report.topSources, totalAnswers: totalAnswers(report.prompts), brands: seriesBrands(report.project), filename, sitePattern };

  return (
    <Page title={tSources(`views.${scope}`)} crumbs={crumbs} engines tour="sources" toolbar={<ReportFilterBar topics={topics} />} tabs={tabs}>
      <div className="flex flex-col gap-8 sm:gap-10">
        <PageSection tour="chart" title={tSources("sections.overview.title")} description={tSources(`sections.overview.${scope}`)}>
          <SourcesChart
            // Drawn anew for the other view
            key={scope}
            title={tSources(`chart.title.${scope}`)}
            hint={tSources(`chart.hint.${scope}`)}
            label={tSources(`chart.label.${scope}`, { count: lines.length, checks: report.sourceHistory.length })}
            history={report.sourceHistory}
            lines={lines}
          />
        </PageSection>

        <PageSection tour="movers" title={tSources("sections.movers.title")} description={<MoversDescription comparedWith={movers?.comparedWith ?? null} scope={scope} />}>
          {/* Two cards side by side once the panel is wide enough; it narrows when GEO AI is open */}
          <div className="@container">
            <div className="grid gap-4 @3xl:grid-cols-2">
              <MoversCard key={scope} movers={movers} sitePattern={sitePattern} naming={scope === "pages" ? "page" : "site"} />
              <PresenceCard scope={scope} rows={scope === "pages" ? pagePresence(report.topSources, brand.id) : sitePresence(report.topSources)} />
            </div>
          </div>
        </PageSection>

        {scope === "pages" ? (
          <PagesTable key={`pages:${kind}`} {...tableProps} youId={brand.id} />
        ) : (
          // Keyed: a link to another kind opens it, even from this same page
          <SitesTable key={`sites:${kind}`} {...tableProps} initialType={kind} />
        )}

        <MethodLabel method={report.method} />
      </div>
    </Page>
  );
}
