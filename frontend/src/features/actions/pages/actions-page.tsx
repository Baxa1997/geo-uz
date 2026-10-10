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
import { answersNaming } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Source } from "@/shared/types/api";
import type { QuestionInfo, SitePages } from "../components/action-panel";
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
 * Harakatlar: what to do so ChatGPT names the brand more often, made from the weekly report, laid out like
 * Peec's Actions across the whole panel (`bleed`). Our answer to "a score alone is a vanity metric": every
 * number leads to a fix, and a done fix to its result. ?action= opens one action beside the list (the
 * Overview and a question's page link to them).
 */
export default async function ActionsPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const { action: openId } = await searchParams;
  const [project, prompts, topics, report, actions, t, tActions] = await Promise.all([
    getProject(id),
    orNotFound(api.getPrompts(id)),
    orNotFound(api.getTopics(id)),
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

  // The questions the actions should move, with how the client does on each in the latest check
  const results = new Map(report.prompts.map((result) => [result.prompt.id, result]));
  const questions: Record<string, QuestionInfo> = {};
  for (const promptId of new Set(actions.flatMap((action) => action.promptIds))) {
    const result = results.get(promptId);
    const prompt = result?.prompt ?? prompts.find((candidate) => candidate.id === promptId);
    if (!prompt) continue;
    questions[promptId] = {
      text: prompt.text,
      language: prompt.language,
      topic: prompt.topic,
      named: result ? answersNaming(result, project.brand.id) : 0,
      total: result?.answers.length ?? 0,
    };
  }

  // The pages ChatGPT read on the sites the actions are about: each listing's site, and the client's own
  const answers = report.prompts.reduce((sum, result) => sum + result.answers.length, 0);
  const pagesOf = (source: Source | undefined): SitePages | null =>
    source ? { pages: source.pages.map(({ url, title, count }) => ({ url, title, count })), answers } : null;
  const sites: Record<string, SitePages> = {};
  const own = pagesOf(report.topSources.find((source) => source.type === "own"));
  if (own) sites[project.brand.domain] = own;
  for (const action of actions) {
    if (action.kind !== "listing") continue;
    const site = pagesOf(report.topSources.find((source) => source.domain === action.domain));
    if (site) sites[action.domain] = site;
  }

  const managed = (
    <section className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-medium">{tActions("managedTitle")}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{tActions("managedText")}</p>
      </div>
      <Link href={{ pathname: "/", hash: "pricing" }} className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
        {tActions("managedAction")}
        <ArrowRight aria-hidden data-icon="inline-end" />
      </Link>
    </section>
  );

  return (
    <Page title={t("actions")} engines bleed>
      {actions.length > 0 ? (
        <ActionBoard
          projectId={project.id}
          initial={actions}
          initialOpenId={typeof openId === "string" ? openId : undefined}
          questions={questions}
          sites={sites}
          topics={topics}
          competitors={project.competitors.map(({ id: competitorId, name }) => ({ id: competitorId, name }))}
          brand={{ name: project.brand.name, domain: project.brand.domain }}
          nextRunAt={report.nextRunAt}
          filename={`${project.brand.domain}-actions-${report.method.collectedAt.slice(0, 10)}`}
          after={managed}
        />
      ) : (
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <EmptyState icon={ListChecks} title={tActions("noneTitle")} text={tActions("noneText")} />
          {managed}
        </div>
      )}
    </Page>
  );
}
