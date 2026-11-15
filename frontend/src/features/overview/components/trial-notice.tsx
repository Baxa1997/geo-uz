import { SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";

/**
 * Strip above the overview while the project has only its free first check (`billing.status` "trial"):
 * nothing more is checked until a plan is paid, and the page says so with the way to the plans.
 */
export function TrialNotice({ href }: { href: string }) {
  const t = useTranslations("Trial");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-you/30 bg-you-soft/40 px-4 py-3">
      <p className="flex min-w-0 flex-1 items-start gap-2.5 text-sm text-pretty">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-you" />
        <span>
          <span className="font-medium">{t("title")}.</span> {t("text")}
        </span>
      </p>
      <ArrowLink href={href}>{t("cta")}</ArrowLink>
    </div>
  );
}
