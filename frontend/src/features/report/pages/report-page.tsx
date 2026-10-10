import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { NoData } from "@/shared/components/no-data";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { AutoPrint } from "../components/auto-print";
import { ReportBody } from "../components/report-body";
import { ReportToolbar } from "../components/report-header";

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
 * The client-facing status report of the latest check: no workspace navigation, readable without login,
 * so its link can be shared and sent in Telegram, and laid out for A4, so the print dialog saves it as a
 * PDF. On screen it is one white paper on a gray ground, as an official document; on paper it is the pages.
 *
 * It runs as a business status report does, every section numbered, in four parts: the letterhead; the
 * condition (an executive summary with the overall score, the five areas, the week's highlights and the
 * decisions needed; the key figures; what changed); the analysis of each area, opening with its status
 * and conclusion (competitors, topics, sources, accuracy and tone); the decisions (risks and
 * opportunities, the action plan); the reference (method with its limits, definitions, every question).
 * A reader who stops after the summary has the decision; the rest lets them check it. `?run=` opens a
 * past week's report (Hisobotlar links it), and `?print=1` opens the print window at once (Hisobotlar's
 * "PDF").
 */
export default async function ReportPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  setPageLocale(segment);
  const query = await searchParams;
  const [report, actions] = await Promise.all([getReport(id, runOf(query)), orNotFound(api.getActions(id))]);

  return (
    // Its chart, tools and appendix translate in the browser; nothing here saves, so no data cache
    <NextIntlClientProvider>
      <div className="min-h-svh bg-muted/60 print:min-h-0 print:bg-transparent">
        <main className="flex w-full flex-col gap-3 px-3 py-4 sm:px-4 sm:py-6 print:p-0">
          {query.print === "1" && <AutoPrint />}
          <ReportToolbar />
          {report.prompts.length === 0 ? (
            <div className="mx-auto w-full max-w-224">
              <NoData projectId={report.project.id} />
            </div>
          ) : (
            <ReportBody report={report} actions={actions} />
          )}
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
