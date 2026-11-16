import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/shared/components/logo";
import { Link, redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { AUTH_LIVE } from "@/shared/api/client";
import { getCurrentUser } from "@/shared/api/session";
import { EmailLogin } from "../components/email-login";
import { parseLoginTarget } from "../helpers/login-target";

type Props = PageProps<"/[locale]/login">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: t("title") };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const locale = setPageLocale((await params).locale);
  const [target, t] = await Promise.all([
    searchParams.then(parseLoginTarget),
    getTranslations({ locale, namespace: "Login" }),
  ]);
  // Logged in already (the session lasts 30 days): straight to where they were going, never the form again.
  // Asked of the backend, not read off the cookie: a cookie whose session has ended must still get the form.
  if (await getCurrentUser().catch(() => null)) redirect({ href: target.next ?? "/dashboard", locale });
  // Mock login only: the sample account's address, since any code works there
  const demoEmail = AUTH_LIVE ? null : (await import("@/mocks/accounts")).DEMO_USER.email;

  return (
    <div className="flex flex-col gap-8">
      <Logo className="self-start" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("heading")}</h1>
        {target.snapshot && <p className="text-sm text-pretty text-muted-foreground">{t("descriptionCheck")}</p>}
      </div>

      <EmailLogin target={target} />

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/check" className="font-semibold text-foreground underline-offset-4 hover:underline">
          {t("startFree")}
        </Link>
      </p>

      {demoEmail && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-pretty text-muted-foreground">
          {t("mockHint", { email: demoEmail })}
        </p>
      )}
    </div>
  );
}
