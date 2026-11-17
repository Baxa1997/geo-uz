import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import { NAV, SECTION, TILE_COLORS } from "../../constants";
import { MobileMenu } from "./mobile-menu";
import { NavMenu } from "./nav-menu";
import { NavbarShell } from "./navbar-shell";
import { SectionLink } from "../section-link";

/** Logo, the menus (Product, Resources) and links (Pricing, Agencies), language, log in and the free check. */
export function Navbar() {
  const t = useTranslations("Landing.nav");

  return (
    <NavbarShell>
      <Logo size="lg" />
      <nav aria-label={t("label")} className="hidden lg:block">
        <ul className="flex items-center gap-1 text-base">
          {NAV.map((entry) => (
            <li key={entry.key}>
              {"items" in entry ? (
                <NavMenu label={t(entry.key)}>
                  <ul className="flex flex-col">
                    {entry.items.map(({ key, hash, icon: Icon }, index) => (
                      <li key={key}>
                        <SectionLink
                          hash={hash}
                          className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-muted"
                        >
                          <span
                            aria-hidden
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
                            style={{ background: TILE_COLORS[index % TILE_COLORS.length] }}
                          >
                            <Icon className="size-5.5" />
                          </span>
                          <span className="flex flex-col gap-0.5">
                            <span className="font-semibold">{t(`items.${key}.title`)}</span>
                            <span className="text-sm text-muted-foreground">{t(`items.${key}.text`)}</span>
                          </span>
                        </SectionLink>
                      </li>
                    ))}
                  </ul>
                </NavMenu>
              ) : (
                <SectionLink
                  hash={entry.hash}
                  className="flex h-11 items-center rounded-xl px-4 text-foreground/75 transition-colors hover:text-foreground"
                >
                  {t(entry.key)}
                </SectionLink>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block">
          <LocaleSwitcher menu />
        </div>
        <Link href="/login" className="hidden h-11 items-center rounded-xl px-4 text-base font-semibold transition-colors hover:bg-muted lg:inline-flex">
          {t("login")}
        </Link>
        {/* Under 380px the button doesn't fit beside the logo and the menu; the menu has it too */}
        <SectionLink
          hash={SECTION.check}
          className={cn(buttonVariants({ variant: "brand" }), "h-11 rounded-xl px-4 text-base font-semibold max-sm:px-3 max-[379px]:hidden")}
        >
          {t("cta")}
        </SectionLink>
        <MobileMenu />
      </div>
    </NavbarShell>
  );
}
