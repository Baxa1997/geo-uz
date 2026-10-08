import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { FilterX } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { normalizeDomain } from "@/shared/helpers/domain";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { percentIn } from "@/shared/helpers/sources";
import { SourceBrands } from "../components/source-brands";
import { SourceHeader } from "../components/source-header";
import { SourceTabs } from "../components/source-tabs";
import { SourceVerdict } from "../components/source-verdict";
import { SourcesChart } from "../components/sources-chart";
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
 * the sources page, the Overview or a question's page. The site with its facts; a sentence on what it
 * means for the client, with a link to the fix that gets the client listed; the site over the checks (the
 * whole site and its most cited pages) beside who ChatGPT names when it relies on the site; then its pages
 * and the answers that cite it as two tabs. An answer opens like a chat, and from there the question's own
 * page. `?tab=answers&page=` opens the answers citing one page.
 *
 * A site the latest check didn't cite (it shows among the falling sites) keeps its page: the facts the
 * history has, the sentence, the chart. Left out of Peec's page: "URL movers" (a local site has a few cited
 * pages: each page's change is in the table) and URL types (they need classifying in the backend).
 */
export default async function SourcePage({ params, searchParams }: Props) {
  const { locale: segment, id, domain: raw } = await params;
  const locale = setPageLocale(segment);
  const domain = domainOf(raw);
  const query = await searchParams;
  const [{ report, filters, topics }, actions, t, tPage, tFilters] = await Promise.all([
    loadReport(id, query),
    orNotFound(api.getActions(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "SourcePage" }),
    getTranslations({ locale, namespace: "Filters" }),
  ]);
  const { project } = report;
  const base = `/projects/${project.id}`;
  const crumb = { href: withFilters(`${base}/sources`, filters), label: t("sources") };

  const source = report.topSources.find((candidate) => candidate.domain === domain);
  const history = report.sourceHistory;
  // The site in the checks that cited it, oldest first
  const cited = history.flatMap((point) => point.sources.filter((candidate) => candidate.domain === domain).map((past) => ({ point, past })));
  const last = cited.at(-1);
  if (!source && !last) {
    // Nothing under these filters; without them the site may well be there
    if (!hasFilters(filters)) notFound();
    return (
      <Page title={domain} crumb={crumb} engines>
        <ReportFilterBar topics={topics} />
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
  const lines = pageLines(domain, type === "own", pages, tPage("chart.whole"));
  const chart = (className?: string) => (
    <SourcesChart
      className={className}
      title={tPage("chart.title")}
      hint={tPage("chart.hint")}
      footer={tPage(lines.length > 1 ? "chart.footer" : "chart.footerOne")}
      label={tPage("chart.label", { domain, checks: history.length })}
      history={history}
      lines={lines}
    />
  );
  const { tab, page } = query;

  return (
    <Page title={domain} crumb={crumb} engines>
      <ReportFilterBar topics={topics} />
      <SourceHeader
        domain={domain}
        type={type}
        source={source}
        now={percentIn(history.at(-1), domain)}
        before={history.length > 1 ? percentIn(history.at(-2), domain) : null}
        owner={owner}
        lastCited={source ? null : (last?.point.collectedAt ?? null)}
      />
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
      {source ? (
        <>
          {/* Columns follow the panel's width, which shrinks when GEO AI is open */}
          <div className="@container">
            <div className="grid gap-4 sm:gap-5 @4xl:grid-cols-5">
              {chart("@4xl:col-span-3")}
              <SourceBrands className="@4xl:col-span-2" answers={answers} brands={brands} />
            </div>
          </div>
          <SourceTabs
            // Keyed: a link to another tab or page opens it, even from this same page
            key={`${tab}:${page}`}
            report={report}
            source={source}
            brands={brands}
            filters={filters}
            initialTab={tab === "answers" ? "answers" : "pages"}
            initialPage={typeof page === "string" ? page : ""}
            answersHref={withFilters(`${base}/answers`, filters, { source: domain })}
          />
        </>
      ) : (
        chart()
      )}
      <MethodLabel method={report.method} />
    </Page>
  );
}
