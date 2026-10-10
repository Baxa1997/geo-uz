import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { FilterX } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Page } from "@/shared/components/page";
import { PageSection } from "@/shared/components/page-section";
import { PageTabs } from "@/shared/components/page-tabs";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { normalizeDomain, SITE_SLOT } from "@/shared/helpers/domain";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { percentIn } from "@/shared/helpers/sources";
import { MoversCard } from "../components/movers-card";
import { MoversDescription } from "../components/movers-description";
import { PagesTable } from "../components/pages-table";
import { SiteAnswers } from "../components/site-answers";
import { SourceBrands } from "../components/source-brands";
import { SourceHeader } from "../components/source-header";
import { SourceVerdict } from "../components/source-verdict";
import { SourcesChart } from "../components/sources-chart";
import { pageMovers } from "@/shared/helpers/source-movers";
import { pageLines } from "../helpers/lines";

type Props = PageProps<"/[locale]/projects/[id]/sources/[domain]">;

/** The domain as written in the address: "2gis.uz", or an encoded one. */
function domainOf(segment: string): string {
  try {
    return normalizeDomain(decodeURIComponent(segment));
  } catch {
    return normalizeDomain(segment);
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, domain } = await params;
  const locale = setPageLocale(segment);
  const t = await getTranslations({ locale, namespace: "Sidebar" });
  return { title: `${domainOf(domain)} — ${t("sources")}` };
}

/**
 * One cited site, laid out like Peec's domain page (Sources › Domains › a site), opened from any site on
 * the sources page, the Overview or a question's page. Its two views are tabs under the filters, as on
 * Peec: Pages (the default) and Answers (`?tab=answers`, `&page=` for the answers citing one page).
 *
 * Pages: the site's mark, name and link, its facts in a strip across the panel; a sentence on what it
 * means for the client, with a link to the fix that gets the client listed; "Overview", the whole site and
 * its most cited pages over the checks; "What changed", its pages cited for the first time, more and less,
 * beside who ChatGPT names when it relies on the site (where Peec has URL types); then its pages in a
 * table. Answers: the answers citing the site, each opening like a chat.
 *
 * A site the latest check didn't cite (it shows among the falling sites) keeps its page: the facts the
 * history has, the sentence, the chart, and no tabs.
 */
