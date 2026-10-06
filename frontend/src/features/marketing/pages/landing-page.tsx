import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setPageLocale } from "@/i18n/page-locale";
import { DemoSection } from "../components/landing/demo-section";
import { Faq } from "../components/landing/faq";
import { FinalCta } from "../components/landing/final-cta";
import { Hero } from "../components/landing/hero";
import { KeyFeatures } from "../components/landing/key-features";
import { Metrics } from "../components/landing/metrics";
import { Pricing } from "../components/landing/pricing";
import { Reports } from "../components/landing/reports";
import { RevealOnScroll } from "../components/landing/reveal-on-scroll";
import { Statement } from "../components/landing/statement";
import { TelegramReports } from "../components/landing/telegram-reports";
import { WhyLocal } from "../components/landing/why-local";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Landing" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** The home page: sections in the order of CLAUDE.md, "Landing page". */
export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  setPageLocale((await params).locale);

  return (
    <>
      <Hero />
      <Metrics />
      <KeyFeatures />
      <Statement />
      <TelegramReports />
      <Reports />
      <WhyLocal />
      <Pricing />
      <Faq />
      <DemoSection />
      <FinalCta />
      <RevealOnScroll />
    </>
  );
}
