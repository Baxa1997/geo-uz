import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { KpiStrip } from "@/shared/components/scores/kpi-strip";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { formatPercent } from "@/shared/helpers/numbers";
import { hasFilters } from "@/shared/helpers/report-filters";
import { seriesBrands } from "@/shared/helpers/scores";
import { AnswersTable } from "../components/answers-table";

type Props = PageProps<"/[locale]/projects/[id]/answers">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("answers")} — ${project.brand.name}` };
}

/**
 * Every ChatGPT answer of the latest run, laid out like Peec's Chats page: the answers in numbers (how
 * many name the client, speak badly of it, name nobody, used a web search), then a table of them, grouped
 * by question, that opens each one like a chat and exports as CSV. ?prompt= opens a question's first
 * answer and ?source= lists the answers citing a site: numbers on other pages link here.
 */
export default async function AnswersPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const query = await searchParams;
  const [{ report, prompts, filters, topics }, t, tAnswers] = await Promise.all([
    loadReport(id, query),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "AnswersPage" }),
  ]);
  const promptId = typeof query.prompt === "string" ? query.prompt : undefined;
  const source = typeof query.source === "string" ? query.source : undefined;
  const base = `/projects/${report.project.id}`;

  if (report.prompts.length === 0) {
    return (
      <Page title={t("answers")} engines>
        {hasFilters(filters) ? (
          <>
            <ReportFilterBar topics={topics} />
            <FilteredEmpty resetHref={`${base}/answers`} />
          </>
        ) : (
          <NoData projectId={report.project.id} promptCount={prompts.length} />
        )}
      </Page>
    );
  }

  const { brand } = report.project;
  const brands = seriesBrands(report.project);
  const answers = report.prompts.flatMap((result) => result.answers);
  const share = (count: number) => formatPercent(answers.length ? count / answers.length : 0, locale);
  // Numbers about the answers themselves. What they say of sources and of competitors is on those pages
  const named = answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === brand.id)).length;
  const negative = answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === brand.id && mention.tone === "negative")).length;
  const nobody = answers.filter((answer) => answer.mentions.length === 0).length;
  const searched = answers.filter((answer) => answer.searches.length > 0).length;

  return (
    <Page title={t("answers")} engines>
      <ReportFilterBar topics={topics} />
      <KpiStrip
        items={[
          {
            key: "total",
            label: tAnswers("kpi.total"),
            hint: tAnswers("kpi.totalHint", { samples: report.method.samples }),
            value: String(answers.length),
          },
          { key: "named", label: tAnswers("kpi.named"), hint: tAnswers("kpi.namedHint"), value: String(named), note: share(named) },
          { key: "negative", label: tAnswers("kpi.negative"), hint: tAnswers("kpi.negativeHint"), value: String(negative) },
          { key: "nobody", label: tAnswers("kpi.nobody"), hint: tAnswers("kpi.nobodyHint"), value: String(nobody), note: share(nobody) },
          { key: "searched", label: tAnswers("kpi.searched"), hint: tAnswers("kpi.searchedHint"), value: String(searched), note: share(searched) },
        ]}
      />
      <AnswersTable
        // Keyed: a link to another question or site opens it, even from this same page
        key={`${promptId}:${source}`}
        report={report}
        brands={brands}
        initialPromptId={promptId}
        initialSource={source}
        filters={filters}
      />
      <MethodLabel method={report.method} />
    </Page>
  );
}
