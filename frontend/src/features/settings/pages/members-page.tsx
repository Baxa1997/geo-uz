import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { MembersTable } from "../components/members-table";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings/members">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "members");

/** Sozlamalar › A'zolar: the people with access to the account's projects; invite one by phone number. */
export default async function MembersPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, members, projects, t] = await Promise.all([
    getProject(id),
    orNotFound(api.getMembers()),
    orNotFound(api.getProjects()),
    getTranslations({ locale, namespace: "Sidebar" }),
  ]);

  return (
    <Page title={t("settingsNav.members")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]} tour="settingsMembers">
      <MembersTable initial={members} projects={Object.fromEntries(projects.map((candidate) => [candidate.id, candidate.brand.name]))} />
    </Page>
  );
}
