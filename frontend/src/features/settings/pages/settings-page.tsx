import { getMessages, getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { ProfileForm } from "../components/profile-form";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "profile");

/**
 * Sozlamalar › Profil, the first of the settings (the user's correction of Oct 10, with Peec's Settings
 * screenshots: its own menu in the sidebar's place, "not too many spacing"): the brand profile, editable,
 * across the page, with a save bar that stays in view.
 */
export default async function SettingsPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, messages, t] = await Promise.all([getProject(id), getMessages({ locale }), getTranslations({ locale, namespace: "Sidebar" })]);
  // The field and the city the project has stay choosable, even one the list doesn't know
  const options = (dictionary: Record<string, string>, current: string) => [...new Set([...Object.keys(dictionary), current])];

  return (
    <Page title={t("settingsNav.profile")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]} tour="settings">
      <ProfileForm project={project} categories={options(messages.Categories, project.category)} cities={options(messages.Cities, project.city)} />
    </Page>
  );
}
