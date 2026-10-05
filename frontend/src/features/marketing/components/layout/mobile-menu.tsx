"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import { NAV, SECTION } from "../../constants";

/**
 * Below lg: every navbar link (the menus opened out), language, login and the main CTA in a drawer. A native modal
 * <dialog> traps focus, closes on Escape and makes the page inert, with no dialog library.
 */
export function MobileMenu() {
  const t = useTranslations("Landing.nav");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "lg:hidden")}
      >
        <Menu aria-hidden />
      </button>
      <dialog
        ref={dialogRef}
        aria-label={t("menu")}
        // A click on the backdrop lands on the <dialog> itself
        onClick={(event) => event.target === event.currentTarget && close()}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-xs bg-background p-0 text-foreground shadow-xl transition-transform duration-200 backdrop:bg-black/20 backdrop:backdrop-blur-xs open:flex open:flex-col starting:open:translate-x-full motion-reduce:transition-none"
      >
        <div className="flex justify-end p-2">
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          >
            <X aria-hidden />
          </button>
        </div>
        <nav aria-label={t("label")} className="flex min-h-0 flex-col gap-1 overflow-y-auto px-2">
          {NAV.map((entry) =>
            "items" in entry ? (
              <div key={entry.key} className="flex flex-col pb-2">
                <p className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">{t(entry.key)}</p>
                {entry.items.map(({ key, hash }) => (
                  <Link
                    key={key}
                    href={{ pathname: "/", hash }}
                    onClick={close}
                    className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-muted"
                  >
                    {t(`items.${key}.title`)}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={entry.key}
                href={{ pathname: "/", hash: entry.hash }}
                onClick={close}
                className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-muted"
              >
                {t(entry.key)}
              </Link>
            ),
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t p-4">
          <LocaleSwitcher />
          <Link href="/login" onClick={close} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}>
            {t("login")}
          </Link>
          <Link
            href={{ pathname: "/", hash: SECTION.check }}
            onClick={close}
            className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-11")}
          >
            {t("cta")}
          </Link>
        </div>
      </dialog>
    </>
  );
}
