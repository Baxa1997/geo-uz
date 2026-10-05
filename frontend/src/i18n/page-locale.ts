import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "./routing";

/** Checks the [locale] URL segment and enables static rendering for it. Call first in every page. */
export function setPageLocale(locale: string): Locale {
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
