"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { InfoTip } from "@/shared/components/info-tip";
import { BarRows } from "@/shared/components/scores/bar-rows";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { pathOf, shortUrl, siteHref } from "@/shared/helpers/domain";
import { formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Movers } from "../helpers/history";
import { ChangeMark } from "./change-mark";
import { Initial } from "./parts";

type Group = "fresh" | "rising" | "falling";
const GROUPS: Group[] = ["fresh", "rising", "falling"];

/** The rows a tab shows; what is left is counted under them. */
const SHOWN = 6;

/**
 * What changed since the previous check, as Peec's "domain movers" and "URL movers": tabs for what ChatGPT
 * cited for the first time, used more and used less, each row a bar with the share of answers citing it
 * now and how far it moved. The first tab with something in it opens. A row opens the site's page (a
 * page's row: on the answers citing that page). Peec's "Top" is left out: the table under it is that list.
 * `naming` says how a row is named: a site by its domain, a page by its address, or by its path on a
 * site's own page. A first check has nothing to compare with and says so.
 */
export function MoversCard({
  movers,
  sitePattern,
  naming,
  className,
}: {
  movers: Movers | null;
  /** The address of a cited site's page, with SITE_SLOT where its domain goes. */
  sitePattern: string;
  naming: "site" | "page" | "path";
  className?: string;
}) {
  const t = useTranslations("SourcesPage.movers");
  const common = useTranslations("Common");
  const types = useTranslations("SourceTypes");
  const locale = useLocale();
  const [group, setGroup] = useState<Group>(() => GROUPS.find((candidate) => (movers?.[candidate].length ?? 0) > 0) ?? "rising");
  const list = movers?.[group] ?? [];
  const max = Math.max(1, ...list.map((mover) => mover.now));
  const scope = naming === "site" ? "sites" : "pages";

  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      <header className="flex min-h-12 items-center justify-between gap-3 border-b px-4">
        <div role="group" aria-label={t("label")} className="flex min-w-0 items-center gap-4 overflow-x-auto">
          {GROUPS.map((option) => (
            <Hint key={option} text={t(`tabHints.${scope}.${option}`)} side="bottom" className="shrink-0">
              {(describedBy) => (
                <button
                  type="button"
                  aria-pressed={group === option}
                  aria-describedby={describedBy}
                  disabled={!movers}
                  onClick={() => setGroup(option)}
                  className={cn(
                    "flex h-12 shrink-0 items-center gap-1 text-sm transition-colors outline-none focus-visible:underline",
                    group === option && movers ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`tabs.${option}`)}
                  {movers && <span className="text-xs tabular-nums opacity-60">{movers[option].length}</span>}
                </button>
              )}
            </Hint>
          ))}
          <InfoTip label={common("about")}>{t(`hint.${scope}`)}</InfoTip>
        </div>
        <Hint text={t("columnHint")} className="shrink-0 text-sm text-muted-foreground">
          {t("column")}
        </Hint>
      </header>

      {!movers || list.length === 0 ? (
        <p className="p-4 text-sm text-pretty text-muted-foreground">{t(movers ? `none.${group}` : "firstRun")}</p>
      ) : (
        <div className="flex flex-col gap-1.5 p-3">
          <BarRows
            rows={list.slice(0, SHOWN).map((mover) => ({
              key: mover.key,
              size: mover.now / max,
              value: formatPercent(mover.now / 100, locale),
              href: mover.url ? siteHref(sitePattern, mover.domain, { tab: "answers", page: mover.url }) : siteHref(sitePattern, mover.domain),
              label: (
                <>
                  <Initial text={mover.domain} className="size-5 bg-background text-[0.65rem] ring-1 ring-border" />
                  <span className="truncate">
                    {naming === "site" ? mover.domain : naming === "page" ? shortUrl(mover.url ?? mover.domain) : pathOf(mover.url ?? "") || mover.domain}
                  </span>
                  {naming !== "path" && <SourceTypeDot type={mover.type} label={types(mover.type)} />}
                </>
              ),
              mark:
                group === "fresh" ? (
                  <Hint text={t("newHint")} focusable={false} className="shrink-0 rounded-md bg-better/10 px-1.5 py-0.5 text-xs font-medium text-better">
                    {t("new")}
                  </Hint>
                ) : (
                  <ChangeMark now={mover.now} before={mover.before} className="w-9 justify-end" />
                ),
            }))}
          />
          {list.length > SHOWN && <p className="px-2.5 text-xs text-muted-foreground">{t("more", { count: list.length - SHOWN })}</p>}
        </div>
      )}
    </section>
  );
}
