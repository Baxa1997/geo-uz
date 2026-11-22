"use client";

import { useMutation } from "@tanstack/react-query";
import { CreditCardIcon as CreditCard } from "@phosphor-icons/react/dist/ssr/CreditCard";
import { FileTextIcon as FileText } from "@phosphor-icons/react/dist/ssr/FileText";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/api/client";
import type { CheckoutRequest, ProjectBilling } from "@/shared/types/api";

/**
 * Tarif's last part, as Peec's "Billing": the payment method and the invoices, each a card with its mark. Since 22 Nov
 * 2026 both are on Stripe's own billing page, opened from here once the project has paid (`billing.portal`); before a
 * first payment they say so, and without Stripe set up they say "soon".
 */
export function PlanBilling({ projectId, billing }: { projectId: string; billing: ProjectBilling }) {
  const t = useTranslations("Settings.plan");
  const locale = useLocale() as CheckoutRequest["language"];
  const portal = useMutation({
    mutationFn: () => api.openBillingPortal(projectId, { language: locale }),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const chip = billing.online ? t("afterPayment") : t("soonChip");

  return (
    <section aria-labelledby="billing-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="billing-title" className="text-lg font-semibold tracking-tight">
            {t("billingTitle")}
          </h2>
          <p className="text-[0.9375rem] text-pretty text-muted-foreground">{billing.online ? t("onlineText") : t("billingText")}</p>
        </div>
        {billing.portal && (
          <Button disabled={portal.isPending} onClick={() => portal.mutate()} className="h-9">
            {t("openBilling")}
          </Button>
        )}
      </header>
      {portal.isError && (
        <p role="alert" className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-pretty ring-1 ring-negative/30">
          {t("checkoutFailed")}
        </p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["payment", CreditCard],
            ["invoices", FileText],
          ] as const
        ).map(([key, Icon]) => (
          <li key={key} className="flex items-center gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Icon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[1.0625rem] font-medium">{t(`${key}.title`)}</p>
              <p className="text-[0.9375rem] text-pretty text-muted-foreground">{t(`${key}.text`)}</p>
            </div>
            {/* Once paid, both are on Stripe's billing page, opened by the button above */}
            {!billing.portal && <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-sm text-muted-foreground">{chip}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
