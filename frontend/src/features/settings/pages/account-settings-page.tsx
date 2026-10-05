import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { LanguageCard } from "../components/language-card";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Sidebar" });
  return { title: t("settings") };
}

/** Settings while no project is open (the project list): the interface language. */
export default async function AccountSettingsPage({ params }: PageProps<"/[locale]/settings">) {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Sidebar" });

  return (
    <Page title={t("settings")}>
      <LanguageCard />
    </Page>
  );
}
