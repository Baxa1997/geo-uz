"use client";

import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { GlobeIcon as Globe } from "@phosphor-icons/react/dist/ssr/Globe";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/shared/helpers/utils";

/** Each language under its own name, whatever the interface's language. */
const NAMES: Record<(typeof routing.locales)[number], string> = { uz: "Oʻzbekcha", ru: "Русский", en: "English" };

/**
 * Links to the current page, query string included, in each UI language: three short links in a row, or
 * (`menu`, the public pages' navbar) a button with the current language that opens the list of them.
 */
export function LocaleSwitcher({ menu = false }: { menu?: boolean }) {
  // useSearchParams needs a Suspense boundary on statically rendered pages
  return (
    <Suspense fallback={<LocaleLinks menu={menu} />}>
      <LocaleLinksWithQuery menu={menu} />
    </Suspense>
  );
}

function LocaleLinksWithQuery({ menu }: { menu: boolean }) {
  const searchParams = useSearchParams();
  return <LocaleLinks menu={menu} query={Object.fromEntries(searchParams)} />;
}

function LocaleLinks({ menu, query = {} }: { menu: boolean; query?: Record<string, string> }) {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  if (menu) return <LocaleMenu label={t("label")} current={current} href={{ pathname, query }} />;

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

/**
 * The languages as a dropdown, with no menu library (the landing page loads none): it opens on a click,
 * and closes on Escape, when focus leaves it and when a language is picked.
 */
function LocaleMenu({ label, current, href }: { label: string; current: string; href: { pathname: string; query: Record<string, string> } }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label={label}
      className="relative"
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        setOpen(false);
        button.current?.focus();
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 items-center gap-2 rounded-xl px-3.5 text-base font-semibold transition-colors hover:bg-muted aria-expanded:bg-muted"
      >
        <Globe aria-hidden className="size-5" />
        <span className="uppercase">{current}</span>
        <ChevronDown aria-hidden className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <ul id={id} hidden={!open} className="absolute top-full right-0 z-50 mt-2 w-52 rounded-2xl border bg-background p-2 shadow-xl shadow-brand/10">
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Link
              href={href}
              locale={locale}
              prefetch={false}
              lang={locale}
              aria-current={locale === current ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-base transition-colors hover:bg-muted"
            >
              {NAMES[locale]}
              {locale === current && <Check aria-hidden className="size-4.5 text-brand" />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
