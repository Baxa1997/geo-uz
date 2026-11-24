import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setPageLocale } from "@/i18n/page-locale";
import { CONTACT_EMAIL } from "@/shared/constants";
import { LegalDocument } from "../components/legal/legal-document";
import { TERMS_SECTIONS } from "../constants";

type Props = PageProps<"/[locale]/terms">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Legal.terms" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** The Terms of use (24 Nov 2026, the user's "Terms, privacy, contacts"), in the language of the address. */
export default async function TermsPage({ params }: Props) {
  const locale = setPageLocale((await params).locale);
  const [t, legal] = await Promise.all([getTranslations({ locale, namespace: "Legal.terms" }), getTranslations({ locale, namespace: "Legal" })]);
  const email = { email: CONTACT_EMAIL };
  return (
    <LegalDocument
      label={legal("label")}
      title={t("title")}
      updated={legal("updated")}
      intro={t("intro", email)}
      contents={legal("contents")}
      questions={legal("questions", email)}
      sections={TERMS_SECTIONS.map((id) => ({ id, title: t(`sections.${id}.title`), body: t(`sections.${id}.body`, email) }))}
    />
  );
}
