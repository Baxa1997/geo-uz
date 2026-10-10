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
import { conditionStatus } from "@/shared/helpers/condition";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { REPORT_PARTS, SECTION_AREAS, sectionNumber, type ReportSectionKey } from "../constants";
import { ReportBody } from "../components/report-body";
import { ReportContents, type ContentsPart } from "../components/report-contents";
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
 * One weekly report in the workspace, as it stood after its check, laid out as an official document: one
 * white paper on a gray ground, the same as the shared report's (the letterhead, the condition, the analysis
 * of each area, the decisions, the sign-off, the reference), with its contents beside it as a panel of its own (the
 * report's overall status, the parts, each section with its area's status, the one being read marked). Its
 * number, its period and its ways out (link, Telegram, PDF) are in the strip under the page's title.
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
  const condition = report.conditionHistory.at(-1);
  const before = report.history.at(-2)?.collectedAt;
  const parts: ContentsPart[] = REPORT_PARTS.map((part) => ({
    key: part.key,
    title: tReport(`parts.${part.key}`),
    sections: part.sections.map((key: ReportSectionKey) => {
      const area = SECTION_AREAS[key];
      const score = area && condition ? condition.areas[area] : undefined;
      return {
        id: key,
        number: sectionNumber(key),
        title: tReport(`sections.${key}`),
        score,
        status: score === undefined ? undefined : tReport(`status.${conditionStatus(score)}`),
      };
    }),
  }));

  return (
    <Page
      title={tReports("detail.title", { date })}
      crumbs={crumbs}
      engines
      tour="reportDetail"
      bleed
      toolbar={
        <>
          <p className="mr-auto text-sm text-muted-foreground tabular-nums">
            {tReport("number", { number: report.history.length })} · {before ? tReport("meta.periodRange", { from: formatShortDate(before, locale, TIME_ZONE), to: date }) : date}
          </p>
          <ReportShare path={shared} text={tReports("share.text", { brand: project.brand.name, date })} />
        </>
      }
    >
      {/* The gray ground the report's paper lies on. The contents stand beside it once the panel is wide enough; it narrows when GEO AI is open */}
      <div className="@container flex flex-1 flex-col bg-muted/60 p-3 sm:p-4">
        <div className="mx-auto grid w-full max-w-312 gap-4 @5xl:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden @5xl:block">
            <div className="sticky top-[3.75rem]">
              <ReportContents parts={parts} score={condition?.score} />
            </div>
          </aside>
          {/* Clear of the page's sticky title when the contents jump to a section */}
          <div className="min-w-0 [&_section]:scroll-mt-16">
            <ReportBody report={report} actions={actions} />
          </div>
        </div>
      </div>
    </Page>
  );
}
