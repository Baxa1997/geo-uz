"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/shared/helpers/utils";

/** Links to the current page, query string included, in each UI language. */
export function LocaleSwitcher() {
  // useSearchParams needs a Suspense boundary on statically rendered pages
  return (
    <Suspense fallback={<LocaleLinks />}>
      <LocaleLinksWithQuery />
    </Suspense>
  );
}

function LocaleLinksWithQuery() {
  const searchParams = useSearchParams();
  return <LocaleLinks query={Object.fromEntries(searchParams)} />;
}

function LocaleLinks({ query = {} }: { query?: Record<string, string> }) {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex shrink-0 rounded-lg bg-muted p-0.5 text-xs font-medium">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={{ pathname, query }}
          locale={locale}
          // The same page in two more languages isn't worth downloading before anyone asks
          prefetch={false}
          aria-current={locale === current ? "page" : undefined}
          className={cn(
            "rounded-md px-2 py-1 text-foreground/65 uppercase transition-colors hover:text-foreground",
            locale === current && "bg-background text-foreground shadow-sm",
          )}
        >
          {locale}
        </Link>
      ))}
    </nav>
  );
}
