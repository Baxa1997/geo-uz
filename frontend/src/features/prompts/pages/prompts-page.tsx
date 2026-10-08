import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands } from "@/shared/helpers/scores";
import { PromptManager } from "../components/prompt-manager";

type Props = PageProps<"/[locale]/projects/[id]/prompts">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("prompts")} — ${project.brand.name}` };
}

/**
 * The questions we ask ChatGPT, each with the latest run's result. They are added, edited and archived
 * here; a question opens its own page (prompt-page).
 */
export default async function PromptsPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [{ report, prompts, allPrompts, filters, topics }, suggestions, t, tPrompts] = await Promise.all([
    loadReport(id, await searchParams),
    orNotFound(api.getPromptSuggestions(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "PromptManager" }),
  ]);
  const { brand, competitors, plan, limits } = report.project;

  return (
    <Page title={t("prompts")} engines>
      <p className="text-sm text-pretty text-muted-foreground">{tPrompts("description")}</p>
      {prompts.length > 0 && <ReportFilterBar topics={topics} topicFilter={false} />}
      <PromptManager
        projectId={report.project.id}
        plan={plan}
        limit={limits.prompts}
        initialPrompts={allPrompts}
        results={report.prompts}
        brands={[brand, ...competitors]}
        series={seriesBrands(report.project)}
        youId={brand.id}
        collectedAt={report.method.collectedAt}
        filters={filters}
        initialSuggestions={suggestions}
        filename={`${brand.domain}-questions-${report.method.collectedAt.slice(0, 10)}`}
        nextRunAt={report.nextRunAt}
        wrongFacts={report.wrongFacts}
        wrongFactsHref={withFilters(`/projects/${report.project.id}/wrong-facts`, filters)}
      />
      {report.prompts.length > 0 && <MethodLabel method={report.method} />}
    </Page>
  );
}
