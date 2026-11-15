"use client";

import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { InfoIcon as Info } from "@phosphor-icons/react/dist/ssr/Info";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Hint } from "@/shared/components/hint";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { NamedBrandChips } from "@/shared/components/scores/named-brand-chips";
import { SiteAudit } from "@/shared/components/site-audit";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { labelFor, placeLabel } from "@/shared/helpers/labels";
import { answersNaming, namedBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { FirstRunResult } from "@/shared/types/api";
import { FIRST_RUN_MISSED } from "../constants";
import { brandCounts, placeOf } from "../helpers/first-run";
import { FirstRunBrandView } from "./first-run-brand-view";

/**
 * The first statistics, numbers first: one sentence on where the business stands, three figures, every
 * business side by side, each assistant apart when two were asked, the conclusion, what the assistants say of the business by name, the questions without the client,
 * what on the website stands in the way, then the way on to the setup.
 */
export function FirstRunResultView({ result, runId, onAgain }: { result: FirstRunResult; runId: string; onAgain: () => void }) {
  const t = useTranslations("FirstRun");
  const messages = useMessages();
  const locale = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The progress screen was just replaced: move focus to the result for screen readers
  useEffect(() => headingRef.current?.focus(), []);

  const total = result.answers || result.prompts.reduce((sum, item) => sum + item.answers.length, 0);
  const counts = brandCounts(result);
  const you = counts.find((row) => row.isYou) ?? counts[0];
  const leader = counts.find((row) => !row.isYou && row.named > 0);
  const place = placeOf(counts, you);
  const brands = [result.brand, ...result.competitors];
  const missed = result.prompts
    .filter((item) => answersNaming(item, result.brand.id) === 0)
    .map((item) => ({ item, named: namedBrands(item, brands, result.brand.id) }))
    .filter(({ named }) => named.length > 0);
  // One decimal, with the comma Uzbek and Russian use (the browser has no Uzbek number format)
  const position = (value: number | null) => (value === null ? "—" : `#${(Math.round(value * 10) / 10).toString().replace(".", locale === "en" ? "." : ",")}`);

  const verdict =
    you.named === 0
      ? leader
        ? t("verdictAbsent", { total, leader: leader.brand.name, leaderNamed: leader.named })
        : t("verdictNobody", { total })
      : leader && leader.named > you.named
        ? t("verdictBehind", { named: you.named, total, recommended: you.recommended, leader: leader.brand.name, leaderNamed: leader.named })
        : t("verdictLeads", { named: you.named, total, recommended: you.recommended });

  const conclusion = result.conclusion?.[locale as "uz" | "ru" | "en"];

  const figures = [
    { key: "named", value: you.named, of: total },
    { key: "recommended", value: you.recommended, of: total },
    { key: "place", value: you.named > 0 ? `#${place}` : "—", of: counts.length },
  ] as const;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{t("resultKicker")}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold tracking-[-0.03em] text-balance outline-none">
          {t("resultTitle", { brand: result.brand.name })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {result.domain} · {labelFor(messages.Categories, result.category)} · {placeLabel(messages.Cities, locale, result)}
        </p>
        <MethodLabel method={result.method} />
      </div>

      {result.replayed && (
        <p className="flex items-start gap-2 rounded-lg border border-progress/40 bg-progress/10 px-3 py-2.5 text-sm text-pretty">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-progress" />
          {t("replayed", { site: result.domain })}
        </p>
      )}

      <p className="rounded-xl bg-brand-soft px-4 py-3.5 text-lg/7 font-medium text-pretty">{verdict}</p>

      <dl className="grid divide-y rounded-xl border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {figures.map(({ key, value, of }) => (
          <div key={key} className="flex flex-col gap-1 p-4 sm:p-5">
            <dt className="text-sm text-muted-foreground">
              <Hint text={t(`figures.${key}.hint`)}>{t(`figures.${key}.label`)}</Hint>
            </dt>
            <dd className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight tabular-nums">{value}</span>
              <span className="text-sm text-muted-foreground">{t(`figures.${key}.of`, { total: of })}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-col gap-1 border-b p-4 sm:px-5">
          <h2 className="font-semibold">{t("brandsTitle")}</h2>
          <p className="text-sm text-pretty text-muted-foreground">{t("brandsText", { total })}</p>
        </div>
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-normal sm:px-5">{t("columns.brand")}</th>
                {(["named", "recommended", "position"] as const).map((column) => (
                  <th key={column} scope="col" className="px-4 py-2.5 text-right font-normal whitespace-nowrap">
                    <Hint text={t(`columns.${column}Hint`)}>{t(`columns.${column}`)}</Hint>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {counts.map((row, index) => (
                <tr key={row.brand.id} className={cn("border-b last:border-b-0", row.isYou && "bg-brand-soft/60")}>
                  <th scope="row" className="px-4 py-3 text-left font-medium sm:px-5">
                    <span className="mr-2.5 inline-block w-4 text-muted-foreground tabular-nums">{index + 1}</span>
                    {row.brand.name}
                    {row.isYou && <span className="ml-1.5 font-normal text-muted-foreground">({t("you")})</span>}
                  </th>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-end gap-2.5">
                      {/* Against all answers, not against the longest row: 3 of 10 must not look full */}
                      <span aria-hidden className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
                        <span className={cn("block h-full rounded-full", row.isYou ? "bg-brand" : "bg-rival-strong")} style={{ width: `${total ? (row.named / total) * 100 : 0}%` }} />
                      </span>
                      <span className="w-12 text-right font-semibold tabular-nums">{t("ofTotal", { count: row.named, total })}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.recommended}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{position(row.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.engines.length > 1 && (
        <div className="rounded-xl border bg-background">
          <div className="flex flex-col gap-1 border-b p-4 sm:px-5">
            <h2 className="font-semibold">{t("enginesTitle")}</h2>
            <p className="text-sm text-pretty text-muted-foreground">{t("enginesText")}</p>
          </div>
          <ul className="divide-y">
            {result.engines.map((engine) => {
              const score = engine.scores.find((item) => item.brandId === result.brand.id);
              return (
                <li key={engine.engine} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                  <span className="font-medium">{engine.name}</span>
                  <span className="tabular-nums">{t("engineNamed", { count: Math.round((score?.visibility ?? 0) * engine.answers), total: engine.answers })}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {conclusion && (
        <div className="flex flex-col gap-1.5 rounded-xl border bg-background p-4 sm:px-5">
          <h2 className="font-semibold">
            <Hint text={t("conclusionHint")}>{t("conclusionTitle")}</Hint>
          </h2>
          <p className="text-[0.95rem]/7 text-pretty">{conclusion}</p>
        </div>
      )}

      {result.brandView && result.brandView.length > 0 && <FirstRunBrandView views={result.brandView} brand={result.brand.name} />}

      {missed.length > 0 && (
        <div className="rounded-xl border bg-background">
          <div className="flex flex-col gap-1 border-b p-4 sm:px-5">
            <h2 className="font-semibold">{t("missedTitle", { count: missed.length })}</h2>
            <p className="text-sm text-pretty text-muted-foreground">{t("missedText")}</p>
          </div>
          <ul className="divide-y">
            {missed.slice(0, FIRST_RUN_MISSED).map(({ item, named }) => (
              <li key={item.prompt.id} className="flex flex-col gap-1.5 px-4 py-3 sm:px-5">
                <p className="text-sm font-medium text-pretty">
                  <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">{item.prompt.language}</span>
                  {item.prompt.text}
                </p>
                <NamedBrandChips named={named} youId={result.brand.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <SiteAudit checks={result.siteChecks} sources={result.topSources} />

      <div className="flex flex-col gap-4 rounded-xl bg-brand p-5 text-brand-foreground sm:flex-row sm:items-center sm:p-6">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-lg font-semibold">{t("nextTitle")}</h2>
          <p className="text-sm text-pretty text-brand-foreground/80">{t("nextText")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={{ pathname: "/onboarding", query: { firstRun: runId } }}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 border-transparent bg-background px-5 text-brand hover:bg-background/90 hover:text-brand")}
          >
            {t("next")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Link>
          <Button variant="ghost" size="lg" className="h-11 text-brand-foreground hover:bg-white/10 hover:text-brand-foreground" onClick={onAgain}>
            {t("again")}
          </Button>
        </div>
      </div>
    </section>
  );
}
