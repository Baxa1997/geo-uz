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
import { AutoPrint } from "../components/auto-print";
import { ReportBody } from "../components/report-body";
import { ReportHeader } from "../components/report-header";

type Props = PageProps<"/[locale]/projects/[id]/report">;

// Shared by generateMetadata and the page within one request: the latest report, or a past run's (`?run=`)
const getReport = cache((id: string, run?: string) => orNotFound(run ? api.getRunReport(id, run) : api.getReport(id, "week")));

const runOf = (query: Record<string, string | string[] | undefined>) => (typeof query.run === "string" ? query.run : undefined);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [report, t] = await Promise.all([getReport(id, runOf(await searchParams)), getTranslations({ locale, namespace: "Report" })]);
  return { title: t("metaTitle", { brand: report.project.brand.name }) };
}

/**
 * The client-facing report of the latest check: no workspace navigation, readable without login, so its
 * link can be shared and sent in Telegram, and laid out for A4, so the print dialog saves it as a PDF.
 *
 * It follows the order of a standard business report, each section numbered: a title block (what, about
 * whom, period, date, scope, assistant); an executive summary that answers first (where the client stands,
 * the findings, what to do first); what changed since the report before; the key figures against the previous check and the strongest
 * competitor; the evidence (position among the brands, topics won and lost, sources, wrong facts); the
 * recommendations in order of effect, with what is already done; then the method with its limits, the
 * definitions, and every question as an appendix. A reader who stops after the first section has the
 * decision; the rest lets them check it. `?run=` opens a past week's report (Hisobotlar links it), and
 * `?print=1` opens the print window at once (Hisobotlar's "PDF").
 */
export default async function ReportPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const query = await searchParams;
  const [report, actions, t] = await Promise.all([getReport(id, runOf(query)), orNotFound(api.getActions(id)), getTranslations({ locale, namespace: "Report" })]);

  return (
    // Its chart, tools and appendix translate in the browser; nothing here saves, so no data cache
    <NextIntlClientProvider>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:py-10 print:max-w-none print:gap-7 print:p-0">
        {query.print === "1" && <AutoPrint />}
        <ReportHeader report={report} />
        {report.prompts.length === 0 ? (
          <NoData projectId={report.project.id} />
        ) : (
          <ReportBody report={report} actions={actions} />
        )}
        <footer className="border-t pt-4 text-xs text-pretty text-muted-foreground">
          {t("footer", { date: formatLongDate(report.method.collectedAt, locale, TIME_ZONE) })}
        </footer>
      </main>
    </NextIntlClientProvider>
  );
}
