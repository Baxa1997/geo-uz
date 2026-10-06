import { NextIntlClientProvider } from "next-intl";
import { Providers } from "./providers";

/**
 * What the pages people work in need in the browser: every message (their client components translate
 * all over the catalog) and the data cache. The root layout gives neither, so the public landing page
 * stays light; each layout or page of the app wraps itself in this.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
