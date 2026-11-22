import { SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { WarningCircleIcon as Warning } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";
import { trialDaysLeft } from "@/shared/helpers/billing";
import type { ProjectBilling } from "@/shared/types/api";

/**
 * Strip above the overview while the project isn't paid up (`billing.status`, 22 Nov 2026): during the trial's 7 days
 * how many are left; then that the trial has ended (the first report stays); a failed payment pausing the checks; a
 * subscription that ended. Each with the way to the plans.
 */
export function TrialNotice({ href, billing }: { href: string; billing: ProjectBilling }) {
  const t = useTranslations("Trial");
  const status = billing.status ?? "active";
  if (status === "active") return null;
  const unpaid = status === "unpaid";
  const [title, text] =
    status === "trial"
      ? [t("title", { days: trialDaysLeft(billing) }), t("text")]
      : status === "trial_ended"
        ? [t("endedTitle"), t("endedText")]
        : unpaid
          ? [t("unpaidTitle"), t("unpaidText")]
          : [t("canceledTitle"), t("canceledText")];
  const Icon = unpaid ? Warning : Sparkles;

  return (
    <div id="billing-notice" data-billing={status} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-you/30 bg-you-soft/40 px-4 py-3">
      <p className="flex min-w-0 flex-1 items-start gap-2.5 text-sm text-pretty">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-you" />
        <span>
          <span className="font-medium">{title}.</span> {text}
        </span>
      </p>
      <ArrowLink href={href}>{unpaid ? t("unpaidCta") : t("cta")}</ArrowLink>
    </div>
  );
}
