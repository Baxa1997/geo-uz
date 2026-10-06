import { ArrowRight, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { EmptyState } from "@/shared/components/empty-state";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { isTracked } from "@/shared/helpers/prompts";
import { cn } from "@/shared/helpers/utils";
import { ActionBoard } from "../components/action-board";

type Props = PageProps<"/[locale]/projects/[id]/actions">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("actions")} — ${project.brand.name}` };
}

/**
 * Harakatlar: what to do so ChatGPT names the brand more often, made from the weekly report.
 * Our answer to "a score alone is a vanity metric": every number leads to a fix, and a done fix to its result.
 * ?action= opens one action at the side (the Overview links to them).
 */
export default async function ActionsPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const { action: openId } = await searchParams;
  const [project, prompts, report, actions, t, tActions] = await Promise.all([
    getProject(id),
    orNotFound(api.getPrompts(id)),
    orNotFound(api.getReport(id)),
    orNotFound(api.getActions(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "Actions" }),
  ]);

  if (report.prompts.length === 0) {
    return (
      <Page title={t("actions")} engines>
        <NoData projectId={project.id} promptCount={prompts.filter(isTracked).length} />
      </Page>
    );
  }

  return (
    <Page title={t("actions")} engines>
      {actions.length > 0 ? (
        <ActionBoard
          projectId={project.id}
          initial={actions}
          initialOpenId={typeof openId === "string" ? openId : undefined}
          prompts={prompts}
          competitors={project.competitors.map(({ id: competitorId, name }) => ({ id: competitorId, name }))}
          nextRunAt={report.nextRunAt}
          filename={`${project.brand.domain}-actions-${report.method.collectedAt.slice(0, 10)}`}
        />
      ) : (
        <EmptyState icon={ListChecks} title={tActions("noneTitle")} text={tActions("noneText")} />
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-medium">{tActions("managedTitle")}</h2>
          <p className="text-sm text-pretty text-muted-foreground">{tActions("managedText")}</p>
        </div>
        <Link
          href={{ pathname: "/", hash: "pricing" }}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          {tActions("managedAction")}
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Link>
      </section>
    </Page>
  );
}