export default async function SourcePage({ params, searchParams }: Props) {
  const { locale: segment, id, domain: raw } = await params;
  const locale = setPageLocale(segment);
  const domain = domainOf(raw);
  const query = await searchParams;
  const [{ report, filters, topics }, actions, t, tSources, tPage, tFilters] = await Promise.all([
    loadReport(id, query),
    orNotFound(api.getActions(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "SourcesPage" }),
    getTranslations({ locale, namespace: "SourcePage" }),
    getTranslations({ locale, namespace: "Filters" }),
  ]);
  const { project } = report;
  const base = `/projects/${project.id}`;
  const home = withFilters(`${base}/sources`, filters);
  const crumbs = [
    { href: home, label: t("sources") },
    { href: home, label: tSources("views.sites") },
  ];
  const toolbar = <ReportFilterBar topics={topics} />;

  const source = report.topSources.find((candidate) => candidate.domain === domain);
  const history = report.sourceHistory;
  // The site in the checks that cited it, oldest first
  const cited = history.flatMap((point) => point.sources.filter((candidate) => candidate.domain === domain).map((past) => ({ point, past })));
  const last = cited.at(-1);
  if (!source && !last) {
    // Nothing under these filters; without them the site may well be there
    if (!hasFilters(filters)) notFound();
    return (
      <Page title={domain} crumbs={crumbs} engines toolbar={toolbar}>
        <EmptyState icon={FilterX} title={tFilters("emptyTitle")} text={tPage("verdict.filtered")}>
          <Link href={`${base}/sources/${encodeURIComponent(domain)}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {tFilters("reset")}
          </Link>
        </EmptyState>
      </Page>
    );
  }

  const type = source?.type ?? last?.past.type ?? "other";
  const brands = seriesBrands(project);
  const sitePattern = withFilters(`${base}/sources/${SITE_SLOT}`, filters);
  const here = withFilters(`${base}/sources/${encodeURIComponent(domain)}`, filters);
  const tab = source && query.tab === "answers" ? "answers" : "pages";
  const tabs = source && (
    <div data-tour="views" className="w-fit max-w-full">
      <PageTabs
        label={tPage("tabs.label")}
        current={tab}
        tabs={[
          { key: "pages", label: tPage("tabs.pages"), href: here, hint: tPage("tabHints.pages") },
          { key: "answers", label: tPage("tabs.answers"), href: withFilters(`${base}/sources/${encodeURIComponent(domain)}`, filters, { tab: "answers" }), hint: tPage("tabHints.answers") },
        ]}
      />
    </div>
  );

  if (source && tab === "answers") {
    return (
      <Page title={domain} crumbs={crumbs} engines toolbar={toolbar} tabs={tabs}>
        <div className="flex flex-col gap-8 sm:gap-10">
          <SiteAnswers
            // Keyed: a link to another page of the site starts its answers, even from this same view
            key={typeof query.page === "string" ? query.page : ""}
            report={report}
            source={source}
            brands={brands}
            filters={filters}
            initialPage={typeof query.page === "string" ? query.page : ""}
            answersHref={withFilters(`${base}/answers`, filters, { source: domain })}
          />
          <MethodLabel method={report.method} />
        </div>
      </Page>
    );
  }

  const answers = report.prompts.flatMap((result) => result.answers).filter((answer) => answer.citations.some((citation) => citation.domain === domain));
  const named = answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === project.brand.id)).length;
  const owner = project.competitors.find((competitor) => normalizeDomain(competitor.domain) === domain)?.name ?? null;
  const onPages = new Set(source?.pages.flatMap((page) => page.mentions ?? []));
  const rivals = project.competitors.filter((competitor) => onPages.has(competitor.id)).map((competitor) => competitor.name);
  // The fix that gets the client onto this site, unless the client turned it down
  const action = actions.find((candidate) => candidate.kind === "listing" && candidate.domain === domain && candidate.status !== "declined");
  const total = totalAnswers(report.prompts);
  // The pages the chart draws: the latest check's, or the last ones the history has
  const pages = source?.pages ?? [...(last?.past.pages ?? [])].sort((a, b) => b.count - a.count);
  const lines = pageLines(domain, type === "own", pages, tPage("chart.whole"), sitePattern);
  const movers = pageMovers(history, domain);

  return (
    <Page title={domain} crumbs={crumbs} engines tour="source" toolbar={toolbar} tabs={tabs}>
      <div data-tour="header">
        <SourceHeader
          domain={domain}
          type={type}
          source={source}
          now={percentIn(history.at(-1), domain)}
          before={history.length > 1 ? percentIn(history.at(-2), domain) : null}
          owner={owner}
          lastCited={source ? null : (last?.point.collectedAt ?? null)}
        />
      </div>
      <div data-tour="verdict">
        <SourceVerdict
          domain={domain}
          source={source}
          share={source && total > 0 ? source.count / total : 0}
          named={named}
          rivals={rivals}
          owner={owner}
          collectedAt={report.method.collectedAt}
          lastCited={source ? null : (last?.point.collectedAt ?? null)}
          actionHref={action && source && !source.brandListed ? withFilters(`${base}/actions`, filters, { action: action.id }) : undefined}
        />
      </div>
      <div className="mt-3 flex flex-col gap-8 sm:gap-10">
        <PageSection tour="chart" title={tSources("sections.overview.title")} description={tPage(lines.length > 1 ? "sections.overview" : "sections.overviewOne")}>
          <SourcesChart
            title={tPage("chart.title")}
            hint={tPage("chart.hint")}
            label={tPage("chart.label", { domain, checks: history.length })}
            history={history}
            lines={lines}
          />
        </PageSection>
        {source && (
          <>
            <PageSection tour="movers" title={tSources("sections.movers.title")} description={<MoversDescription comparedWith={movers?.comparedWith ?? null} scope="site" />}>
              {/* Two cards side by side once the panel is wide enough; it narrows when GEO AI is open */}
              <div className="@container">
                <div className="grid gap-4 @3xl:grid-cols-2">
                  <MoversCard movers={movers} sitePattern={sitePattern} naming="path" />
                  <SourceBrands answers={answers} brands={brands} />
                </div>
              </div>
            </PageSection>
            <PagesTable
              site
              sources={[source]}
              totalAnswers={total}
              youId={project.brand.id}
              brands={brands}
              filename={`${domain}-${report.method.collectedAt.slice(0, 10)}`}
              sitePattern={sitePattern}
            />
          </>
        )}
        <MethodLabel method={report.method} />
      </div>
    </Page>
  );
}
