"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/shared/helpers/utils";

/** Interface language: each option opens this same page in that language. */
export function LanguageCard() {
  const t = useTranslations("Settings");
  const names = useTranslations("Locales");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <Card>
      <CardHeader>
        <CardTitle id="language-title">{t("languageTitle")}</CardTitle>
        <CardDescription>{t("languageDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <nav aria-labelledby="language-title">
          <ul className="grid gap-2 sm:grid-cols-3">
            {routing.locales.map((locale) => {
              const active = locale === current;
              return (
                <li key={locale}>
                  <Link
                    href={pathname}
                    locale={locale}
                    hrefLang={locale}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex h-11 items-center justify-between gap-3 rounded-lg border px-3 text-sm transition-colors",
                      active ? "border-you/50 bg-you-soft/30 font-medium" : "hover:bg-muted/40",
                    )}
                  >
                    <span lang={locale}>{names(locale)}</span>
                    {active && <Check aria-hidden className="size-4 text-you" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </CardContent>
    </Card>
  );
}
