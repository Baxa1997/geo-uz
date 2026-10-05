import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "ru", "en"],
  defaultLocale: "uz",
  // Always start in Uzbek instead of following the browser language;
  // users switch explicitly and links keep the /ru or /en prefix.
  localeDetection: false,
});
