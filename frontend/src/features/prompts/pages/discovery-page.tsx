import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { cache } from "react";
import { ArrowRight, Languages, ListChecks, Users } from "lucide-react";
import { Page } from "@/shared/components/page";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { labelFor } from "@/shared/helpers/labels";
import { parseReportFilters, withFilters } from "@/shared/helpers/report-filters";
import { DiscoveryForm } from "../components/discovery-form";

type Props = PageProps<"/[locale]/projects/[id]/prompts/discovery">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "PromptDiscovery" })]);
  return { title: `${t("title")} — ${project.brand.name}` };
}

/**
 * Peec's Prompt Discovery (Prompts › Discovery), from "Find questions" on the questions page: on the left
 * what it does and the way back to the existing topics, on the right the form in two steps (what the
 * business sells and who buys it, then the languages). Peec's video and its "markets" list are left out:
 * a project has one city, and the languages are Uzbek and Russian.
 */
export default async function DiscoveryPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const filters = parseReportFilters(await searchParams);
  const [project, t, tSidebar, messages] = await Promise.all([
    getProject(id),
    getTranslations({ locale, namespace: "PromptDiscovery" }),
    getTranslations({ locale, namespace: "Sidebar" }),
    getMessages({ locale }),
  ]);
  const prompts = withFilters(`/projects/${project.id}/prompts`, filters);
  const suggested = withFilters(`/projects/${project.id}/prompts`, filters, { view: "suggested" });
  const steps = [
    { icon: ListChecks, text: t("intro.services") },
    { icon: Users, text: t("intro.customers") },
    { icon: Languages, text: t("intro.languages") },
  ];

  return (
    <Page title={t("title")} crumbs={[{ href: prompts, label: tSidebar("prompts") }]} engines bleed>
      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <section className="flex items-center justify-center border-b px-5 py-10 sm:px-10 lg:border-r lg:border-b-0">
          <div className="flex max-w-md flex-col items-center gap-5 text-center">
            <div className="w-full rounded-3xl border bg-muted/40 p-6 text-left shadow-xs">
              <p className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 text-xs font-medium">
                <span aria-hidden className="size-1.5 rounded-full bg-positive" />
                {t("title")}
              </p>
              <p className="mt-4 text-2xl leading-tight font-semibold tracking-tight text-balance">{t("intro.headline")}</p>
              <ol className="mt-5 flex flex-col gap-3">
                {steps.map(({ icon: Icon, text }, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-pretty">
                    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background">
                      <Icon className="size-4 text-muted-foreground" />
                    </span>
                    <span className="pt-1">{text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-sm text-pretty text-muted-foreground">{t("intro.after")}</p>
            <Link href={suggested} className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
              {t("intro.existing")}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
        </section>
        <DiscoveryForm
          projectId={project.id}
          services={project.services}
          customers={project.customers}
          languages={project.languages}
          city={labelFor(messages.Cities, project.city)}
          suggestedHref={suggested}
        />
      </div>
    </Page>
  );
}
