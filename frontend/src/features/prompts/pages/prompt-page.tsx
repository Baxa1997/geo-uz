import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Page } from "@/shared/components/page";
import { PageSection } from "@/shared/components/page-section";
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
import { PromptFilters } from "../components/prompt-filters";
import { PromptHeader } from "../components/prompt-header";
import { PromptQueued } from "../components/prompt-queued";
import { PromptSearches } from "../components/prompt-searches";
import { PromptVerdict } from "../components/prompt-verdict";
import { inPeriod, parsePromptFilters, shownBrands, shownSources } from "../helpers/prompt-filters";

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
 * One question, laid out like Peec's prompt page: its filters in the strip under the title (the checks
 * shown, then "All filters": the competitors to compare with and the kinds of sites to count); the question
 * with its facts across the panel (added, topic, language, city, status); "Overview": a sentence on how its
 * latest answers went, every brand over time beside the brands table; "Source distribution": the sites
 * cited beside their kinds; what ChatGPT searched the web for beside what to do about the question; then
 * the answers themselves, all for this question alone. A question no check has asked yet says when it will
 * be asked; an archived one keeps its results up to its last check.
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
  const query = await searchParams;
  const filters = parseReportFilters(query);
  const own = parsePromptFilters(query);
  const result = report.prompts[0];
  const tracked = prompts.filter(isTracked).length;
  const history = inPeriod(report.history, own.period);
  const compared = shownBrands(brands, own.brands);
  const sources = shownSources(report.topSources, own.kinds);
  // The kinds this question's answers cite, the ones a filter can pick from
  const kinds = [...new Set(report.topSources.map((source) => source.type))];

  return (
    <Page
      title={prompt.text}
      crumbs={[{ href: withFilters(`${base}/prompts`, filters), label: t("prompts") }]}
      engines
      tour={result ? "prompt" : undefined}
      toolbar={result ? <PromptFilters brands={brands} kinds={kinds} /> : undefined}
    >
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
          <PageSection title={tPage("sections.overview")} description={tPage("sections.overviewText")}>
            <div data-tour="verdict">
              <PromptVerdict report={report} result={result} />
            </div>
            {/* Columns follow the panel's width, which shrinks when GEO AI is open */}
            <div className="@container">
              <div className="grid gap-4 @4xl:grid-cols-2">
                <div data-tour="trend" className="grid">
                  <TrendPanel
                    expandable
                    title={tOverview("trendTitle")}
                    hint={tPage("trendHint", { samples: report.method.samples })}
                    history={history}
                    brands={compared}
                  />
                </div>
                <BrandTable
                  expandable
                  history={history}
                  brands={compared}
                  title={tTable("titleShort")}
                  // A first check has no week before it to compare with
                  description={tPage(history.length > 1 ? "brandsHint" : "brandsHintFirst")}
                />
              </div>
            </div>
          </PageSection>

          <PageSection tour="sources" title={tPage("sections.sources")} description={tPage("sections.sourcesText")}>
            <div className="@container">
              <div className="grid gap-4 @4xl:grid-cols-2">
                <TopDomains
                  expandable
                  sources={sources}
                  totalAnswers={totalAnswers(report.prompts)}
                  youId={project.brand.id}
                  limit={TOP_SOURCES}
                  // A site's page covers every question, not this one alone
                  sitePattern={withFilters(`${base}/sources/${SITE_SLOT}`, filters)}
                />
                <SourceTypesChart expandable sources={sources} />
              </div>
            </div>
          </PageSection>

          {/* The searches behind the answers, then what to do: it follows from the numbers above. An archived question has nothing to do */}
          <div className="@container">
            <div className={cn("grid gap-4", isTracked(prompt) && "@4xl:grid-cols-2")}>
              <div data-tour="searches" className="grid">
                <PromptSearches result={result} />
              </div>
              {isTracked(prompt) && (
                <div data-tour="todo" className="grid">
                  <PromptActions
                    actions={actions.filter((action) => action.promptIds.includes(prompt.id))}
                    href={(actionId) => (actionId ? `${base}/actions?action=${encodeURIComponent(actionId)}` : `${base}/actions`)}
                  />
                </div>
              )}
            </div>
          </div>

          <div data-tour="answers">
            <PromptAnswers
              result={result}
              project={project}
              brands={brands}
              collectedAt={report.method.collectedAt}
              engine={report.method.engine}
              allHref={isTracked(prompt) ? `${base}/answers` : undefined}
            />
          </div>

          <MethodLabel method={report.method} />
        </>
      )}
    </Page>
  );
}
