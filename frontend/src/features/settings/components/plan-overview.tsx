"use client";

import { CalendarDays, ChevronDown, CreditCard, MessageCircleQuestion, Plus, Users } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { EngineIcon } from "@/shared/components/engine-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { ENGINES, PLAN_PRICES, TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { Project } from "@/shared/types/api";

/**
 * The top of Tarif, laid out like Peec's "Plans": a title and a line, then one card: on the left the plan
 * ("Current"), its price a month, how it is paid, when it renews, and what the project uses of it (its
 * questions and competitors); on the right, on gray, Peec's "Model tracking" as ours: the assistants the
 * plan asks (ChatGPT) and the ones to add, which say "soon".
 */
export function PlanOverview({ project, promptsUsed }: { project: Project; promptsUsed: number }) {
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
    { key: "prompts", icon: MessageCircleQuestion, value: `${promptsUsed} / ${project.limits.prompts}` },
    { key: "competitors", icon: Users, value: `${project.competitors.length} / ${project.limits.competitors}` },
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
        <div className="grid gap-2 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5 p-4">
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-2 text-[0.9375rem] font-medium">
                {t("yourPlan")}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{t("current")}</span>
              </p>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold tracking-tight">{plans(project.plan)}</span>
                <span className="text-sm text-muted-foreground">{t("pricePlain", { amount: money })}</span>
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 @xl:grid-cols-4">
              {facts.map(({ key, icon: Icon, value }) => (
                <div key={key} className="flex items-center gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Icon className="size-[1.125rem]" />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <dt className="text-xs text-muted-foreground">{t(`facts.${key}`)}</dt>
                    <dd className="text-sm font-semibold tabular-nums">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-muted/70 p-4">
            <p className="text-[0.9375rem] font-medium">{t("assistantsTitle")}</p>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t("assistantsBase")}</span>
              <span className="flex items-center gap-2 font-medium">
                {live.map((engine) => (
                  <span key={engine.key} className="inline-flex items-center gap-1.5">
                    <EngineIcon engine={engine.key} />
                    {engines(engine.key)}
                  </span>
                ))}
                <span className="tabular-nums">· {live.length}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-foreground/15 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t("assistantsAddOn")}</span>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Plus aria-hidden className="size-4" />
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
            <p className={cn("text-xs text-pretty text-muted-foreground")}>{t("assistantsNote")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
