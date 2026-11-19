"use client";

import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { InfoIcon as Info } from "@phosphor-icons/react/dist/ssr/Info";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BrandViewCard } from "@/shared/components/brand-view";
import { EngineIcon } from "@/shared/components/engine-icon";
import { Hint } from "@/shared/components/hint";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { NamedBrandChips } from "@/shared/components/scores/named-brand-chips";
import { SiteAudit } from "@/shared/components/site-audit";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { engineOf } from "@/shared/constants";
import { shortUrl } from "@/shared/helpers/domain";
import { labelFor, placeLabel } from "@/shared/helpers/labels";
import { answersNaming, namedBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { FirstRunResult } from "@/shared/types/api";
import { FIRST_RUN_MISSED } from "../constants";
import { brandCounts, placeOf } from "../helpers/first-run";
import { projectFromFirstRun } from "../helpers/onboarding";
import { FirstRunScreen } from "./first-run-screen";

/** The first statistics' tabs, as the user's picture: the businesses, the cited pages, the cited sites, the answers. */
const TABS = ["brands", "pages", "sites", "answers"] as const;

/**
 * The first statistics, numbers first: one sentence on where the business stands, three figures, every
 * business side by side, each assistant apart when two were asked, the conclusion, what the assistants say of the business by name, the questions without the client,
 * what on the website stands in the way, then the way on: the check saved as a project, and its dashboard.
 */
export function FirstRunResultView({ result, runId, onAgain, who }: { result: FirstRunResult; runId: string; onAgain: () => void; who: string | null }) {
  const t = useTranslations("FirstRun");
  const messages = useMessages();
  const locale = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  // Everything was confirmed before the check, so nothing is asked again: the check becomes the project
  const save = useMutation({
    mutationFn: () => api.createProject(projectFromFirstRun(result, runId)),
    onSuccess: async ({ project }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.replace(`/projects/${project.id}`);
    },
  });
  const saving = save.isPending || save.isSuccess;
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
  const [tab, setTab] = useState<(typeof TABS)[number]>("brands");
  // Every cited page, the most cited first
  const pages = result.topSources.flatMap((source) => source.pages).sort((a, b) => b.count - a.count).slice(0, 20);

  const figures = [
    { key: "named", value: you.named, of: total },
    { key: "recommended", value: you.recommended, of: total },
    { key: "place", value: you.named > 0 ? `#${place}` : "—", of: counts.length },
  ] as const;

  // The way on, in the bar that stays in view (the user, 18 Nov 2026: "buttons must be always visible"): what
  // the project opens with, then another website or the dashboard
  const footer = (
    <div className="flex flex-col gap-2">
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t(save.error instanceof ApiError && save.error.status === 409 ? "domainTaken" : "saveFailed")}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="hidden min-w-0 flex-col md:flex">
          <p className="text-sm font-semibold">{t("nextTitle")}</p>
          <p className="truncate text-sm text-muted-foreground">{t("nextText")}</p>
        </div>
        {/* On a phone one under the other, the way on first */}
        <div className="flex w-full shrink-0 flex-col-reverse gap-2 sm:flex-row md:w-auto">
          <Button variant="outline" size="lg" disabled={saving} onClick={onAgain} className="h-10 px-4 sm:h-11 sm:flex-1 md:flex-none">
            {t("again")}
          </Button>
          <Button size="lg" disabled={saving} onClick={() => save.mutate()} className="h-11 px-5 sm:flex-1 md:flex-none">
            {saving ? t("saving") : t("heroButton")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <FirstRunScreen who={who} wide footer={footer}>
      <section className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-4 pb-2 text-center sm:gap-5 sm:pt-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-background py-1.5 pr-2 pl-4 text-sm">
            {t("heroKicker", { count: result.engines.length })}
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              {result.engines.map((engine) => (
                <EngineIcon key={engine.engine} engine={engineOf(engine.engine)} />
              ))}
            </span>
          </p>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold tracking-[-0.04em] text-balance outline-none sm:text-5xl">
            {t("heroTitle")} <span className="text-brand">{result.brand.name}</span>
          </h1>
          <p className="text-pretty text-muted-foreground sm:text-lg">{t("heroText", { questions: result.prompts.length, answers: total })}</p>
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
          <div role="tablist" aria-label={t("tabsLabel")} className="grid grid-cols-2 border-b sm:grid-cols-4">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "border-b-2 px-3 py-3.5 text-[0.9375rem] transition-colors outline-none focus-visible:bg-muted",
                  tab === key ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tabs.${key}`)}
              </button>
            ))}
          </div>
          {tab === "brands" && (
            <>

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
            </>
          )}
          {tab === "pages" && (
            <ul className="divide-y">
              {pages.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">{t("tabsEmpty")}</li>}
              {pages.map((page) => (
                <li key={page.url} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{page.title || shortUrl(page.url)}</span>
                    <a href={page.url} target="_blank" rel="noreferrer nofollow" className="truncate text-xs text-muted-foreground hover:underline">
                      {shortUrl(page.url)}
                    </a>
                  </span>
                  <span className="shrink-0 tabular-nums">{t("citedIn", { count: page.count })}</span>
                </li>
              ))}
            </ul>
          )}
          {tab === "sites" && (
            <ul className="divide-y">
              {result.topSources.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">{t("tabsEmpty")}</li>}
              {result.topSources.map((source) => (
                <li key={source.domain} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{source.domain}</span>
                    <span className={cn("text-xs", source.brandListed ? "text-positive" : "text-muted-foreground")}>{t(source.type === "own" ? "siteOwn" : source.type === "competitor" ? "siteRival" : source.brandListed ? "siteListed" : "siteMissing")}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{t("citedIn", { count: source.count })}</span>
                </li>
              ))}
            </ul>
          )}
          {tab === "answers" && (
            <ul className="divide-y">
              {result.prompts.flatMap((item) =>
                item.answers.map((answer) => (
                  <li key={`${item.prompt.id}-${answer.engine}-${answer.sample}`} className="flex flex-col gap-1.5 px-4 py-3.5 sm:px-5">
                    <p className="flex items-start justify-between gap-3 text-sm font-medium text-pretty">
                      {item.prompt.text}
                      <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">{result.engines.find((engine) => engine.engine === answer.engine)?.name ?? answer.engine}</span>
                    </p>
                    {/* The beginning as plain words: the answers come with Markdown's marks */}
                    <p className="line-clamp-3 text-sm text-pretty text-muted-foreground">{answer.text.slice(0, 600).replace(/[*#|`]+|-{2,}/g, " ").replace(/\s+/g, " ")}</p>
                    <p className={cn("text-xs font-medium", answer.mentions.some((mention) => mention.brandId === result.brand.id) ? "text-positive" : "text-muted-foreground")}>
                      {t(answer.mentions.some((mention) => mention.brandId === result.brand.id) ? "answerNamed" : "answerNotNamed")}
                    </p>
                  </li>
                )),
              )}
            </ul>
          )}
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

        {result.brandView && result.brandView.length > 0 && <BrandViewCard views={result.brandView} brand={result.brand.name} />}

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
      </section>
    </FirstRunScreen>
  );
}
