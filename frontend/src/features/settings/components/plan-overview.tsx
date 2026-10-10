"use client";

import { CalendarDays, ChevronDown, CreditCard, Plus } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { EngineIcon } from "@/shared/components/engine-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { ENGINES, PLAN_PRICES, TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { Project } from "@/shared/types/api";

/**
 * The top of Tarif, laid out like Peec's "Plans" (the user's correction of Oct 10: "design must be the
 * same"): a title and a line, then one card: on the left the plan ("Current") with its price a month, how
 * it is paid and when it renews; on the right, on gray, Peec's "Model tracking" as ours: how many
 * assistants the plan asks, and the ones to add, which say "soon".
 */
export function PlanOverview({ project }: { project: Project }) {
  const t = useTranslations("Settings.plan");
  const plans = useTranslations("Plans");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const money = new Intl.NumberFormat(locale === "uz" ? "ru" : locale).format(PLAN_PRICES[project.plan]);
  const live = ENGINES.filter((engine) => engine.live);
  const soon = ENGINES.filter((engine) => !engine.live);

  const facts = [
    { key: "cycle", icon: CalendarDays, value: t(`cycles.${project.billing.cycle}`) },
    { key: "renews", icon: CreditCard, value: project.billing.renewsAt ? formatLongDate(project.billing.renewsAt, locale, timeZone) : "—" },
  ] as const;

  return (
    <section data-tour="current" aria-labelledby="plans-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <h2 id="plans-title" className="text-lg font-semibold tracking-tight">
          {t("plansTitle")}
        </h2>
        <p className="text-[0.9375rem] text-pretty text-muted-foreground">{t("plansText")}</p>
      </header>

      <div className="@container rounded-2xl bg-card p-2 ring-1 ring-foreground/10">
        <div className="grid gap-2 @3xl:grid-cols-2">
          <div className="flex flex-col gap-5 p-4">
            <p className="flex items-center gap-2 text-[1.0625rem] font-medium">
              {t("yourPlan")}
              <span className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-sm font-normal text-muted-foreground">{t("current")}</span>
            </p>
            <p className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="text-[1.375rem] leading-7 font-semibold tracking-tight">{plans(project.plan)}</span>
              <span className="text-[0.9375rem] text-muted-foreground">{t("pricePlain", { amount: money })}</span>
            </p>
            <dl className="flex flex-wrap gap-x-10 gap-y-4">
              {facts.map(({ key, icon: Icon, value }) => (
                <div key={key} className="flex items-center gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Icon className="size-[1.125rem]" />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <dt className="text-sm text-muted-foreground">{t(`facts.${key}`)}</dt>
                    <dd className="text-[0.9375rem] font-semibold">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-4 rounded-xl bg-muted/70 p-4">
            <p className="text-[1.0625rem] font-medium">{t("assistantsTitle")}</p>
            <div className="flex items-center justify-between gap-3 px-1 text-[0.9375rem]">
              <span className="text-muted-foreground">{t("assistantsBase")}</span>
              {/* Which ones the plan cards below show; here only how many, as Peec's */}
              <span className="font-semibold tabular-nums">{live.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-foreground/15 px-3 py-2 text-[0.9375rem]">
              <span className="text-muted-foreground">{t("assistantsAddOn")}</span>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Plus aria-hidden className="size-4 text-muted-foreground" />
                  {t("assistantsAdd")}
                  <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  {soon.map((engine) => (
                    <DropdownMenuItem key={engine.key} disabled>
                      <EngineIcon engine={engine.key} />
                      <span className="flex-1">{engines(engine.key)}</span>
                      <span className="text-xs text-muted-foreground">{t("soon")}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
