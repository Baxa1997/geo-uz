"use client";

import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CircleNotchIcon as LoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { shortUrl } from "@/shared/helpers/domain";
import { cn } from "@/shared/helpers/utils";
import type { FirstRun, FirstRunPartial } from "@/shared/types/api";

const TABS = ["brands", "pages", "sites", "answers"] as const;

/**
 * A check still running, once its first answers are in (the user's picture, 16 Nov 2026: "still
 * collecting · 2/30 answers"): the headline of the statistics, how many answers have come, and the same
 * four tabs filling in. Counted from the answers' own words; the finished check takes this page's place
 * with everything read and counted for good.
 */
export function FirstRunLive({ run, partial }: { run: FirstRun; partial: FirstRunPartial }) {
  const t = useTranslations("FirstRun");
  const [tab, setTab] = useState<(typeof TABS)[number]>("brands");
  const answered = partial.answered;
  const brands = [...partial.brands].sort((a, b) => b.named - a.named || Number(b.isYou) - Number(a.isYou));
  const reading = run.status === "reading_answers";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-5 pt-4 pb-2 text-center sm:pt-8">
        <h1 className="text-4xl font-bold tracking-[-0.04em] text-balance sm:text-6xl">
          {t("heroTitle")} <span className="text-brand">{partial.brand}</span>
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">{t("live.text")}</p>
        <Button size="lg" disabled className="h-12 px-6 text-base">
          {t("heroButton")}
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Button>
        <div className="flex flex-col gap-1">
          <p aria-live="polite" className="flex items-center justify-center gap-2 font-medium text-brand">
            <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            {reading ? t("live.reading") : t("live.collecting", { answered, total: partial.total })}
          </p>
          <p className="text-sm text-muted-foreground">{t("live.note")}</p>
        </div>
      </div>

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-normal sm:px-5">{t("columns.brand")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal whitespace-nowrap sm:px-5">{t("columns.named")}</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((row, index) => (
                <tr key={row.name} className={cn("border-b last:border-b-0", row.isYou && "bg-brand-soft/60")}>
                  <th scope="row" className="px-4 py-3 text-left font-medium sm:px-5">
                    <span className="mr-2.5 inline-block w-4 text-muted-foreground tabular-nums">{index + 1}</span>
                    {row.name}
                    {row.isYou && <span className="ml-1.5 font-normal text-muted-foreground">({t("you")})</span>}
                  </th>
                  <td className="px-4 py-3 sm:px-5">
                    <span className="flex items-center justify-end gap-2.5">
                      <span aria-hidden className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:block">
                        <span className={cn("block h-full rounded-full transition-[width] duration-500", row.isYou ? "bg-brand" : "bg-rival-strong")} style={{ width: `${answered ? (row.named / answered) * 100 : 0}%` }} />
                      </span>
                      <span className="w-14 text-right font-semibold tabular-nums">{t("ofTotal", { count: row.named, total: answered })}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "pages" && (
          <ul className="divide-y">
            {partial.pages.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">{t("live.empty")}</li>}
            {partial.pages.map((page) => (
              <li key={page.url} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{page.title || shortUrl(page.url)}</span>
                  <span className="truncate text-xs text-muted-foreground">{shortUrl(page.url)}</span>
                </span>
                <span className="shrink-0 tabular-nums">{t("citedIn", { count: page.count })}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "sites" && (
          <ul className="divide-y">
            {partial.sites.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">{t("live.empty")}</li>}
            {partial.sites.map((site) => (
              <li key={site.domain} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                <span className="truncate font-medium">{site.domain}</span>
                <span className="shrink-0 tabular-nums">{t("citedIn", { count: site.count })}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "answers" && (
          <ul className="divide-y">
            {partial.answers.map((answer, index) => (
              <li key={`${answer.engine}-${answer.question}-${index}`} className="flex flex-col gap-1.5 px-4 py-3.5 sm:px-5">
                <p className="flex items-start justify-between gap-3 text-sm font-medium text-pretty">
                  {answer.question}
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">{answer.name}</span>
                </p>
                <p className="line-clamp-3 text-sm text-pretty text-muted-foreground">{answer.text.replace(/[*#|`]+|-{2,}/g, " ").replace(/\s+/g, " ")}</p>
                <p className={cn("text-xs font-medium", answer.named ? "text-positive" : "text-muted-foreground")}>{t(answer.named ? "answerNamed" : "answerNotNamed")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
