import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ProjectCard } from "../components/project-card";
import { Page } from "@/shared/components/page";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNull } from "@/shared/api/errors";
import { isTracked } from "@/shared/helpers/prompts";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  const projects = await api.getProjects();
  const details = await Promise.all(
    projects.map(async (project) => {
      const [report, prompts] = await Promise.all([
        orNull(api.getReport(project.id)),
        orNull(api.getPrompts(project.id)),
      ]);
      return { project, report, promptCount: prompts?.filter(isTracked).length ?? 0 };
    }),
  );

  const newProject = (
    <Link href="/projects/new" className={buttonVariants()}>
      <Plus aria-hidden data-icon="inline-start" />
      {t("newProject")}
    </Link>
  );

  return (
    <Page title={t("title")} actions={projects.length > 0 && newProject}>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
          <p className="font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("emptyHint")}</p>
          {newProject}
        </div>
      ) : (
        // Columns follow the panel's width
        <div className="@container">
          <ul className="grid gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
            {details.map(({ project, report, promptCount }) => (
              <li key={project.id} className="flex flex-col *:flex-1">
                <ProjectCard project={project} report={report} promptCount={promptCount} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
}
