import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";

/** A settings section: its name in messages/Sidebar.settingsNav. */
export type SettingsSection = "profile" | "facts" | "brands" | "tags" | "account" | "members" | "plan";

/** Shared by generateMetadata and the page within one request. */
export const getProject = cache((id: string) => orNotFound(api.getProject(id)));

/** "Faktlar — Oq Tabassum": the section, then the project. */
export async function settingsMetadata(params: Promise<{ locale: string; id: string }>, section: SettingsSection): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t(`settingsNav.${section}`)} — ${project.brand.name}` };
}
