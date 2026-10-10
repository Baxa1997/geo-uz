import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { getPathname } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { REPORT_SECTIONS } from "../constants";
import { ReportBody, sectionNumber } from "../components/report-body";
import { ReportContents } from "../components/report-contents";
import { ReportCover } from "../components/report-cover";
import { ReportShare } from "../components/report-share";

type Props = PageProps<"/[locale]/projects/[id]/reports/[runId]">;

// Shared by generateMetadata and the page within one request
const getRunReport = cache((id: string, runId: string) => orNotFound(api.getRunReport(id, runId)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id, runId } = await params;
  const locale = setPageLocale(segment);
  const [report, t] = await Promise.all([getRunReport(id, decodeURIComponent(runId)), getTranslations({ locale, namespace: "Reports" })]);
  return { title: `${t("detail.title", { date: formatLongDate(report.method.collectedAt, locale, TIME_ZONE) })} — ${report.project.brand.name}` };
}

/**
 * One weekly report in the workspace, as it stood after its check: its cover first (the week, the
 * headline, the client's visibility with its change and its line, how much was asked, and its ways out:
 * link, Telegram, PDF), then the numbered contents beside its sections, the same as the shared report's:
 * the answer, what changed since the report before, the evidence, the recommendations, the method, the
 * definitions and every question.
 */
export default async function ReportDetailPage({ params }: Props) {
  const { locale: segment, id, runId: rawRunId } = await params;
  const locale = setPageLocale(segment);
  const runId = decodeURIComponent(rawRunId);
  const [report, actions, t, tReports, tReport] = await Promise.all([
    getRunReport(id, runId),
    orNotFound(api.getActions(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "Reports" }),
    getTranslations({ locale, namespace: "Report" }),
  ]);
  const { project, method } = report;
  const date = formatLongDate(method.collectedAt, locale, TIME_ZONE);
  const crumbs = [{ href: `/projects/${project.id}/reports`, label: t("reports") }];

  if (report.prompts.length === 0) {
    return (
      <Page title={tReports("detail.title", { date })} crumbs={crumbs} engines>
        <NoData projectId={project.id} />
      </Page>
    );
  }

  const shared = getPathname({ href: { pathname: `/projects/${project.id}/report`, query: { run: runId } }, locale });
  const sections = REPORT_SECTIONS.map((key) => ({ id: key, number: sectionNumber(key), title: tReport(`sections.${key}`) }));

  return (
    <Page title={tReports("detail.title", { date })} crumbs={crumbs} engines tour="reportDetail">
      <ReportCover report={report} variant="page" share={<ReportShare path={shared} text={tReports("share.text", { brand: project.brand.name, date })} onCover />} />
      {/* Contents beside the report once the panel is wide enough; it narrows when GEO AI is open */}
      <div className="@container mt-4">
        <div className="grid gap-8 @5xl:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden @5xl:block">
            <div className="sticky top-20">
              <ReportContents sections={sections} />
            </div>
          </aside>
          {/* Clear of the page's sticky title when the contents jump to a section */}
          <div className="flex max-w-5xl min-w-0 flex-col gap-10 [&_section]:scroll-mt-20">
            <ReportBody report={report} actions={actions} cover />
          </div>
        </div>
      </div>
    </Page>
  );
}
