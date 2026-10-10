import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { TagsManager } from "../components/tags-manager";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings/tags">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "tags");

/** Sozlamalar › Teglar: the questions' tags, to make, rename and delete; a tag opens its questions. */
export default async function TagsPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, tags, t] = await Promise.all([getProject(id), orNotFound(api.getTags(id)), getTranslations({ locale, namespace: "Sidebar" })]);

  return (
    <Page title={t("settingsNav.tags")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]} tour="settingsTags">
      <TagsManager projectId={project.id} initial={tags} promptsHref={`/projects/${project.id}/prompts`} />
    </Page>
  );
}
