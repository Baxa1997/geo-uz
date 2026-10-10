import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { PageSection } from "@/shared/components/page-section";
import { getPathname } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { DeliveryBanner } from "../components/delivery-banner";
import { LatestReport } from "../components/latest-report";
import { ReportShare } from "../components/report-share";
import { ReportsArchive } from "../components/reports-archive";

type Props = PageProps<"/[locale]/projects/[id]/reports">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("reports")} — ${project.brand.name}` };
}

/**
 * Hisobotlar: the weekly status reports (the user's correction of Oct 10: "professional business report
 * about condition, and advanced report structure"). First the latest report's condition: the overall
 * score with its status and change, the five areas with the fact behind each, and the way into the whole
 * report, its link, Telegram and PDF. Then every report as a register: its number, period, the condition
 * it found, the areas as marks, what happened that week, its PDF. Last, one line on where the report
 * goes, its settings in a window.
 */
export default async function ReportsPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [report, actions, settings, t, tReports] = await Promise.all([
    orNotFound(api.getReport(id)),
    orNotFound(api.getActions(id)),
    orNotFound(api.getReportSettings(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "Reports" }),
  ]);
  const { project } = report;
  const latest = report.history.at(-1);

  if (report.prompts.length === 0 || !latest) {
    return (
      <Page title={t("reports")} engines>
        <NoData projectId={project.id} />
      </Page>
    );
  }

  const base = `/projects/${project.id}/reports`;
  const date = formatLongDate(latest.collectedAt, locale, TIME_ZONE);
  const shared = getPathname({ href: `/projects/${project.id}/report`, locale });

  return (
    <Page title={t("reports")} engines tour="reports">
      <div className="flex flex-col gap-6 sm:gap-7">
        <LatestReport
          report={report}
          href={`${base}/${encodeURIComponent(latest.runId)}`}
          share={<ReportShare path={shared} text={tReports("share.text", { brand: project.brand.name, date })} />}
        />

        <PageSection tour="archive" title={tReports("archive.title")} description={tReports("archive.description")}>
          <ReportsArchive
            project={{ brand: project.brand, competitors: project.competitors }}
            history={report.history}
            conditionHistory={report.conditionHistory}
            sourceHistory={report.sourceHistory}
            factDates={report.wrongFacts.map((fact) => fact.foundAt)}
            doneDates={actions.flatMap((action) => (action.doneAt ? [action.doneAt] : []))}
            base={base}
            shared={shared}
            filename={`${project.brand.domain}-reports`}
          />
        </PageSection>

        <DeliveryBanner projectId={project.id} initial={settings} plan={project.plan} />
      </div>
    </Page>
  );
}
