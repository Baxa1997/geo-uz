import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { NoData } from "@/shared/components/no-data";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { Accuracy } from "../components/accuracy";
import { CompetitivePosition } from "../components/competitive-position";
import { ExecutiveSummary } from "../components/executive-summary";
import { Glossary, Method } from "../components/method";
import { PromptTable } from "../components/prompt-table";
import { Recommendations } from "../components/recommendations";
import { ReportHeader } from "../components/report-header";
import { ReportSection } from "../components/report-parts";
import { Scorecard } from "../components/scorecard";
import { Sources } from "../components/sources";
import { Topics } from "../components/topics";

type Props = PageProps<"/[locale]/projects/[id]/report">;

// Shared by generateMetadata and the page within one request
const getReport = cache((id: string) => orNotFound(api.getReport(id, "week")));

/** The sections in the order they are numbered: the answer first, the evidence, what to do, then how it was measured. */
const SECTIONS = ["summary", "scorecard", "competitors", "topics", "sources", "accuracy", "actions", "method", "glossary", "appendix"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [report, t] = await Promise.all([getReport(id), getTranslations({ locale, namespace: "Report" })]);
  return { title: t("metaTitle", { brand: report.project.brand.name }) };
}

/**
 * The client-facing report of the latest check: no workspace navigation, readable without login, so its
 * link can be shared and sent in Telegram, and laid out for A4, so the print dialog saves it as a PDF.
 *
 * It follows the order of a standard business report, each section numbered: a title block (what, about
 * whom, period, date, scope, assistant); an executive summary that answers first (where the client stands,
 * the findings, what to do first); the key figures against the previous check and the strongest
 * competitor; the evidence (position among the brands, topics won and lost, sources, wrong facts); the
 * recommendations in order of effect, with what is already done; then the method with its limits, the
 * definitions, and every question as an appendix. A reader who stops after the first section has the
 * decision; the rest lets them check it.
 */
export default async function ReportPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [report, actions, t] = await Promise.all([getReport(id), orNotFound(api.getActions(id)), getTranslations({ locale, namespace: "Report" })]);
  const { brand, competitors } = report.project;
  const number = (section: (typeof SECTIONS)[number]) => SECTIONS.indexOf(section) + 1;
  const title = (section: (typeof SECTIONS)[number]) => t(`sections.${section}`);

  return (
    // Its chart, tools and appendix translate in the browser; nothing here saves, so no data cache
    <NextIntlClientProvider>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:py-10 print:max-w-none print:gap-7 print:p-0">
        <ReportHeader report={report} />
        {report.prompts.length === 0 ? (
          <NoData projectId={report.project.id} />
        ) : (
          <>
            <ReportSection id="summary" number={number("summary")} title={title("summary")}>
              <ExecutiveSummary report={report} actions={actions} actionsSection={number("actions")} />
            </ReportSection>
            <ReportSection id="scorecard" number={number("scorecard")} title={title("scorecard")} lead={t("scorecard.lead")}>
              <Scorecard report={report} />
            </ReportSection>
            <ReportSection id="competitors" number={number("competitors")} title={title("competitors")} lead={t("competitors.lead")} splits>
              <CompetitivePosition report={report} />
            </ReportSection>
            <ReportSection id="topics" number={number("topics")} title={title("topics")} lead={t("topics.lead")} splits>
              <Topics report={report} />
            </ReportSection>
            <ReportSection id="sources" number={number("sources")} title={title("sources")} lead={t("sources.lead")}>
              <Sources report={report} />
            </ReportSection>
            <ReportSection id="accuracy" number={number("accuracy")} title={title("accuracy")} lead={t("accuracy.lead")} splits>
              <Accuracy report={report} />
            </ReportSection>
            <ReportSection id="actions" number={number("actions")} title={title("actions")} lead={t("actions.lead")} splits>
              <Recommendations report={report} actions={actions} />
            </ReportSection>
            <ReportSection id="method" number={number("method")} title={title("method")} lead={t("method.lead")}>
              <Method report={report} />
            </ReportSection>
            <ReportSection id="glossary" number={number("glossary")} title={title("glossary")}>
              <Glossary />
            </ReportSection>
            <ReportSection id="appendix" number={number("appendix")} title={title("appendix")} lead={t("appendix.lead")} splits>
              <PromptTable results={report.prompts} brands={[brand, ...competitors]} youId={brand.id} />
            </ReportSection>
          </>
        )}
        <footer className="border-t pt-4 text-xs text-pretty text-muted-foreground">
          {t("footer", { date: formatLongDate(report.method.collectedAt, locale, TIME_ZONE) })}
        </footer>
      </main>
    </NextIntlClientProvider>
  );
}
