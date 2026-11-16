import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { BrandQuestionsEditor } from "../components/brand-questions-editor";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings/brand-questions">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "brandQuestions");

/** Sozlamalar › Brend savollari: the questions that name the business, asked at every check beside the customers' ones. */
export default async function BrandQuestionsPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);

  return (
    <Page title={t("settingsNav.brandQuestions")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]}>
      <BrandQuestionsEditor projectId={project.id} brand={project.brand.name} initial={project.brandQuestions ?? []} overviewHref={`/projects/${project.id}`} />
    </Page>
  );
}
