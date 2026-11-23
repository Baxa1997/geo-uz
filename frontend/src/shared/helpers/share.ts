import type { Metadata } from "next";

/** The language and country each interface language is shared as (Open Graph's `og:locale`). */
const SHARE_LOCALES: Record<string, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };

/**
 * How a link to the site reads when it is shared (Telegram, WhatsApp, Facebook, X; 23 Nov 2026, when the site went
 * public: a link showed no picture): the picture in the page's language, 1200×630, drawn from the landing page's own
 * texts by `scripts/share-images.mjs` into `public/og/`. Next gives the card each page's own title and description
 * (the landing page's question, a report's or a snapshot's name). Needs `metadataBase` (the layout's).
 */
export function shareMetadata(locale: string, alt: string): Pick<Metadata, "openGraph" | "twitter"> {
  const image = { url: `/og/${SHARE_LOCALES[locale] ? locale : "en"}.jpg`, width: 1200, height: 630, alt };
  return {
    openGraph: { type: "website", siteName: "Seenova AI", locale: SHARE_LOCALES[locale] ?? SHARE_LOCALES.en, images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
