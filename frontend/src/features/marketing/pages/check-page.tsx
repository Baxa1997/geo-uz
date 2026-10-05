import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckRunner } from "../components/check-runner";
import { SiteForm } from "../components/site-form";
import { setPageLocale } from "@/i18n/page-locale";
import { isValidDomain } from "@/shared/helpers/domain";
import { parseSiteParam } from "../helpers/site-param";

type Props = PageProps<"/[locale]/check">;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const [{ domain }, t] = await Promise.all([searchParams.then((sp) => parseSiteParam(sp.site)), getTranslations({ locale, namespace: "Check" })]);
  // Results for arbitrary websites shouldn't end up in search engines
  return { title: t("metaTitle", { site: domain || "GEO" }), robots: { index: false } };
}

export default async function CheckPage({ params, searchParams }: Props) {
  const locale = setPageLocale((await params).locale);
  const [{ raw, domain }, t, tLanding] = await Promise.all([
    searchParams.then((sp) => parseSiteParam(sp.site)),
    getTranslations({ locale, namespace: "Check" }),
    getTranslations({ locale, namespace: "Landing" }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-6 pb-16 sm:pt-12">
      {isValidDomain(domain) ? (
        <CheckRunner key={domain} site={domain} />
      ) : (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t("askTitle")}</h1>
          <SiteForm defaultValue={raw} initialError={raw ? tLanding("siteInvalid") : undefined} />
        </section>
      )}
    </div>
  );
}
