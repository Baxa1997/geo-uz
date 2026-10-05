import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import { NAV, SECTION } from "../../constants";
import { MobileMenu } from "./mobile-menu";
import { NavMenu } from "./nav-menu";
import { NavbarShell } from "./navbar-shell";

/** Logo, the menus (Product, Resources) and links (Pricing, Agencies), language, log in and the free check. */
export function Navbar() {
  const t = useTranslations("Landing.nav");

  return (
    <NavbarShell>
      <Logo />
      <nav aria-label={t("label")} className="hidden lg:block">
        <ul className="flex items-center gap-1 text-sm">
          {NAV.map((entry) => (
            <li key={entry.key}>
              {"items" in entry ? (
                <NavMenu label={t(entry.key)}>
                  <ul className="flex flex-col">
                    {entry.items.map(({ key, hash, icon: Icon }) => (
                      <li key={key}>
                        <Link
                          href={{ pathname: "/", hash }}
                          className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
                        >
                          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium">{t(`items.${key}.title`)}</span>
                            <span className="text-muted-foreground">{t(`items.${key}.text`)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </NavMenu>
              ) : (
                <Link
                  href={{ pathname: "/", hash: entry.hash }}
                  className="flex h-9 items-center rounded-lg px-3 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(entry.key)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block">
          <LocaleSwitcher />
        </div>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "hidden h-9 px-3 lg:inline-flex")}>
          {t("login")}
        </Link>
        {/* On the narrowest phones the button doesn't fit beside the logo; the menu has it too */}
        <Link
          href={{ pathname: "/", hash: SECTION.check }}
          className={cn(buttonVariants({ variant: "brand" }), "h-9 px-3 max-[359px]:hidden")}
        >
          {t("cta")}
        </Link>
        <MobileMenu />
      </div>
    </NavbarShell>
  );
}
