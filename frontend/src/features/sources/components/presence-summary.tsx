import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useLocale, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Link } from "@/i18n/navigation";
import { shortUrl, siteHref } from "@/shared/helpers/domain";
import { formatPercent } from "@/shared/helpers/numbers";
import type { Action, Source } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { type PagePresence, type PresenceRow, type SitePresence } from "../helpers/presence";
import { BrandChips, Initial, TypePill } from "./parts";

export const PRESENCE_COLORS: Record<SitePresence | PagePresence, string> = {
  own: "var(--you)",
  listed: "var(--positive)",
  missing: "var(--negative)",
  competitor: "var(--rival-strong)",
  you: "var(--positive)",
  rivals: "var(--negative)",
  nobody: "var(--rival-strong)",
  unknown: "var(--border)",
};

/** The sites (or pages) to start with: the most cited of those that leave the client out. */
const FIRST = 3;

interface Target {
  key: string;
  label: string;
  /** Under the label: the page's address, for a page */
  sub?: string;
  type: Source["type"];
  count: number;
  named: SeriesBrand[];
  href: string;
  /** The listing action that gets the client onto the site, when the plan has one */
  action: Action | null;
}

/**
 * What Manbalar opens with (the user, 17 Nov 2026: "sourcing … must be more understandable"; until then the
 * page opened on a chart of five lines and kept "are you there?" in a card at the bottom). One sentence on how
 * much of what AI cites leaves the client out, the citations as one bar split by whom they work for, and the
 * three sites (or pages) to start with, each with whom it names and the way onto it.
 */
export function PresenceSummary({
  scope,
  rows,
  sources,
  brands,
  answers,
  actions,
  sitePattern,
  actionsHref,
}: {
  scope: "sites" | "pages";
  rows: PresenceRow<SitePresence | PagePresence>[];
  sources: Source[];
  brands: SeriesBrand[];
  /** Answers in the check, for "cited in 3 of 10 answers" */
  answers: number;
  actions: Action[];
  sitePattern: string;
  actionsHref: string;
}) {
  const t = useTranslations("SourcesPage.summary");
  const groups = useTranslations("SourcesPage.presence.groups");
  const about = useTranslations("SourcesPage.presence.about");
  const locale = useLocale();
  const you = brands.find((brand) => brand.isYou);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const against = scope === "sites" ? "missing" : "rivals";
  const share = rows.find((row) => row.key === against)?.share ?? 0;
  const named = (ids: string[] | null) => brands.filter((brand) => ids?.includes(brand.id));
  const listing = (domain: string) =>
    actions.find((action) => action.kind === "listing" && action.domain === domain && (action.status === "new" || action.status === "in_progress")) ?? null;

  const targets: Target[] =
    scope === "sites"
      ? sources
          .filter((source) => source.type !== "own" && source.type !== "competitor" && !source.brandListed)
          .slice(0, FIRST)
          .map((source) => ({
            key: source.domain,
            label: source.domain,
            type: source.type,
            count: source.count,
            named: named([...new Set(source.pages.flatMap((page) => page.mentions ?? []))]),
            href: siteHref(sitePattern, source.domain),
            action: listing(source.domain),
          }))
      : sources
          .flatMap((source) =>
            source.pages
              .filter((page) => page.mentions !== null && page.mentions.length > 0 && !(you && page.mentions.includes(you.id)))
              .map((page) => ({
                key: page.url,
                label: page.title ?? shortUrl(page.url),
                sub: shortUrl(page.url),
                type: source.type,
                count: page.count,
                named: named(page.mentions),
                href: siteHref(sitePattern, source.domain, { tab: "answers", page: page.url }),
                action: null,
              })),
          )
          .sort((a, b) => b.count - a.count)
          .slice(0, FIRST);

  return (
    <div className="@container overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            {share > 0 ? t(`headline.${scope}`, { percent: formatPercent(share, locale) }) : t(`headlineNone.${scope}`)}
          </p>
          <p className="text-sm text-pretty text-muted-foreground">
            {t(`text.${scope}`, { sources: scope === "sites" ? sources.length : sources.reduce((sum, source) => sum + source.pages.length, 0), answers, citations: total })}
          </p>
        </div>

        {/* Every citation of the check as one bar, split by whom it works for */}
        <div className="flex flex-col gap-2.5">
          <div role="img" aria-label={rows.map((row) => `${groups(row.key)}: ${formatPercent(row.share, locale)}`).join(", ")} className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {rows.map((row) => (
              <span key={row.key} className="h-full min-w-1" style={{ width: `${row.share * 100}%`, background: PRESENCE_COLORS[row.key] }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {rows.map((row) => (
              <li key={row.key}>
                <Hint text={about(row.key)} focusable={false} className="items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: PRESENCE_COLORS[row.key] }} />
                  <span className={row.key === against ? "font-semibold" : undefined}>{groups(row.key)}</span>
                  <span className="text-muted-foreground tabular-nums">{formatPercent(row.share, locale)}</span>
                </Hint>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {targets.length > 0 && (
        <div className="border-t bg-muted/30">
          <p className="px-4 pt-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:px-5">{t(`first.${scope}`)}</p>
          <ol className="grid gap-2 p-3 sm:p-4 @3xl:grid-cols-3">
            {targets.map((target) => (
              <li key={target.key} className="flex min-w-0 flex-col gap-2.5 rounded-lg border bg-card p-3">
                <Link href={target.href} className="group flex min-w-0 items-start gap-2.5">
                  <Initial text={scope === "sites" ? target.label : (target.sub ?? target.label)} className="mt-0.5" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium underline-offset-4 group-hover:underline">{target.label}</span>
                    {target.sub && <span className="truncate text-xs text-muted-foreground">{target.sub}</span>}
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  <TypePill type={target.type} />
                  <span className="tabular-nums">{t("citedIn", { count: target.count, total: answers })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("names")}</span>
                  <BrandChips brands={target.named} />
                </div>
                <Link
                  href={target.action ? { pathname: actionsHref, query: { action: target.action.id } } : target.href}
                  className="mt-auto inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
                >
                  {t(target.action ? "getListed" : scope === "sites" ? "openSite" : "openAnswers")}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
