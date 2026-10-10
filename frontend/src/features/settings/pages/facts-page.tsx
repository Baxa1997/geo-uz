import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { FactsEditor } from "../components/facts-editor";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings/facts">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "facts");

/** Sozlamalar › Faktlar: the brand facts ChatGPT's answers are checked against, counted against the plan. */
export default async function FactsPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, facts, t] = await Promise.all([getProject(id), orNotFound(api.getFacts(id)), getTranslations({ locale, namespace: "Sidebar" })]);

  return (
    <Page title={t("settingsNav.facts")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]} tour="settingsFacts">
      <FactsEditor projectId={project.id} initial={facts} limit={project.limits.facts} plan={project.plan} wrongFactsHref={`/projects/${project.id}/wrong-facts`} planHref={`/projects/${project.id}/settings/plan`} />
    </Page>
  );
}
