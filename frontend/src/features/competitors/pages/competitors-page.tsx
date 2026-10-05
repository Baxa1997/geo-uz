import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { ArrowLink } from "@/shared/components/arrow-link";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { BrandTable } from "@/shared/components/scores/brand-table";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands } from "@/shared/helpers/scores";
import { RivalCard } from "../components/rival-card";
import { TopicRankings } from "../components/topic-rankings";
import { UntrackedBrands } from "../components/untracked-brands";

type Props = PageProps<"/[locale]/projects/[id]/competitors">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("competitors")} — ${project.brand.name}` };
}

/**
 * The client against each competitor, laid out like Peec's ranking: the brands on the four numbers with
 * their weekly change, who leads each topic, brands ChatGPT names that aren't tracked yet, then the
 * questions each competitor wins.
 */
export default async function CompetitorsPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [{ report, prompts, filters, topics }, t, tCompetitors, tTable] = await Promise.all([
    loadReport(id, await searchParams),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "Competitors" }),
    getTranslations({ locale, namespace: "BrandTable" }),
  ]);
  const { brand, competitors } = report.project;
  const base = `/projects/${report.project.id}`;

  if (report.prompts.length === 0) {
    return (
      <Page title={t("competitors")} engines>
        {hasFilters(filters) ? (
          <>
            <ReportFilterBar topics={topics} />
            <FilteredEmpty resetHref={`${base}/competitors`} />
          </>
        ) : (
          <NoData projectId={report.project.id} promptCount={prompts.length} />
        )}
      </Page>
    );
  }

  const totalAnswers = report.prompts.reduce((sum, result) => sum + result.answers.length, 0);

  return (
    <Page title={t("competitors")} engines>
      <ReportFilterBar topics={topics} />
      <BrandTable
        history={report.history}
        brands={seriesBrands(report.project)}
        title={tTable("titleShort")}
        // A first run has no week before it to compare with
        description={tTable(report.history.length > 1 ? "description" : "descriptionFirst")}
      />
      <TopicRankings results={report.prompts} brands={seriesBrands(report.project)} />
      {report.untrackedBrands.length > 0 && (
        <UntrackedBrands brands={report.untrackedBrands} totalAnswers={totalAnswers} />
      )}
      <section aria-labelledby="ahead-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="flex flex-col gap-1">
            <h2 id="ahead-title" className="font-medium">
              {tCompetitors("aheadTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{tCompetitors("aheadDescription")}</p>
          </div>
          <ArrowLink href={withFilters(`${base}/answers`, filters)}>{tCompetitors("readAnswers")}</ArrowLink>
        </div>
        {/* Columns follow the panel's width, which shrinks when GEO AI is open */}
        <div className="@container">
          <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {competitors.map((rival) => (
              <li key={rival.id}>
                <RivalCard
                  rival={rival}
                  results={report.prompts}
                  youId={brand.id}
                  answersHref={(promptId) => withFilters(`${base}/answers`, filters, { prompt: promptId })}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <MethodLabel method={report.method} />
    </Page>
  );
}
