import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckRunner } from "../components/check-runner";
import { SiteForm } from "../components/site-form";
import { redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { FIRST_RUN_LIVE } from "@/shared/api/client";
import { AppProviders } from "@/shared/components/app-providers";
import { isValidDomain } from "@/shared/helpers/domain";
import { parseSiteParam } from "../helpers/site-param";

type Props = PageProps<"/[locale]/check">;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const [{ domain }, t] = await Promise.all([searchParams.then((sp) => parseSiteParam(sp.site)), getTranslations({ locale, namespace: "Check" })]);
  // Results for arbitrary websites shouldn't end up in search engines
  return { title: t("metaTitle", { site: domain || "Seenova AI" }), robots: { index: false } };
}

export default async function CheckPage({ params, searchParams }: Props) {
  const locale = setPageLocale((await params).locale);
  const [{ raw, domain }, t, tLanding] = await Promise.all([
    searchParams.then((sp) => parseSiteParam(sp.site)),
    getTranslations({ locale, namespace: "Check" }),
    getTranslations({ locale, namespace: "Landing" }),
  ]);

  // With real first checks, a website given here is checked for real, after login: the check on this page
  // answers every website with the sample clinic's numbers, which a real visitor must never be shown
  if (FIRST_RUN_LIVE) redirect({ href: isValidDomain(domain) ? { pathname: "/onboarding/first-run", query: { site: domain } } : "/onboarding/first-run", locale });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-6 pb-16 sm:pt-12">
      {isValidDomain(domain) ? (
        // The check runs and shows a whole report: the full catalog and the data cache, unlike the landing page
        <AppProviders>
          <CheckRunner key={domain} site={domain} />
        </AppProviders>
      ) : (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t("askTitle")}</h1>
          <SiteForm defaultValue={raw} initialError={raw ? tLanding("siteInvalid") : undefined} />
        </section>
      )}
    </div>
  );
}
