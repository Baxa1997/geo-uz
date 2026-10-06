import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { NoData } from "@/shared/components/no-data";
import { HeadlineScore } from "@/shared/components/scores/headline-score";
import { SourcesList } from "@/shared/components/scores/sources-list";
import { WrongFacts } from "@/shared/components/scores/wrong-facts";
import { PromptTable } from "../components/prompt-table";
import { ReportHeader } from "../components/report-header";
import { ShareOfVoiceChart } from "../components/share-of-voice-chart";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";

// Shared by generateMetadata and the page within one request
const getReport = cache((id: string) => orNotFound(api.getReport(id, "week")));

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects/[id]/report">): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [report, t] = await Promise.all([getReport(id), getTranslations({ locale, namespace: "Report" })]);
  return { title: t("metaTitle", { brand: report.project.brand.name }) };
}

// The client-facing screen: no workspace navigation, so it can be shared as is
export default async function ReportPage({ params }: PageProps<"/[locale]/projects/[id]/report">) {
  const { locale, id } = await params;
  setPageLocale(locale);

  const report = await getReport(id);
  const brands = [report.project.brand, ...report.project.competitors];
  const youId = report.project.brand.id;

  return (
    // Its chart and table translate in the browser; nothing here saves, so no data cache
    <NextIntlClientProvider>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-10">
        <ReportHeader report={report} />
        {report.prompts.length === 0 ? (
          <NoData projectId={report.project.id} />
        ) : (
          <>
            <HeadlineScore
              brand={report.project.brand}
              competitors={report.project.competitors}
              scores={report.scores}
              // A first run has no week before it to compare with
              showTrend={report.history.length > 1}
            />
            <ShareOfVoiceChart brands={brands} scores={report.scores} youId={youId} />
            <WrongFacts facts={report.wrongFacts} prompts={report.prompts} />
            <SourcesList sources={report.topSources} competitors={report.project.competitors} />
            <PromptTable results={report.prompts} brands={brands} youId={youId} samples={report.method.samples} />
          </>
        )}
      </main>
    </NextIntlClientProvider>
  );
}
