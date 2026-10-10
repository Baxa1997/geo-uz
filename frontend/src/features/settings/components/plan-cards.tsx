"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, FileCheck2, FolderOpen, Lock, Minus, RefreshCw, Users, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { EngineIcon } from "@/shared/components/engine-icon";
import { ConfirmModal } from "@/shared/components/modal";
import { Segmented, SegmentedButton } from "@/shared/components/segmented";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/api/client";
import { ENGINES, MANAGED_PRICE_FROM, PLAN_BRANDS, PLAN_LIMITS, PLAN_PRICES, PLANS, YEARLY_MONTHS_PAID } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { BillingCycle, Plan } from "@/shared/types/api";

type Choice = Plan | "managed";
type Ask = Choice | "cancel";

/** What each plan includes, in Peec's checklist: ✓ or a dash. Texts in messages/Settings.plan.features. */
const FEATURES = ["users", "reports", "wrongFacts", "actions", "agencyName", "done"] as const;
const INCLUDED: Record<Choice, (typeof FEATURES)[number][]> = {
  start: ["users", "reports"],
  business: ["users", "reports", "wrongFacts", "actions"],
  agency: ["users", "reports", "wrongFacts", "actions", "agencyName"],
  managed: ["users", "reports", "wrongFacts", "actions", "done"],
};

/** The numbers of a plan, each with its mark, as Peec's "Tracked prompts", "Projects", "Countries". */
const LIMITS: { key: "prompts" | "brands" | "competitors" | "facts"; icon: LucideIcon }[] = [
  { key: "prompts", icon: RefreshCw },
  { key: "brands", icon: FolderOpen },
  { key: "competitors", icon: Users },
  { key: "facts", icon: FileCheck2 },
];

/**
 * "Base plan", laid out like Peec's: a title with Monthly / Yearly on the right, then the plans side by side
 * and Managed GEO. Each card: the name in gray, the price large, its numbers with their marks, the button
 * (the current plan's cancels it, the others switch to them, Managed GEO talks to us), the assistants it
 * asks (ChatGPT with web search; Gemini and Yandex "soon", locked) and what it includes, ✓ or a dash.
 * Billing isn't built: a switch or a cancel sends us a request after a "sure?", and the page says so.
 */
