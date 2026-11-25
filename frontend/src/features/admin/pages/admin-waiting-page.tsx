import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { adminApi } from "@/shared/api/client";
import { AutoRefresh } from "../components/auto-refresh";
import { RunningList, WaitingTable } from "../components/waiting-table";
import { RUNNING_REFRESH_MS } from "../constants";
import { formatUsd } from "../helpers/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/waiting">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("waiting.title"), robots: { index: false, follow: false } };
}

/** The free checks in the queue, each with Approve, and those being asked now. */
export default async function AdminWaitingPage({ params }: PageProps<"/[locale]/admin/waiting">) {
  const locale = setPageLocale((await params).locale);
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: "Admin.waiting" }), adminApi.waiting()]);
  const usd = formatUsd(data.checkUsd);

  return (
    <Page title={t("title")}>
      {data.running.length > 0 && <AutoRefresh every={RUNNING_REFRESH_MS} />}
      <div className="flex flex-col gap-1">
        <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{t("intro")}</p>
        <p className="text-sm font-medium tabular-nums">{t("today", { count: data.checksToday, limit: data.checksADay, usd })}</p>
      </div>
      <WaitingTable rows={data.waiting} usd={usd} />
      <section aria-labelledby="admin-running" className="flex flex-col gap-2">
        <h2 id="admin-running" className="text-sm font-semibold">
          {t("runningTitle")}
        </h2>
        <RunningList rows={data.running} />
      </section>
    </Page>
  );
}
