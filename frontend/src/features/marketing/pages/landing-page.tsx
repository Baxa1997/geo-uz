import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setPageLocale } from "@/i18n/page-locale";
import { Audience } from "../components/landing/audience";
import { BrandAnswers } from "../components/landing/brand-answers";
import { Compare } from "../components/landing/compare";
import { DemoSection } from "../components/landing/demo-section";
import { Engines } from "../components/landing/engines";
import { Faq } from "../components/landing/faq";
import { FinalCta } from "../components/landing/final-cta";
import { Fixes } from "../components/landing/fixes";
import { Hero } from "../components/landing/hero";
import { HowItWorks } from "../components/landing/how-it-works";
import { Local } from "../components/landing/local";
import { Metrics } from "../components/landing/metrics";
import { Pricing } from "../components/landing/pricing";
import { ReportPreview } from "../components/landing/report-preview";
import { RevealOnScroll } from "../components/landing/reveal-on-scroll";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Landing" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * The home page, in the order of a clear product page (16 Nov 2026, after the user's look at vizibleai.com):
 * what it is with the website field; who we ask; how it works; then one section per thing the product
 * shows, each with a real piece of it (the numbers, you against competitors and the sites, what AI says
 * about you, the fixes, the report); why us; who it is for; prices; questions; contact; the last call.
 */
export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  setPageLocale((await params).locale);

  return (
    <>
      <Hero />
      <Engines />
      <HowItWorks />
      <Metrics />
      <Compare />
      <BrandAnswers />
      <Fixes />
      <ReportPreview />
      <Local />
      <Audience />
      <Pricing />
      <Faq />
      <DemoSection />
      <FinalCta />
      <RevealOnScroll />
    </>
  );
}
