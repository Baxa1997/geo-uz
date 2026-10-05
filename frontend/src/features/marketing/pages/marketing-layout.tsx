import { setPageLocale } from "@/i18n/page-locale";
import { Footer } from "../components/layout/footer";
import { Navbar } from "../components/layout/navbar";

/** Public pages (landing, free check): sticky navbar and the dark footer. Pages set their own width. */
export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setPageLocale((await params).locale);

  return (
    // One soft grey ground under the navbar and the page, so the two don't show a seam
    <div className="flex flex-1 flex-col bg-muted/40">
      <Navbar />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