export function PlanCards({ projectId, current, cycle: initialCycle }: { projectId: string; current: Plan; cycle: BillingCycle }) {
  const t = useTranslations("Settings.plan");
  const plans = useTranslations("Plans");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const [cycle, setCycle] = useState(initialCycle);
  const [asking, setAsking] = useState<Ask | null>(null);
  const request = useMutation({
    mutationFn: (plan: Ask) => api.requestPlan(projectId, { plan, cycle }),
    onSuccess: () => setAsking(null),
  });
  const money = (amount: number) => new Intl.NumberFormat(locale === "uz" ? "ru" : locale).format(amount);
  const name = (choice: Choice) => (choice === "managed" ? t("managed") : plans(choice));
  // A year paid ahead, shown a month, rounded to a thousand soums
  const monthly = (price: number) => (cycle === "year" ? Math.round((price * YEARLY_MONTHS_PAID) / 12 / 1000) * 1000 : price);
  const live = ENGINES.filter((engine) => engine.live);
  const soon = ENGINES.filter((engine) => !engine.live);
  const cards: Choice[] = [...PLANS, "managed"];

  return (
    <section data-tour="plans" aria-labelledby="base-plan" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="base-plan" className="text-lg font-semibold tracking-tight">
            {t("baseTitle")}
          </h2>
          <p className="text-[0.9375rem] text-pretty text-muted-foreground">{t("baseText")}</p>
        </div>
        <Segmented label={t("cycleLabel")}>
          {(["month", "year"] as const).map((key) => (
            <SegmentedButton key={key} pressed={cycle === key} onClick={() => setCycle(key)}>
              {t(`cycleSwitch.${key}`)}
            </SegmentedButton>
          ))}
        </Segmented>
      </header>

      {request.isSuccess && (
        <p role="status" className="rounded-xl bg-positive/10 px-4 py-3 text-sm text-pretty ring-1 ring-positive/30">
          {request.variables === "cancel" ? t("cancelRequested") : t("requested", { plan: name(request.variables) })}
        </p>
      )}

      <div className="@container">
        <ul className="grid gap-3 @2xl:grid-cols-2 @6xl:grid-cols-4">
          {cards.map((choice) => {
            const isCurrent = choice === current;
            const limits = choice === "managed" ? PLAN_LIMITS.business : PLAN_LIMITS[choice];
            const values = { ...limits, brands: choice === "managed" ? PLAN_BRANDS.business : PLAN_BRANDS[choice] };
            return (
              <li key={choice} className={cn("flex flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10", isCurrent && "ring-2 ring-you")}>
                <p className="text-[1.0625rem] text-muted-foreground">{name(choice)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.rich(choice === "managed" ? "priceFrom" : "price", {
                    amount: money(choice === "managed" ? MANAGED_PRICE_FROM : monthly(PLAN_PRICES[choice])),
                    b: (chunks) => <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{chunks}</span>,
                  })}
                </p>
                <p className="min-h-5 text-xs text-pretty text-muted-foreground">
                  {cycle === "year" && choice !== "managed"
                    ? t("yearTotal", { amount: money(PLAN_PRICES[choice] * YEARLY_MONTHS_PAID), free: 12 - YEARLY_MONTHS_PAID })
                    : t(`for.${choice}`)}
                </p>

                <dl className="mt-4 flex flex-col gap-3 border-t pt-4 text-[0.9375rem]">
                  {LIMITS.map(({ key, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2.5 text-foreground/80">
                        <Icon aria-hidden className="size-4 text-muted-foreground" />
                        {t(`limits.${key}`)}
                      </dt>
                      <dd className="font-semibold tabular-nums">{values[key] === 0 ? <span className="font-normal text-muted-foreground">—</span> : values[key]}</dd>
                    </div>
                  ))}
                </dl>

                <Button
                  variant={isCurrent ? "outline" : "default"}
                  disabled={request.isPending}
                  onClick={() => setAsking(isCurrent ? "cancel" : choice)}
                  className={cn("mt-5 h-10 w-full", isCurrent && "bg-background")}
                >
                  {isCurrent ? t("cancel") : choice === "managed" ? t("contact") : t("switch")}
                </Button>

                <div className="mt-5 flex flex-col gap-3 border-t pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs tracking-wide text-muted-foreground uppercase">{t("assistants")}</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{t("weekly")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-you-soft/60 px-2.5 py-0.5 text-xs font-medium text-foreground">{t("webSearch")}</span>
                    <span className="text-xs text-muted-foreground">{t("assistantCount", { count: live.length })}</span>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {live.map((engine) => (
                      <li key={engine.key} className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
                        <EngineIcon engine={engine.key} className="size-5" />
                        <span className="sr-only">{engines(engine.key)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t("soonChip")}</span>
                    <span className="text-xs text-muted-foreground">{soon.map((engine) => engines(engine.key)).join(", ")}</span>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {soon.map((engine) => (
                      <li key={engine.key} className="relative flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground/60">
                        <EngineIcon engine={engine.key} className="size-5" />
                        <Lock aria-hidden className="absolute right-0.5 bottom-0.5 size-3 rounded-sm bg-card p-px text-muted-foreground" />
                        <span className="sr-only">{t("engineSoon", { engine: engines(engine.key) })}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ul className="mt-5 flex flex-col gap-2.5 border-t pt-5 text-[0.9375rem]">
                  {FEATURES.map((feature) => {
                    const included = INCLUDED[choice].includes(feature);
                    return (
                      <li key={feature} className={cn("flex items-start gap-2.5", !included && "text-muted-foreground/70")}>
                        {included ? <Check aria-hidden className="mt-0.5 size-4 shrink-0" /> : <Minus aria-hidden className="mt-0.5 size-4 shrink-0" />}
                        <span className="text-pretty">
                          {t(`features.${feature}`)}
                          {!included && <span className="sr-only"> — {t("notIncluded")}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmModal
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        title={asking === "cancel" ? t("cancelTitle", { plan: plans(current) }) : t("askTitle", { plan: asking ? name(asking) : "" })}
        description={request.isError ? t("failed") : asking === "cancel" ? t("cancelText") : t("askText", { cycle: t(`cycles.${cycle}`) })}
        confirm={asking === "cancel" ? t("cancelConfirm") : t("askConfirm")}
        cancel={t("back")}
        danger={asking === "cancel"}
        pending={request.isPending}
        onConfirm={() => asking && request.mutate(asking)}
      />
    </section>
  );
}
