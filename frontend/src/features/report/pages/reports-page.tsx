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
import { ExecutiveSummary } from "../components/executive-summary";
import { sectionNumber } from "../components/report-body";
import { ReportCover } from "../components/report-cover";
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
 * Hisobotlar, built for the first look (the user's correction of Oct 10): this week's report as a cover
 * (the week's message as a headline, the client's visibility large with its change and its line over the
 * checks, the way into the report, its link, Telegram and PDF), then the decision in three cards (what
 * went well, what needs attention, what to do first), then every week's report as a history whose rows say
 * what happened that week, and one line on where the report goes, its settings in a window. The five
 * numbers stay on the Overview and in the report itself.
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
  const latestPage = `${base}/${encodeURIComponent(latest.runId)}`;
  const shared = getPathname({ href: `/projects/${project.id}/report`, locale });

  return (
    <Page title={t("reports")} engines tour="reports">
      <div className="flex flex-col gap-8 sm:gap-10">
        <div className="flex flex-col gap-4">
          <ReportCover
            report={report}
            variant="landing"
            openHref={latestPage}
            share={<ReportShare path={shared} text={tReports("share.text", { brand: project.brand.name, date })} onCover />}
          />
          <div data-tour="decide">
            <ExecutiveSummary
              report={report}
              actions={actions}
              actionsSection={sectionNumber("actions")}
              moreHref={`${getPathname({ href: latestPage, locale })}#actions`}
              verdict={false}
              trend={false}
            />
          </div>
        </div>

        <PageSection tour="archive" title={tReports("archive.title")} description={tReports("archive.description")}>
          <ReportsArchive
            project={{ brand: project.brand, competitors: project.competitors }}
            history={report.history}
            sourceHistory={report.sourceHistory}
            factDates={report.wrongFacts.map((fact) => fact.foundAt)}
            doneDates={actions.flatMap((action) => (action.doneAt ? [action.doneAt] : []))}
            base={base}
            filename={`${project.brand.domain}-reports`}
          />
        </PageSection>

        <DeliveryBanner projectId={project.id} initial={settings} plan={project.plan} />
      </div>
    </Page>
  );
}
