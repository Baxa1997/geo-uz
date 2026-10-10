import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands } from "@/shared/helpers/scores";
import { PromptManager, type View } from "../components/prompt-manager";
import { TOPICS_COOKIE } from "../constants";

type Props = PageProps<"/[locale]/projects/[id]/prompts">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

const VIEWS: View[] = ["tracked", "suggested", "archived"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("prompts")} — ${project.brand.name}` };
}

/**
 * The questions we ask ChatGPT, each with the latest run's result, laid out like Peec's prompts page
 * across the whole panel (`bleed`): topics on the left, the questions on the right with a footer that
 * stays in view. `?view=suggested|archived` opens a tab; `&new=` marks that many of the newest
 * suggestions as just made (Discovery comes back with it). A question opens its own page (prompt-page).
 */
export default async function PromptsPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const query = await searchParams;
  const [{ report, prompts, allPrompts, filters, topics }, suggestions, topicList, t, cookieStore] = await Promise.all([
    loadReport(id, query),
    orNotFound(api.getPromptSuggestions(id)),
    orNotFound(api.getTopics(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    cookies(),
  ]);
  const { brand, competitors, plan, limits } = report.project;
  const view = VIEWS.find((candidate) => candidate === query.view) ?? "tracked";
  const fresh = typeof query.new === "string" ? Math.max(0, Number.parseInt(query.new, 10) || 0) : 0;

  return (
    <Page title={t("prompts")} engines tour="prompts" bleed toolbar={prompts.length > 0 && <ReportFilterBar topics={topics} topicFilter={false} />}>
      <PromptManager
        projectId={report.project.id}
        plan={plan}
        limit={limits.prompts}
        initialPrompts={allPrompts}
        initialSuggestions={suggestions}
        initialTopics={topicList}
        initialView={view}
        initialTopicsFolded={cookieStore.get(TOPICS_COOKIE)?.value === "folded"}
        freshCount={fresh}
        results={report.prompts}
        brands={[brand, ...competitors]}
        series={seriesBrands(report.project)}
        youId={brand.id}
        collectedAt={report.method.collectedAt}
        method={report.prompts.length > 0 ? report.method : null}
        filters={filters}
        filename={`${brand.domain}-questions-${report.method.collectedAt.slice(0, 10)}`}
        nextRunAt={report.nextRunAt}
        wrongFacts={report.wrongFacts}
        wrongFactsHref={withFilters(`/projects/${report.project.id}/wrong-facts`, filters)}
        discoveryHref={withFilters(`/projects/${report.project.id}/prompts/discovery`, filters)}
        city={report.project.city}
      />
    </Page>
  );
}
