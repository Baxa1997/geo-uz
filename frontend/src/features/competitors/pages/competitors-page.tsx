import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { ArrowLink } from "@/shared/components/arrow-link";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { BrandTable } from "@/shared/components/scores/brand-table";
import { KpiStrip } from "@/shared/components/scores/kpi-strip";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { outOf100, promptsWithoutYou, rankedBrands, seriesBrands, standing } from "@/shared/helpers/scores";
import { RivalCard } from "../components/rival-card";
import { TopicRankings } from "../components/topic-rankings";
import { UntrackedBrands } from "../components/untracked-brands";
import { topicRankings, topicsLed } from "../helpers/topics";

type Props = PageProps<"/[locale]/projects/[id]/competitors">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("competitors")} — ${project.brand.name}` };
}

/**
 * The client against each competitor: where the client stands in four numbers the blocks below don't show
 * as such (its place, the gap to the leader, the topics it leads, the questions without it), then the
 * brands on the four metrics with their weekly change (Peec's ranking), who leads each topic, the brands ChatGPT names that
 * aren't tracked yet (Peec's brand suggestions: track one or hide it), then the questions each competitor
 * wins. A competitor's card also stops tracking it.
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
      <Page title={t("competitors")} engines toolbar={hasFilters(filters) && <ReportFilterBar topics={topics} />}>
        {hasFilters(filters) ? <FilteredEmpty resetHref={`${base}/competitors`} /> : <NoData projectId={report.project.id} promptCount={prompts.length} />}
      </Page>
    );
  }

  const totalAnswers = report.prompts.reduce((sum, result) => sum + result.answers.length, 0);
  const series = seriesBrands(report.project);
  const rankings = topicRankings(report.prompts, series);
  const place = standing(report.scores, brand.id, "visibility");
  // The gap to the leader in points of visibility; when the client leads, its lead over the next brand
  const ranked = rankedBrands(report);
  const you = ranked.find((entry) => entry.isYou);
  const rival = ranked.find((entry) => !entry.isYou);
  const leading = ranked[0]?.isYou ?? false;
  const gap = you && rival ? Math.abs(outOf100(rival.score.visibility) - outOf100(you.score.visibility)) : null;
  const withoutYou = promptsWithoutYou(report.prompts, brand.id, competitors.map((competitor) => competitor.id)).length;

  return (
    <Page title={t("competitors")} engines toolbar={<ReportFilterBar topics={topics} />}>
      <KpiStrip
        items={[
          {
            key: "place",
            label: tCompetitors("kpi.place"),
            hint: tCompetitors("kpi.placeHint"),
            value: place ? String(place.rank) : null,
            note: place ? tCompetitors("kpi.placeOf", { of: place.of }) : undefined,
          },
          {
            key: "gap",
            label: tCompetitors(leading ? "kpi.lead" : "kpi.gap"),
            hint: tCompetitors(leading ? "kpi.leadHint" : "kpi.gapHint"),
            value: gap === null ? null : String(gap),
            note: gap === null || !rival ? undefined : tCompetitors("kpi.points", { points: gap, name: rival.brand.name }),
          },
          {
            key: "topics",
            label: tCompetitors("kpi.topics"),
            hint: tCompetitors("kpi.topicsHint"),
            value: String(topicsLed(rankings)),
            note: tCompetitors("kpi.topicsOf", { total: rankings.length }),
          },
          {
            key: "without",
            label: tCompetitors("kpi.without"),
            hint: tCompetitors("kpi.withoutHint"),
            value: String(withoutYou),
            note: tCompetitors("kpi.withoutOf", { total: report.prompts.length }),
          },
        ]}
      />
      <BrandTable
        expandable
        history={report.history}
        brands={series}
        title={tTable("titleShort")}
        // A first run has no week before it to compare with
        description={tTable(report.history.length > 1 ? "description" : "descriptionFirst")}
      />
      <TopicRankings
        rankings={rankings}
        places={series.length}
        questionsHref={(topic) => withFilters(`${base}/prompts`, { ...filters, topic })}
      />
      {report.untrackedBrands.length > 0 && (
        <UntrackedBrands
          projectId={report.project.id}
          brands={report.untrackedBrands}
          totalAnswers={totalAnswers}
          tracked={competitors.length}
          limit={report.project.limits.competitors}
          plan={report.project.plan}
        />
      )}
      {competitors.length > 0 && (
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
              {series
                .filter((rival) => !rival.isYou)
                .map((rival) => (
                  <li key={rival.id}>
                    <RivalCard
                      projectId={report.project.id}
                      rival={rival}
                      results={report.prompts}
                      youId={brand.id}
                      questionHref={(promptId) => withFilters(`${base}/prompts/${promptId}`, filters)}
                    />
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}
      <MethodLabel method={report.method} />
    </Page>
  );
}
