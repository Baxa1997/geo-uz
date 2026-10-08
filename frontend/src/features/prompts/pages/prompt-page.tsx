import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Page } from "@/shared/components/page";
import { BrandTable } from "@/shared/components/scores/brand-table";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { SourceTypesChart } from "@/shared/components/scores/source-types-chart";
import { TopDomains } from "@/shared/components/scores/top-domains";
import { TrendPanel } from "@/shared/components/scores/trend-panel";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { SITE_SLOT } from "@/shared/helpers/domain";
import { isTracked } from "@/shared/helpers/prompts";
import { parseReportFilters, withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import { PromptActions } from "../components/prompt-actions";
import { PromptAnswers } from "../components/prompt-answers";
import { PromptHeader } from "../components/prompt-header";
import { PromptQueued } from "../components/prompt-queued";
import { PromptSearches } from "../components/prompt-searches";
import { PromptVerdict } from "../components/prompt-verdict";

type Props = PageProps<"/[locale]/projects/[id]/prompts/[promptId]">;

const TOP_SOURCES = 7;

const getPrompts = cache((id: string) => orNotFound(api.getPrompts(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id, promptId } = await params;
  const locale = setPageLocale(segment);
  const [prompts, t] = await Promise.all([getPrompts(id), getTranslations({ locale, namespace: "Sidebar" })]);
  const prompt = prompts.find((candidate) => candidate.id === promptId);
  return { title: prompt ? `${prompt.text} — ${t("prompts")}` : t("prompts") };
}

/**
 * One question, laid out like Peec's prompt page: the question with when it was added, its topic,
 * language, city and status; a sentence on how its latest answers went; every brand over time beside the
 * brands table, and the sites cited beside their kinds, all for this question alone; what ChatGPT searched
 * the web for beside what to do about the question; then the answers themselves. A question no check has asked yet says when it will be asked; an
 * archived one keeps its results up to its last check.
 */
export default async function PromptPage({ params, searchParams }: Props) {
  const { locale: segment, id, promptId } = await params;
  const locale = setPageLocale(segment);
  const [prompts, report, actions, t, tPage, tOverview, tTable] = await Promise.all([
    getPrompts(id),
    orNotFound(api.getPromptReport(id, promptId)),
    orNotFound(api.getActions(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "PromptPage" }),
    getTranslations({ locale, namespace: "Overview" }),
    getTranslations({ locale, namespace: "BrandTable" }),
  ]);
  const prompt = prompts.find((candidate) => candidate.id === promptId);
  if (!prompt) notFound();

  const { project } = report;
  const brands = seriesBrands(project);
  const base = `/projects/${project.id}`;
  // The list's language and topic come along, so the way back leads to the same list
  const filters = parseReportFilters(await searchParams);
  const result = report.prompts[0];
  const tracked = prompts.filter(isTracked).length;

  return (
    <Page title={prompt.text} crumbs={[{ href: withFilters(`${base}/prompts`, filters), label: t("prompts") }]} engines>
      <PromptHeader
        prompt={prompt}
        project={project}
        asked={Boolean(result)}
        nextRunAt={report.nextRunAt}
        // Tracking it again needs room in the plan
        full={tracked >= project.limits.prompts}
      />

      {!result ? (
        <PromptQueued archived={!isTracked(prompt)} nextRunAt={report.nextRunAt} />
      ) : (
        <>
          <PromptVerdict report={report} result={result} />

          {/* Columns follow the panel's width, which shrinks when GEO AI is open */}
          <div className="@container">
            <div className="grid gap-4 sm:gap-5 @4xl:grid-cols-2">
              <TrendPanel
                expandable
                title={tOverview("trendTitle")}
                hint={tPage("trendHint", { samples: report.method.samples })}
                history={report.history}
                brands={brands}
              />
              <BrandTable
                expandable
                history={report.history}
                brands={brands}
                title={tTable("titleShort")}
                // A first check has no week before it to compare with
                description={tPage(report.history.length > 1 ? "brandsHint" : "brandsHintFirst")}
              />
              <TopDomains
                expandable
                sources={report.topSources}
                totalAnswers={totalAnswers(report.prompts)}
                youId={project.brand.id}
                limit={TOP_SOURCES}
                // A site's page covers every question, not this one alone
                sitePattern={withFilters(`${base}/sources/${SITE_SLOT}`, filters)}
              />
              <SourceTypesChart expandable sources={report.topSources} />
            </div>
          </div>

          {/* The searches behind the answers, then what to do: it follows from the numbers above. An archived question has nothing to do */}
          <div className="@container">
            <div className={cn("grid gap-4 sm:gap-5", isTracked(prompt) && "@4xl:grid-cols-2")}>
              <PromptSearches result={result} />
              {isTracked(prompt) && (
                <PromptActions
                  actions={actions.filter((action) => action.promptIds.includes(prompt.id))}
                  href={(actionId) => (actionId ? `${base}/actions?action=${encodeURIComponent(actionId)}` : `${base}/actions`)}
                />
              )}
            </div>
          </div>

          <PromptAnswers
            result={result}
            project={project}
            brands={brands}
            collectedAt={report.method.collectedAt}
            engine={report.method.engine}
            allHref={isTracked(prompt) ? `${base}/answers` : undefined}
          />

          <MethodLabel method={report.method} />
        </>
      )}
    </Page>
  );
}
