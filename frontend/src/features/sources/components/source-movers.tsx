import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { BarRows } from "@/shared/components/scores/bar-rows";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { siteHref } from "@/shared/helpers/domain";
import { formatPercent } from "@/shared/helpers/numbers";
import type { Movers } from "../helpers/history";
import { ChangeMark } from "./change-mark";
import { Initial } from "./parts";

type Group = "rising" | "falling" | "fresh";
const GROUPS: Group[] = ["rising", "falling", "fresh"];

/** The rows a group shows; what is left is counted under it. */
const SHOWN = 4;

/**
 * What changed among the cited sites since the previous check, like Peec's "domain movers": the sites
 * ChatGPT relies on more, less, or for the first time, each with its share of answers now and how far it
 * moved. Peec keeps the three behind tabs; here they stand one under another, so nothing is a click away
 * (a group with nothing in it is left out). A row opens the site's own page. Peec's "Top" is left out: the
 * table of sites under this card is that list. A first check has nothing to compare with and says so.
 */
export function SourceMovers({ movers, sitePattern, className }: { movers: Movers | null; sitePattern: string; className?: string }) {
  const t = useTranslations("SourcesPage.movers");
  const types = useTranslations("SourceTypes");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const groups = GROUPS.flatMap((group) => (movers && movers[group].length > 0 ? [{ group, list: movers[group] }] : []));
  // One scale for the three groups: a bar is the site's share of answers now
  const max = Math.max(1, ...groups.flatMap(({ list }) => list.map((mover) => mover.now)));

  return (
    <Panel
      title={t("title")}
      hint={t("hint")}
      className={className}
      footer={movers && <p className="min-w-0 text-pretty">{t("compared", { date: formatLongDate(movers.comparedWith, locale, timeZone) })}</p>}
    >
      {groups.length === 0 ? (
        <p className="p-4 text-sm text-pretty text-muted-foreground">{t(movers ? "none" : "firstRun")}</p>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          {groups.map(({ group, list }) => (
            <section key={group} className="flex flex-col gap-1.5">
              <h3 className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                <Hint text={t(`tabHints.${group}`)}>{t(`tabs.${group}`)}</Hint>
                <span className="tabular-nums opacity-70">{list.length}</span>
              </h3>
              <BarRows
                rows={list.slice(0, SHOWN).map((mover) => ({
                  key: mover.domain,
                  size: mover.now / max,
                  value: formatPercent(mover.now / 100, locale),
                  href: siteHref(sitePattern, mover.domain),
                  label: (
                    <>
                      <Initial text={mover.domain} className="size-5 bg-background text-[0.65rem] ring-1 ring-border" />
                      <span className="truncate font-medium">{mover.domain}</span>
                      <SourceTypeDot type={mover.type} label={types(mover.type)} />
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
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
