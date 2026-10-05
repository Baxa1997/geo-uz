import { ArrowRight, Check, Tags, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import { MANAGED_PRICE_FROM, PRICING, PRICING_FEATURES, SECTION } from "../../constants";
import { MonoLabel } from "./mono-label";
import { PlanTable } from "./plan-table";
import { Panel, Section, SectionIntro } from "./section";

/** The plans as cards, the done-for-you service as a banner, then the full comparison. */
export function Pricing() {
  const t = useTranslations("Landing.pricing");

  return (
    <Section id={SECTION.pricing} labelledBy="pricing-title">
      <SectionIntro id="pricing-title" icon={Tags} pill={t("pill")} title={t("title")} sub={t("sub")} />

      <div className="flex flex-col gap-3">
        <ul data-reveal className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRICING.map(({ key, price, period, recommended, target }) => (
            <li key={key}>
              <Panel className={cn("relative flex h-full flex-col gap-6 p-6 sm:p-8", recommended && "shadow-xl ring-1 ring-foreground")}>
                {recommended && (
                  <MonoLabel className="absolute -top-3 left-6 rounded-md bg-brand px-2 py-1 text-brand-foreground">
                    {t("recommended")}
                  </MonoLabel>
                )}
                <div className="flex flex-col gap-3 border-b pb-6">
                  <h3 className="text-lg font-medium">{t(`tiers.${key}.name`)}</h3>
                  {/* The period sits under the price in every card, so long prices don't push it around */}
                  <p className="flex flex-col gap-0.5">
                    <span className="text-3xl font-semibold tracking-tight whitespace-nowrap">
                      {t("price", { amount: price })}
                    </span>
                    <span className="min-h-5 text-sm text-muted-foreground">{period && t("perMonth")}</span>
                  </p>
                </div>
                <p className="min-h-10 text-sm text-pretty text-muted-foreground">{t(`tiers.${key}.for`)}</p>
                <Link
                  href={{ pathname: "/", hash: target }}
                  className={cn(buttonVariants({ variant: recommended ? "brand" : "secondary", size: "lg" }), "h-11 w-full")}
                >
                  {t(`tiers.${key}.cta`)}
                </Link>
                <div className="flex flex-col gap-3 text-sm">
                  <p className="text-muted-foreground">{t("includes")}</p>
                  <ul className="flex flex-col gap-3">
                    {PRICING_FEATURES.map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        {t(`tiers.${key}.${feature}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>
            </li>
          ))}
        </ul>

        <div
          data-reveal
          className="flex flex-col gap-4 rounded-2xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
        >
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background shadow-xs">
            <Wrench className="size-5" />
          </span>
          <p className="flex-1 text-lg text-pretty">
            <span className="font-medium">{t("managedTitle")}</span>{" "}
            <span className="text-muted-foreground">{t("managed", { amount: MANAGED_PRICE_FROM })}</span>
          </p>
          <Link
            href={{ pathname: "/", hash: SECTION.demo }}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 bg-background px-4 shadow-xs")}
          >
            {t("managedCta")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Link>
        </div>
      </div>

      <PlanTable />
      <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
        {t("users")} {t("note")}
      </p>
    </Section>
  );
}
