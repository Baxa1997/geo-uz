import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { Logo } from "@/shared/components/logo";
import { redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { AUTH_LIVE } from "@/shared/api/client";
import { getCurrentUser } from "@/shared/api/session";
import { SESSION_COOKIE } from "@/shared/constants";
import { EmailLogin } from "../components/email-login";
import { parseLoginTarget, startsFreeCheck } from "../helpers/login-target";

type Props = PageProps<"/[locale]/login">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: t("title") };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const locale = setPageLocale((await params).locale);
  const [query, t, cookieStore] = await Promise.all([
    searchParams,
    getTranslations({ locale, namespace: "Login" }),
    cookies(),
  ]);
  const target = parseLoginTarget(query);
  const freeCheck = !target.snapshot && startsFreeCheck(query, target);
  // With a session cookie proxy.ts sends the visitor on before this page, unless a page found the session
  // ended (?expired=1). Without a cookie the backend isn't asked at all: the form shows at once. With one, it
  // is asked, since another tab may have logged in again meanwhile.
  const expired = cookieStore.has(SESSION_COOKIE);
  if (expired && (await getCurrentUser().catch(() => null))) redirect({ href: target.next ?? "/dashboard", locale });
  // Mock login only: the sample account's address, since any code works there
  const demoEmail = AUTH_LIVE ? null : (await import("@/mocks/accounts")).DEMO_USER.email;

  return (
    <div className="flex flex-col gap-8">
      <Logo className="self-start" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("heading")}</h1>
        {target.snapshot && <p className="text-sm text-pretty text-muted-foreground">{t("descriptionCheck")}</p>}
        {freeCheck && <p className="text-sm text-pretty text-muted-foreground">{t("freeCheck")}</p>}
        {expired && query.expired && <p className="text-sm text-pretty text-muted-foreground">{t("expired")}</p>}
      </div>

      <EmailLogin target={target} />

      {/* The free check starts after login, so a new visitor needs no link from here: the code makes the account */}
      {!freeCheck && <p className="text-center text-sm text-pretty text-muted-foreground">{t("noAccount")}</p>}

      {demoEmail && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-pretty text-muted-foreground">
          {t("mockHint", { email: demoEmail })}
        </p>
      )}
    </div>
  );
}
