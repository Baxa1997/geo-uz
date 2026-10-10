import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { LanguageCard } from "../components/language-card";
import { BrandsCard } from "../components/brands-card";
import { ProfileCard } from "../components/profile-card";

type Props = PageProps<"/[locale]/projects/[id]/settings">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("settings")} — ${project.brand.name}` };
}

/** The settings' sections; the ones not built yet are marked "coming soon". Labels in messages/Settings.nav. */
const SECTIONS = [
  { group: "project", items: [{ key: "profile", ready: true }, { key: "brands", ready: true }, { key: "facts", ready: false }] },
  { group: "account", items: [{ key: "language", ready: true }, { key: "members", ready: false }, { key: "billing", ready: false }] },
] as const;

/**
 * Settings laid out like Peec's: the sections on the left, the brand profile saved in onboarding, the
 * tracked brands and the interface language on the right (read-only for now, editing comes later).
 */
export default async function SettingsPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, report, t, tSettings] = await Promise.all([
    getProject(id),
    orNotFound(api.getReport(id)),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "Settings" }),
  ]);

  return (
    <Page title={t("settings")} tour="settings">
      <div className="@container">
        <div className="grid gap-6 @4xl:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label={tSettings("nav.label")} data-tour="nav" className="flex flex-col gap-4 @4xl:sticky @4xl:top-20 @4xl:h-fit">
            {SECTIONS.map(({ group, items }) => (
              <div key={group} className="flex flex-col gap-0.5">
                <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{tSettings(`nav.${group}`)}</p>
                {items.map(({ key, ready }) =>
                  ready ? (
                    <a key={key} href={`#${key}`} className="rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted">
                      {tSettings(`nav.${key}`)}
                    </a>
                  ) : (
                    <span key={key} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm text-muted-foreground">
                      {tSettings(`nav.${key}`)}
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem]">{tSettings("nav.soon")}</span>
                    </span>
                  ),
                )}
              </div>
            ))}
          </nav>
          <div className="flex min-w-0 flex-col gap-5">
            <div id="profile" data-tour="profile" className="scroll-mt-20">
              <ProfileCard project={project} />
            </div>
            <div id="brands" data-tour="brands" className="scroll-mt-20">
              <BrandsCard project={project} results={report.prompts} />
            </div>
            <div id="language" data-tour="language" className="scroll-mt-20">
              <LanguageCard />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
