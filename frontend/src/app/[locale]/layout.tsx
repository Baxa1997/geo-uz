import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { pickMessages } from "@/i18n/pick-messages";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/shared/constants";
import { shareMetadata } from "@/shared/helpers/share";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Metadata" });
  // Every page shares with the picture in its language; the addresses in its card are the public site's
  return { metadataBase: new URL(SITE_URL), title: t("title"), description: t("description"), ...shareMetadata(locale, t("title")) };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // data-scroll-behavior: Next turns smooth scrolling (globals.css) off during route changes
    <html lang={locale} data-scroll-behavior="smooth" className={`${fontVariables} h-full antialiased`}>
      {/* Extensions like Grammarly add attributes to <body> before hydration */}
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        {/*
          Only what error.tsx needs: messages given here are sent to the browser with every page. The
          app's own layouts add the whole catalog and the data cache (AppProviders); the landing page
          adds the few parts its client components use.
        */}
        <NextIntlClientProvider messages={pickMessages(await getMessages(), ["Common"])}>{children}</NextIntlClientProvider>
        {/* Vercel's Web Analytics (the user, 22 Nov 2026): visitors and page views, no cookies; it counts only on Vercel */}
        <Analytics />
      </body>
    </html>
  );
}
