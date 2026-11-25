import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { adminApi } from "@/shared/api/client";
import { UsersTable } from "../components/users-table";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/users">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("users.title"), robots: { index: false, follow: false } };
}

/** Every account, newest first: its projects and its free check. */
export default async function AdminUsersPage({ params }: PageProps<"/[locale]/admin/users">) {
  const locale = setPageLocale((await params).locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin.users" }), adminApi.users()]);

  return (
    <Page title={t("title")}>
      <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{t("intro", { count: rows.length })}</p>
      <UsersTable rows={rows} />
    </Page>
  );
}
