import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { setPageLocale } from "@/i18n/page-locale";
import { pickMessages } from "@/i18n/pick-messages";
import { Footer } from "../components/layout/footer";
import { Navbar } from "../components/layout/navbar";
import { LANDING_CLIENT_MESSAGES } from "../constants";
import { displaySerif } from "../fonts";

/**
 * Public pages (landing, free check): sticky navbar and the dark footer. Pages set their own width.
 * Their client components get only the messages they use (LANDING_CLIENT_MESSAGES), not the catalog.
 */
export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setPageLocale((await params).locale);

  return (
    <NextIntlClientProvider messages={pickMessages(await getMessages(), LANDING_CLIENT_MESSAGES)}>
      {/* One warm paper ground under the navbar and the page, so the two don't show a seam. Opaque, so a fade to it can be painted (the hero's preview). The serif of the headings is loaded here, for the public pages alone */}
      <div className={`${displaySerif.variable} flex flex-1 flex-col bg-(--page) [--page:color-mix(in_oklab,var(--muted)_75%,var(--background))]`}>
        <Navbar />
        <main className="flex flex-1 flex-col [counter-reset:section]">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
