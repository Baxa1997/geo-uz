import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Logo } from "@/shared/components/logo";
import { redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { adminApi } from "@/shared/api/client";
import { AppProviders } from "@/shared/components/app-providers";
import { AdminLoginForm } from "../components/admin-login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/login">): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("login.title"), robots: { index: false, follow: false } };
}

/** The admin page's own login (the user's choice of 25 Nov 2026: a name and a password, apart from the accounts' email codes). */
export default async function AdminLoginPage({ params }: PageProps<"/[locale]/admin/login">) {
  const locale = setPageLocale((await params).locale);
  await connection();
  // Logged in already: straight to the overview
  const me = await adminApi.me().catch(() => null);
  if (me) redirect({ href: "/admin", locale });
  const t = await getTranslations({ locale, namespace: "Admin.login" });

  return (
    <AppProviders>
      <main className="grid min-h-dvh place-items-center bg-sidebar px-4 py-10">
        <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border bg-background p-6 shadow-xs sm:p-8">
          <Logo />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-pretty text-muted-foreground">{t("text")}</p>
          </div>
          <AdminLoginForm />
        </div>
      </main>
    </AppProviders>
  );
}
