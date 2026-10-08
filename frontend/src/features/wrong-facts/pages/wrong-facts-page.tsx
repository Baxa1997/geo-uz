import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { KpiStrip } from "@/shared/components/scores/kpi-strip";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { TIME_ZONE } from "@/shared/constants";
import { formatShortDate } from "@/shared/helpers/dates";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { WrongFactsTable } from "../components/wrong-facts-table";

type Props = PageProps<"/[locale]/projects/[id]/wrong-facts">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("wrongFacts")} — ${project.brand.name}` };
}

/** What ChatGPT says about the brand that isn't true, in numbers and one row each, with the question it came up in. */
export default async function WrongFactsPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [{ report, prompts, filters, topics }, t, tFacts] = await Promise.all([
    loadReport(id, await searchParams),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "WrongFactsPage" }),
  ]);
  const base = `/projects/${report.project.id}`;

  if (report.prompts.length === 0) {
    return (
      <Page title={t("wrongFacts")} engines toolbar={hasFilters(filters) && <ReportFilterBar topics={topics} />}>
        {hasFilters(filters) ? <FilteredEmpty resetHref={`${base}/wrong-facts`} /> : <NoData projectId={report.project.id} promptCount={prompts.length} />}
      </Page>
    );
  }

  const facts = report.wrongFacts;
  const first = facts.map((fact) => fact.foundAt).sort()[0];

  return (
    <Page title={t("wrongFacts")} engines toolbar={<ReportFilterBar topics={topics} />}>
      <KpiStrip
        items={[
          { key: "count", label: tFacts("kpi.count"), hint: tFacts("kpi.countHint"), value: String(facts.length) },
          {
            key: "questions",
            label: tFacts("kpi.questions"),
            hint: tFacts("kpi.questionsHint"),
            value: String(new Set(facts.map((fact) => fact.promptId)).size),
          },
          {
            key: "since",
            label: tFacts("kpi.since"),
            hint: tFacts("kpi.sinceHint"),
            value: first ? formatShortDate(first, locale, TIME_ZONE) : null,
          },
        ]}
      />
      <WrongFactsTable
        facts={facts}
        prompts={report.prompts}
        answersHref={(promptId) => withFilters(`${base}/answers`, filters, { prompt: promptId })}
        actionsHref={`${base}/actions`}
      />
      <MethodLabel method={report.method} />
    </Page>
  );
}
