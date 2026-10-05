import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { ArrowLink } from "@/shared/components/arrow-link";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { Panel } from "@/shared/components/panel";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { BrandTable } from "@/shared/components/scores/brand-table";
import { HeadlineKpis } from "@/shared/components/scores/headline-kpis";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { MetricChart } from "@/shared/components/scores/metric-chart";
import { SourceTypesChart } from "@/shared/components/scores/source-types-chart";
import { TopDomains } from "@/shared/components/scores/top-domains";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { ActionsCard } from "../components/actions-card";
import { MissingCard } from "../components/missing-card";
import { NextRun } from "../components/next-run";
import { RecentAnswers } from "../components/recent-answers";
import { ShareMenu } from "../components/share-menu";
import { WrongFactsAlert } from "../components/wrong-facts-alert";

type Props = PageProps<"/[locale]/projects/[id]">;

const TOP_SOURCES = 7;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("overview")} — ${project.brand.name}` };
}

/**
 * Project home, laid out like Peec's dashboard: the client's five numbers with their weekly change,
 * then every brand over time beside the brands table, the sites ChatGPT cites beside their kinds, the
 * latest answers, and what to work on next.
 */
export default async function OverviewPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [{ report, prompts, filters, topics }, actions, t, tOverview, tTable] = await Promise.all([
    loadReport(id, await searchParams),
    orNotFound(api.getActions(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "Overview" }),
    getTranslations({ locale, namespace: "BrandTable" }),
  ]);
  const { brand } = report.project;
  const brands = seriesBrands(report.project);
  const base = `/projects/${report.project.id}`;
  const to = (section: string, extra?: Record<string, string>) => withFilters(`${base}${section}`, filters, extra);

  if (report.prompts.length === 0) {
    return (
      <Page title={t("overview")} engines>
        {hasFilters(filters) ? (
          <>
            <ReportFilterBar topics={topics} />
            <FilteredEmpty resetHref={base} />
          </>
        ) : (
          <NoData projectId={report.project.id} promptCount={prompts.length} />
        )}
      </Page>
    );
  }

  return (
    <Page title={t("overview")} engines>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportFilterBar topics={topics} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {report.nextRunAt && <NextRun at={report.nextRunAt} />}
          <ShareMenu
            projectId={report.project.id}
            history={report.history}
            brands={brands}
            filename={`${brand.domain}-${report.method.collectedAt.slice(0, 10)}`}
          />
        </div>
      </div>
      {report.wrongFacts.length > 0 && <WrongFactsAlert count={report.wrongFacts.length} href={to("/wrong-facts")} />}

      <HeadlineKpis report={report} />

      {/* Columns follow the panel's width, which shrinks when GEO AI is open */}
      <div className="@container">
        <div className="grid gap-4 sm:gap-5 @4xl:grid-cols-2">
          <Panel title={tOverview("trendTitle")} hint={tOverview("trendHint")}>
            <MetricChart history={report.history} brands={brands} />
          </Panel>
          <BrandTable
            history={report.history}
            brands={brands}
            title={tTable("titleShort")}
            // A first run has no week before it to compare with
            description={tTable(report.history.length > 1 ? "description" : "descriptionFirst")}
            action={<ArrowLink href={to("/competitors")}>{t("competitors")}</ArrowLink>}
          />
          <TopDomains
            sources={report.topSources}
            totalAnswers={totalAnswers(report.prompts)}
            youId={brand.id}
            limit={TOP_SOURCES}
            action={<ArrowLink href={to("/sources")}>{t("sources")}</ArrowLink>}
          />
          <SourceTypesChart sources={report.topSources} />
        </div>
      </div>

      <RecentAnswers
        report={report}
        brands={brands}
        answersHref={(promptId) => to("/answers", promptId ? { prompt: promptId } : undefined)}
      />

      <div className="@container">
        <div className="grid gap-4 sm:gap-5 @4xl:grid-cols-2">
          <ActionsCard actions={actions} href={(actionId) => to("/actions", actionId ? { action: actionId } : undefined)} />
          <MissingCard
            report={report}
            answersHref={(promptId) => to("/answers", promptId ? { prompt: promptId } : undefined)}
          />
        </div>
      </div>
      <MethodLabel method={report.method} />
    </Page>
  );
}
