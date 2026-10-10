import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { requireUser } from "@/shared/api/session";
import { AccountCard } from "../components/account-card";
import { LanguageCard } from "../components/language-card";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings/account">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "account");

/** Sozlamalar › Umumiy, in the place of Peec's company settings: the account's name and logins, and the interface language. */
export default async function GeneralPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, user, t] = await Promise.all([getProject(id), requireUser(), getTranslations({ locale, namespace: "Sidebar" })]);

  return (
    <Page title={t("settingsNav.account")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]} tour="settingsAccount">
      <AccountCard user={user} />
      <div data-tour="language">
        <LanguageCard />
      </div>
    </Page>
  );
}
