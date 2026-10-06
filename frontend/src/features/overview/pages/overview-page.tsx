import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { ArrowLink } from "@/shared/components/arrow-link";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { BrandTable } from "@/shared/components/scores/brand-table";
import { HeadlineKpis } from "@/shared/components/scores/headline-kpis";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { SourceTypesChart } from "@/shared/components/scores/source-types-chart";
import { TopDomains } from "@/shared/components/scores/top-domains";
import { TrendPanel } from "@/shared/components/scores/trend-panel";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { ActionsCard } from "../components/actions-card";
import { BreakdownCard } from "../components/breakdown-card";
import { MissingCard } from "../components/missing-card";
import { NextRun } from "../components/next-run";
import { RecentAnswers } from "../components/recent-answers";
import { ShareMenu } from "../components/share-menu";
import { Verdict } from "../components/verdict";
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
 * Project home: where the client stands in a sentence, then the numbers and charts laid out like Peec's
 * dashboard (the client's five numbers with their weekly change, every brand over time beside the brands
 * table, the sites ChatGPT cites beside their kinds, visibility by topic and by question language), then
 * what to work on next and the latest answers. The cards of numbers open large (⤢), with what the numbers
 * say and how to read them.
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
      {/* The alert goes over the sentence, so the numbers and charts follow the sentence directly */}
      {report.wrongFacts.length > 0 && <WrongFactsAlert count={report.wrongFacts.length} href={to("/wrong-facts")} />}
      <Verdict report={report} />

      <HeadlineKpis report={report} />

      {/* Columns follow the panel's width, which shrinks when GEO AI is open */}
      <div className="@container">
        <div className="grid gap-4 sm:gap-5 @4xl:grid-cols-2">
          <TrendPanel expandable title={tOverview("trendTitle")} hint={tOverview("trendHint")} history={report.history} brands={brands} />
          <BrandTable
            expandable
            history={report.history}
            brands={brands}
            title={tTable("titleShort")}
            // A first run has no week before it to compare with
            description={tTable(report.history.length > 1 ? "description" : "descriptionFirst")}
            action={<ArrowLink href={to("/competitors")}>{t("competitors")}</ArrowLink>}
          />
          <TopDomains
            expandable
            sources={report.topSources}
            totalAnswers={totalAnswers(report.prompts)}
            youId={brand.id}
            limit={TOP_SOURCES}
            action={<ArrowLink href={to("/sources")}>{t("sources")}</ArrowLink>}
          />
          <SourceTypesChart expandable sources={report.topSources} />
        </div>
      </div>

      <BreakdownCard
        results={report.prompts}
        brands={brands}
        questionsHref={(filter) => withFilters(`${base}/prompts`, { ...filters, ...filter })}
      />

      {/* What to do, after the numbers it follows from */}
      <div className="@container">
        <div className="grid gap-4 sm:gap-5 @4xl:grid-cols-2">
          <ActionsCard actions={actions} href={(actionId) => to("/actions", actionId ? { action: actionId } : undefined)} />
          <MissingCard
            report={report}
            answersHref={(promptId) => to("/answers", promptId ? { prompt: promptId } : undefined)}
          />
        </div>
      </div>

      <RecentAnswers
        report={report}
        brands={brands}
        answersHref={(promptId) => to("/answers", promptId ? { prompt: promptId } : undefined)}
      />

      <MethodLabel method={report.method} />
    </Page>
  );
}
