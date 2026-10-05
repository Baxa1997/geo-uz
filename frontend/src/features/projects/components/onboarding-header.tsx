import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { LogoutButton } from "@/shared/components/logout-button";

/** Top of the first run's screen, which has no sidebar: logo, who is logged in, language, log out. */
export function OnboardingHeader({ who }: { who: string | null }) {
  const t = useTranslations("Onboarding");

  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between gap-3 border-b px-5 sm:px-8">
      <Logo />
      <div className="flex min-w-0 items-center gap-1">
        {who && <span className="hidden truncate pr-2 text-sm text-muted-foreground sm:block">{t("loggedInAs", { who })}</span>}
        <LocaleSwitcher />
        <LogoutButton />
      </div>
    </header>
  );
}
