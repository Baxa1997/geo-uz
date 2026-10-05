import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { ProjectForm } from "../components/project-form";
import { setPageLocale } from "@/i18n/page-locale";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects/new">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "NewProject" });
  return { title: t("title") };
}

export default async function NewProjectPage({ params }: PageProps<"/[locale]/projects/new">) {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "NewProject" });

  return (
    <Page title={t("title")}>
      {/* A form reads best at a comfortable width, not across the whole panel */}
      <div className="flex max-w-3xl flex-col gap-4 sm:gap-5">
        <p className="text-sm text-pretty text-muted-foreground">{t("description")}</p>
        <ProjectForm />
      </div>
    </Page>
  );
}
