import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { adminApi } from "@/shared/api/client";
import { ProjectsTable } from "../components/projects-table";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/projects">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("projects.title"), robots: { index: false, follow: false } };
}

/** Every brand registered, newest first, with its report and snapshot by link (read-only). */
export default async function AdminProjectsPage({ params }: PageProps<"/[locale]/admin/projects">) {
  const locale = setPageLocale((await params).locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin.projects" }), adminApi.projects()]);

  return (
    <Page title={t("title")}>
      <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{t("intro", { count: rows.length })}</p>
      <ProjectsTable rows={rows} />
    </Page>
  );
}
