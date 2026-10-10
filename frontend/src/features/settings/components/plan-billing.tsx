import { CreditCard, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Tarif's last part, as Peec's "Billing": the payment method and the invoices, each a card with its mark;
 * both "soon" until billing exists (Click, Payme or a bank transfer, then an invoice for every payment).
 */
export function PlanBilling() {
  const t = useTranslations("Settings.plan");
  return (
    <section aria-labelledby="billing-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <h2 id="billing-title" className="text-lg font-semibold tracking-tight">
          {t("billingTitle")}
        </h2>
        <p className="text-[0.9375rem] text-pretty text-muted-foreground">{t("billingText")}</p>
      </header>
      <ul className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["payment", CreditCard],
            ["invoices", FileText],
          ] as const
        ).map(([key, Icon]) => (
          <li key={key} className="flex items-center gap-4 rounded-2xl bg-card px-5 py-4 ring-1 ring-foreground/10">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Icon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-medium">
                {t(`${key}.title`)}
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-normal text-muted-foreground">{t("soon")}</span>
              </p>
              <p className="text-sm text-pretty text-muted-foreground">{t(`${key}.text`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
