import { useTranslations } from "next-intl";
import { Logo } from "@/shared/components/logo";
import { Link } from "@/i18n/navigation";
import { CONTACT, SECTION } from "../../constants";

type FooterLink =
  | { label: string; href: string | { pathname: "/"; hash: string } }
  | { label: string; soon: true }
  | { label: string; text: string };

/** Dark footer: the brand line, then groups of links to the page's sections. */
export function Footer() {
  const t = useTranslations("Landing.footer");
  const home = (hash: string) => ({ pathname: "/" as const, hash });

  const columns: { key: "product" | "resources" | "company" | "contact" | "legal"; links: FooterLink[] }[] = [
    {
      key: "product",
      links: [
        { label: t("links.metrics"), href: home(SECTION.metrics) },
        { label: t("links.features"), href: home(SECTION.features) },
        { label: t("links.reports"), href: home(SECTION.reports) },
        { label: t("links.pricing"), href: home(SECTION.pricing) },
      ],
    },
    {
      key: "resources",
      links: [
        { label: t("links.check"), href: home(SECTION.check) },
        { label: t("links.method"), href: home(SECTION.method) },
        { label: t("links.faq"), href: home(SECTION.faq) },
      ],
    },
    {
      key: "company",
      links: [
        { label: t("links.local"), href: home(SECTION.local) },
        { label: t("links.demo"), href: home(SECTION.demo) },
        { label: t("links.login"), href: "/login" },
      ],
    },
    {
      key: "contact",
      links: [
        { label: "Email", text: CONTACT.email },
        { label: "Telegram", text: CONTACT.telegram },
      ],
    },
    {
      key: "legal",
      links: [
        { label: t("links.privacy"), soon: true },
        { label: t("links.terms"), soon: true },
      ],
    },
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div className="flex flex-col items-start gap-5">
          <Logo className="self-start" />
          <p className="text-xl/snug font-medium text-balance">
            {t("tagline")} <span className="block text-background/60">{t("taglineMuted")}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map(({ key, links }) => (
            <nav key={key} aria-labelledby={`footer-${key}`} className="flex flex-col gap-4">
              <h2 id={`footer-${key}`} className="text-sm font-medium">
                {t(`columns.${key}`)}
              </h2>
              <ul className="flex flex-col gap-3 text-sm text-background/65">
                {links.map((link) => (
                  <li key={link.label}>
                    {"href" in link ? (
                      <Link href={link.href} className="transition-colors hover:text-background">
                        {link.label}
                      </Link>
                    ) : "text" in link ? (
                      <>
                        <span className="sr-only">{link.label}: </span>
                        {link.text}
                      </>
                    ) : (
                      <>
                        {link.label} <span className="block text-xs text-background/60">({t("soon")})</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-background/15 px-4 py-6 text-sm text-background/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-pretty">{t("description")}</p>
        <p className="shrink-0">
          {t("rights")} · {t("madeIn")}
        </p>
      </div>
    </footer>
  );
}
