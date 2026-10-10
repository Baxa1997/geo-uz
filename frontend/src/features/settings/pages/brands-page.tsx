import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { answersNaming, seriesBrands, totalAnswers } from "@/shared/helpers/scores";
import { BrandsManager } from "../components/brands-manager";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings/brands">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "brands");

/**
 * Sozlamalar › Brendlar: the tracked brands to edit, add and stop tracking, beside the brands ChatGPT names
 * that aren't tracked. The counts are the latest check's answers naming each brand.
 */
export default async function BrandsPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, report, t] = await Promise.all([getProject(id), orNotFound(api.getReport(id)), getTranslations({ locale, namespace: "Sidebar" })]);
  const brands = [project.brand, ...project.competitors];

  return (
    <Page title={t("settingsNav.brands")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]} tour="settingsBrands">
      <BrandsManager
        project={project}
        colors={Object.fromEntries(seriesBrands(project).map((brand) => [brand.id, brand.color]))}
        mentions={Object.fromEntries(brands.map((brand) => [brand.id, report.prompts.reduce((sum, result) => sum + answersNaming(result, brand.id), 0)]))}
        answers={totalAnswers(report.prompts)}
        suggestions={report.untrackedBrands.filter((brand) => !brand.dismissed)}
      />
    </Page>
  );
}
