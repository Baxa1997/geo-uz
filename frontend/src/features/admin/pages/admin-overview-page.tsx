import type { Metadata } from "next";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { adminApi } from "@/shared/api/client";
import { ProjectsTable } from "../components/projects-table";
import { StatCard } from "../components/stat-card";
import { UsersTable } from "../components/users-table";
import { formatUsd } from "../helpers/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("overview.title"), robots: { index: false, follow: false } };
}

const SECTION_HEAD = "flex items-center justify-between gap-3";
const SEE_ALL = "inline-flex items-center gap-1 text-sm text-brand underline-offset-2 hover:underline";

/** The admin page's first screen: the numbers, then the newest projects and users. */
export default async function AdminOverviewPage({ params }: PageProps<"/[locale]/admin">) {
  const locale = setPageLocale((await params).locale);
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: "Admin.overview" }), adminApi.overview()]);
  const checks = data.firstChecks;

  return (
    <Page title={t("title")}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("users")} value={data.users.total} note={t("newThisWeek", { count: data.users.week })} href="/admin/users" />
        <StatCard label={t("projects")} value={data.projects.total} note={t("newThisWeek", { count: data.projects.week })} href="/admin/projects" />
        <StatCard label={t("checksToday")} value={t("ofLimit", { count: data.checksToday, limit: data.checksADay })} note={t("checksTodayNote")} />
        <StatCard label={t("waiting")} value={checks.waiting} note={t("runningNow", { count: checks.running })} href="/admin/waiting" alert={checks.waiting > 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section aria-labelledby="admin-checks" className="flex flex-col gap-2 rounded-xl border bg-card px-4 py-3">
          <h2 id="admin-checks" className="text-sm font-semibold">
            {t("checksTitle")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            {(["done", "failed", "waiting", "running", "preparing"] as const).map((key) => (
              <div key={key} className="flex flex-col">
                <dt className="text-xs text-muted-foreground">{t(`statuses.${key}`)}</dt>
                <dd className="font-semibold tabular-nums">{checks[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="admin-cost" className="flex flex-col gap-2 rounded-xl border bg-card px-4 py-3">
          <h2 id="admin-cost" className="text-sm font-semibold">
            {t("costTitle")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            <div className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{t("costFree")}</dt>
              <dd className="font-semibold tabular-nums">{formatUsd(data.cost.freeChecks)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{t("costWeek")}</dt>
              <dd className="font-semibold tabular-nums">{formatUsd(data.cost.freeChecksWeek)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{t("costPlans")}</dt>
              <dd className="font-semibold tabular-nums">{formatUsd(data.cost.planChecks)}</dd>
            </div>
          </dl>
          <p className="text-xs text-pretty text-muted-foreground">{t("costNote")}</p>
        </section>
      </div>

      <section aria-labelledby="admin-latest-projects" className="flex flex-col gap-2">
        <div className={SECTION_HEAD}>
          <h2 id="admin-latest-projects" className="text-sm font-semibold">
            {t("latestProjects")}
          </h2>
          <Link href="/admin/projects" className={SEE_ALL}>
            {t("seeAll")}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        <ProjectsTable rows={data.latestProjects} />
      </section>

      <section aria-labelledby="admin-latest-users" className="flex flex-col gap-2">
        <div className={SECTION_HEAD}>
          <h2 id="admin-latest-users" className="text-sm font-semibold">
            {t("latestUsers")}
          </h2>
          <Link href="/admin/users" className={SEE_ALL}>
            {t("seeAll")}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        <UsersTable rows={data.latestUsers} />
      </section>
    </Page>
  );
}
