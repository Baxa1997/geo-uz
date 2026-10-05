import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/shared/components/logo";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { USE_MOCKS } from "@/shared/api/client";
import { formatPhone } from "@/shared/helpers/phone";
import { PhoneLogin } from "../components/phone-login";
import { TelegramButton } from "../components/telegram-button";
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
  const demoPhone = USE_MOCKS ? (await import("@/mocks/accounts")).DEMO_USER.phone : null;

  return (
    <div className="flex flex-col gap-8">
      <Logo className="self-start" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("heading")}</h1>
        {target.snapshot && <p className="text-sm text-pretty text-muted-foreground">{t("descriptionCheck")}</p>}
      </div>

      <div className="flex flex-col gap-6">
        <PhoneLogin target={target} />
        <div className="flex items-center gap-4 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          <span aria-hidden className="h-px flex-1 bg-border" />
          {t("or")}
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>
        <TelegramButton target={target} />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/check" className="font-semibold text-foreground underline-offset-4 hover:underline">
          {t("startFree")}
        </Link>
      </p>

      {demoPhone && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-pretty text-muted-foreground">
          {t("mockHint", { phone: formatPhone(demoPhone) })}
        </p>
      )}
    </div>
  );
}
