import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "ru", "en"],
  // English first (the user, 22 Nov 2026: "make the default language english"; it was Uzbek). The browser's
  // language isn't followed: users switch explicitly and links keep the /uz or /ru prefix.
  defaultLocale: "en",
  localeDetection: false,
});
