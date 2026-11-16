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

type Look = {
  /** The public pages' navbar: a taller button with larger text. */
  menu?: boolean;
  /** Three short links in a row, where a list can't open: inside the phone's menu. */
  row?: boolean;
  /** The list opens over the button, for a switcher at the foot of a page. */
  up?: boolean;
};

/**
 * Links to the current page, query string included, in each UI language: a button with the current
 * language that opens the list of them, on every page as in the landing page's header (the user,
 * 16 Nov 2026); `row` keeps the three short links side by side.
 */
export function LocaleSwitcher(look: Look) {
  // useSearchParams needs a Suspense boundary on statically rendered pages
  return (
    <Suspense fallback={<LocaleLinks {...look} />}>
      <LocaleLinksWithQuery {...look} />
    </Suspense>
  );
}

function LocaleLinksWithQuery(look: Look) {
  const searchParams = useSearchParams();
  return <LocaleLinks {...look} query={Object.fromEntries(searchParams)} />;
}

function LocaleLinks({ menu = false, row = false, up = false, query = {} }: Look & { query?: Record<string, string> }) {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  if (!row) return <LocaleMenu label={t("label")} current={current} href={{ pathname, query }} large={menu} up={up} />;

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
function LocaleMenu({
  label,
  current,
  href,
  large,
  up,
}: {
  label: string;
  current: string;
  href: { pathname: string; query: Record<string, string> };
  large: boolean;
  up: boolean;
}) {
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
        className={cn(
          "flex items-center font-semibold transition-colors hover:bg-muted aria-expanded:bg-muted",
          large ? "h-11 gap-2 rounded-xl px-3.5 text-base" : "h-9 gap-1.5 rounded-lg px-2.5 text-sm",
        )}
      >
        <Globe aria-hidden className={large ? "size-5" : "size-4"} />
        <span className="uppercase">{current}</span>
        <ChevronDown aria-hidden className={cn("text-muted-foreground transition-transform", large ? "size-4" : "size-3.5", open && "rotate-180")} />
      </button>
      <ul
        id={id}
        hidden={!open}
        className={cn(
          "absolute right-0 z-50 border bg-background shadow-xl shadow-brand/10",
          up ? "bottom-full mb-2" : "top-full mt-2",
          large ? "w-52 rounded-2xl p-2" : "w-44 rounded-xl p-1.5",
        )}
      >
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Link
              href={href}
              locale={locale}
              prefetch={false}
              lang={locale}
              aria-current={locale === current ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between gap-3 transition-colors hover:bg-muted",
                large ? "rounded-xl px-3 py-2.5 text-base" : "rounded-lg px-2.5 py-2 text-sm",
              )}
            >
              {NAMES[locale]}
              {locale === current && <Check aria-hidden className={cn("text-brand", large ? "size-4.5" : "size-4")} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
