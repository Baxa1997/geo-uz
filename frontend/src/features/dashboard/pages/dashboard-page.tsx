import type { Metadata } from "next";
import { ClockIcon as Clock } from "@phosphor-icons/react/dist/ssr/Clock";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { getTranslations } from "next-intl/server";
import { ProjectCard } from "../components/project-card";
import { Page } from "@/shared/components/page";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api, FIRST_RUN_LIVE } from "@/shared/api/client";
import { orNull } from "@/shared/api/errors";
import { isTracked } from "@/shared/helpers/prompts";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/[locale]/dashboard">) {
  const locale = setPageLocale((await params).locale);
  const [t, { start }] = await Promise.all([getTranslations({ locale, namespace: "Dashboard" }), searchParams]);

  const projects = await api.getProjects();
  // An account with no project: its first checks, for "Check for free" below and the queue's card
  const firstRuns = FIRST_RUN_LIVE && projects.length === 0 ? await api.getFirstRuns().catch(() => []) : [];
  // "Check for free" while logged in (proxy.ts): an account with no project goes on to its first check, as after
  // login (`useFinishLogin`): the one it started and didn't save, else a new one
  if (start === "check" && FIRST_RUN_LIVE && projects.length === 0) {
    const [latest] = firstRuns;
    redirect({ href: latest ? { pathname: "/onboarding/first-run", query: { run: latest.id } } : "/onboarding/first-run", locale });
  }
  // A free check waiting in the queue (the user, 22 Nov 2026: "Queue on the dashboard"): said in the place of "No
  // projects yet", since the account's project comes from it once the team has run the queue
  const queued = firstRuns.find((run) => run.status === "waiting");
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
    <Link href="/onboarding/first-run" className={buttonVariants()}>
      <Plus aria-hidden data-icon="inline-start" />
      {t("newProject")}
    </Link>
  );

  return (
    <Page title={t("title")} actions={projects.length > 0 && newProject}>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {queued ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Clock aria-hidden className="size-5" weight="bold" />
          </span>
          <p className="font-medium">{t("queued.title", { site: queued.domain })}</p>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
            {queued.place ? t("queued.place", { place: queued.place }) : null} {t("queued.text", { email: queued.email ?? t("queued.yourEmail") })}
          </p>
          <Link href={{ pathname: "/onboarding/first-run", query: { run: queued.id } }} className={buttonVariants({ variant: "outline" })}>
            {t("queued.open")}
          </Link>
        </div>
      ) : projects.length === 0 ? (
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
