"use client";

import { MapPinCheck, Search, Shapes, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { Link } from "@/i18n/navigation";
import { siteHref } from "@/shared/helpers/domain";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Source, SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { SOURCE_TYPES } from "../constants";
import { outreachPages } from "../helpers/outreach";
import { PageCell } from "./page-cell";
import { BrandChips, Heading, Initial, Mark, Table, TypePill } from "./parts";

type Tab = "sites" | "pages" | "gaps";
type TypeFilter = SourceType | "";
/** Sites tab: every site, those the client is on, or those it could get onto. */
type Presence = "" | "listed" | "missing";
const PRESENCE: Presence[] = ["", "listed", "missing"];

const TABS: Tab[] = ["sites", "pages", "gaps"];

/** The client's own website, or a competitor's: "listed?" and "who it names" go without saying there. */
const isBrandSite = (source: Source) => source.type === "own" || source.type === "competitor";

/**
 * The sources ChatGPT cites, laid out like Peec's domains, pages and gap analysis: one card with three
 * tabs. Sites: kind, share of answers, citations per answer and whether the client is listed; a click
 * anywhere on a row opens the site's own page. Pages: the exact pages (title over address) and whether
 * each names the client; a row opens its site's page on the answers that cite that page. Gaps: the pages
 * that name competitors and not the client, someone to write to or a listing to beat. Search, a kind
 * filter and a CSV per tab; the sites also filter by whether the client is on them, the gaps by the
 * competitor named. Headings and marks explain themselves on hover.
 */
export function SourcesTabs({
  sources,
  totalAnswers,
  youId,
  brands,
  filename,
  initialTab = "sites",
  initialType = "",
  sitePattern,
}: {
  sources: Source[];
  totalAnswers: number;
  youId: string;
  brands: SeriesBrand[];
  filename: string;
  initialTab?: Tab;
  /** A kind of site to start with: the own-site card links to "pages of your own site". */
  initialType?: TypeFilter;
  /** The address of a cited site's page, with SITE_SLOT where its domain goes. */
  sitePattern: string;
}) {
  const t = useTranslations("SourcesPage");
  const types = useTranslations("SourcesPage.types");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>(initialType);
  const [presence, setPresence] = useState<Presence>("");
  const [rival, setRival] = useState("");
  const share = (count: number) => formatPercent(totalAnswers ? count / totalAnswers : 0, locale);
  const matches = (text: string, kind: SourceType) => (!type || kind === type) && text.toLowerCase().includes(query.trim().toLowerCase());
  const matchesPage = (page: { url: string; title: string | null }, kind: SourceType) => matches(`${page.url} ${page.title ?? ""}`, kind);
  /** The site's page, opened on the answers that cite one of its pages. */
  const pageAnswersHref = (domain: string, url: string) => siteHref(sitePattern, domain, { tab: "answers", page: url });

  const pages = sources
    .flatMap((source) => source.pages.map((page) => ({ source, page })))
    .sort((a, b) => b.page.count - a.page.count);
  const gaps = outreachPages(sources, youId, brands);
  const counts: Record<Tab, number> = { sites: sources.length, pages: pages.length, gaps: gaps.length };
  // "Listed" and "not listed" only make sense for sites the client could be on: not its own, not a competitor's
  const onSite = (source: Source, wanted: Presence) => !wanted || (!isBrandSite(source) && source.brandListed === (wanted === "listed"));
  const matchingSites = sources.filter((source) => matches(source.domain, source.type));
  const visibleSites = matchingSites.filter((source) => onSite(source, presence));
  const visiblePages = pages.filter(({ source, page }) => matchesPage(page, source.type));
  const matchingGaps = gaps.filter(({ source, page }) => matchesPage(page, source.type));
  const visibleGaps = matchingGaps.filter(({ named }) => !rival || named.some((brand) => brand.id === rival));
  const rivals = brands.filter((brand) => !brand.isYou);
  function open(next: Tab) {
    setTab(next);
    setType("");
    setPresence("");
    setRival("");
  }
  const kinds = (tab === "sites" ? sources.map((s) => s.type) : (tab === "pages" ? pages : gaps).map(({ source }) => source.type));
  const namedOn = (mentions: string[] | null) => brands.filter((brand) => mentions?.includes(brand.id));

  const csv: Record<Tab, () => (string | number | null)[][]> = {
    sites: () => [
      [t("csvHeaders.site"), t("csvHeaders.type"), t("csvHeaders.share"), t("csvHeaders.answers"), t("csvHeaders.citations"), t("csvHeaders.listed")],
      ...visibleSites.map((source) => [
        source.domain,
        types(source.type),
        totalAnswers ? Math.round((source.count / totalAnswers) * 100) : 0,
        source.count,
        source.count ? Math.round((source.pages.reduce((sum, page) => sum + page.count, 0) / source.count) * 10) / 10 : null,
        isBrandSite(source) ? null : source.brandListed ? t("isListed") : t("notListed"),
      ]),
    ],
    pages: () => [
      [t("csvHeaders.page"), t("csvHeaders.title"), t("csvHeaders.site"), t("csvHeaders.type"), t("csvHeaders.share"), t("csvHeaders.answers"), t("csvHeaders.you")],
      ...visiblePages.map(({ source, page }) => [
        page.url,
        page.title,
        source.domain,
        types(source.type),
        totalAnswers ? Math.round((page.count / totalAnswers) * 100) : 0,
        page.count,
        page.mentions === null ? t("pageUnknown") : page.mentions.includes(youId) ? t("pageYou") : t("pageNotYou"),
      ]),
    ],
    gaps: () => [
      [t("csvHeaders.page"), t("csvHeaders.title"), t("csvHeaders.site"), t("csvHeaders.type"), t("csvHeaders.share"), t("csvHeaders.answers"), t("csvHeaders.named")],
      ...visibleGaps.map(({ source, page, named }) => [
        page.url,
        page.title,
        source.domain,
        types(source.type),
        totalAnswers ? Math.round((page.count / totalAnswers) * 100) : 0,
        page.count,
        named.map((brand) => brand.name).join(", "),
      ]),
    ],
  };

  return (
    <section id="sources" aria-label={t("tabsLabel")} className="@container scroll-mt-20 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div role="group" aria-label={t("tabsLabel")} className="flex gap-5 overflow-x-auto border-b px-4">
        {TABS.map((option) => (
          <Hint key={option} text={t(`hints.tabs.${option}`)} side="bottom" className="shrink-0">
            {(describedBy) => (
              <button
                type="button"
                aria-pressed={tab === option}
                aria-describedby={describedBy}
                onClick={() => open(option)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 py-3.5 text-sm transition-colors",
                  tab === option ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tabs.${option}`)}
                <span className="text-xs tabular-nums opacity-70">{counts[option]}</span>
              </button>
            )}
          </Hint>
        ))}
      </div>

      {tab === "gaps" && <p className="border-b px-4 py-3 text-sm text-pretty text-muted-foreground">{t("gapsIntro")}</p>}

      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="sources-search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="sources-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="h-8 w-full rounded-lg border bg-background pr-2 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <FilterMenu
          icon={Shapes}
          label={t("typeLabel")}
          value={type}
          options={[
            { value: "" as TypeFilter, label: t("allTypes"), count: kinds.length },
            ...SOURCE_TYPES.filter((kind) => kinds.includes(kind)).map((kind) => ({
              value: kind as TypeFilter,
              label: types(kind),
              count: kinds.filter((item) => item === kind).length,
            })),
          ]}
          onChange={setType}
        />
        {tab === "sites" && (
          <FilterMenu
            icon={MapPinCheck}
            label={t("presence.label")}
            value={presence}
            options={PRESENCE.map((option) => ({
              value: option,
              label: t(`presence.${option || "all"}`),
              count: matchingSites.filter((source) => onSite(source, option)).length,
            }))}
            onChange={setPresence}
          />
        )}
        {tab === "gaps" && rivals.length > 0 && (
          <FilterMenu
            icon={Users}
            label={t("brandFilter.label")}
            value={rival}
            options={[
              { value: "", label: t("brandFilter.all"), count: matchingGaps.length },
              ...rivals.map((brand) => ({
                value: brand.id,
                label: brand.name,
                count: matchingGaps.filter(({ named }) => named.some((item) => item.id === brand.id)).length,
              })),
            ]}
            onChange={setRival}
          />
        )}
        <CsvButton
          filename={`${filename}-${tab}`}
          label={t("csv")}
          hint={t("csvHint")}
          rows={csv[tab]}
          className="ml-auto"
        />
      </div>

      {tab === "sites" && (
        <Table
          empty={visibleSites.length === 0 ? t("emptyFiltered") : null}
          head={
            <>
              <th scope="col" className="w-10 pl-4">
                <Hint text={t("hints.rank")}>
                  <span aria-hidden>#</span>
                  <span className="sr-only">{t("columns.rank")}</span>
                </Hint>
              </th>
              <Heading label={t("columns.site")} hint={t("hints.site")} className="px-2" />
              <Heading label={t("columns.type")} hint={t("hints.type")} className="hidden w-44 px-3 @xl:table-cell" />
              <Heading label={t("columns.named")} hint={t("hints.named")} className="hidden w-44 px-3 @4xl:table-cell" />
              <Heading label={t("columns.used")} hint={t("hints.used")} className="w-24 px-3" />
              <Heading label={t("columns.citations")} hint={t("hints.citations")} className="hidden w-24 px-3 @2xl:table-cell" />
              <Heading label={t("columns.listed")} hint={t("hints.listed")} className="hidden w-28 pr-4 pl-3 @lg:table-cell" />
            </>
          }
        >
          {visibleSites.map((source, index) => {
            const named = namedOn([...new Set(source.pages.flatMap((page) => page.mentions ?? []))]);
            return (
              <LinkRow key={source.domain} href={siteHref(sitePattern, source.domain)} className="transition-colors hover:bg-muted/40">
                <td className="py-2.5 pl-4 text-muted-foreground tabular-nums">{index + 1}</td>
                <th scope="row" className="px-2 py-2.5 text-left font-medium">
                  <span className="flex min-w-0 items-center gap-2">
                    <Initial text={source.domain} />
                    {/* The row opens the same page; the link is the way in for the keyboard */}
                    <Link href={siteHref(sitePattern, source.domain)} className="truncate underline-offset-4 outline-none hover:underline focus-visible:underline">
                      {source.domain}
                    </Link>
                  </span>
                  {/* Narrow card: the kind and "are you listed?" move under the site's name, where their columns are hidden */}
                  <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-normal @xl:hidden">
                    <TypePill type={source.type} />
                    {!isBrandSite(source) && (
                      <span className="@lg:hidden">
                        <Mark value={source.brandListed} yes={t("isListed")} no={t("notListed")} />
                      </span>
                    )}
                  </span>
                </th>
                <td className="hidden px-3 py-2.5 @xl:table-cell">
                  <TypePill type={source.type} />
                </td>
                <td className="hidden px-3 py-2.5 @4xl:table-cell">
                  <BrandChips brands={isBrandSite(source) ? [] : named} />
                </td>
                <td className="px-3 py-2.5 font-medium tabular-nums">{share(source.count)}</td>
                <td className="hidden px-3 py-2.5 tabular-nums @2xl:table-cell">
                  {source.count ? formatDecimal(source.pages.reduce((sum, page) => sum + page.count, 0) / source.count, locale) : "—"}
                </td>
                <td className="hidden py-2.5 pr-4 pl-3 @lg:table-cell">
                  {isBrandSite(source) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Mark value={source.brandListed} yes={t("isListed")} no={t("notListed")} />
                  )}
                </td>
              </LinkRow>
            );
          })}
        </Table>
      )}

      {tab === "pages" && (
        <Table
          empty={visiblePages.length === 0 ? t("emptyFiltered") : null}
          head={
            <>
              <Heading label={t("columns.page")} hint={t("hints.page")} className="pl-4" />
              <Heading label={t("columns.type")} hint={t("hints.type")} className="hidden w-44 px-3 @xl:table-cell" />
              <Heading label={t("columns.named")} hint={t("hints.named")} className="hidden w-44 px-3 @3xl:table-cell" />
              <Heading label={t("columns.used")} hint={t("hints.used")} className="w-24 px-3" />
              <Heading label={t("columns.you")} hint={t("hints.you")} className="hidden w-28 pr-4 pl-3 @lg:table-cell" />
            </>
          }
        >
          {visiblePages.map(({ source, page }) => (
            <LinkRow key={page.url} href={pageAnswersHref(source.domain, page.url)} className="transition-colors hover:bg-muted/40">
              <th scope="row" className="py-2.5 pl-4 text-left font-medium">
                <PageCell page={page} domain={source.domain} href={pageAnswersHref(source.domain, page.url)} />
              </th>
              <td className="hidden px-3 py-2.5 @xl:table-cell">
                <TypePill type={source.type} />
              </td>
              <td className="hidden px-3 py-2.5 @3xl:table-cell">
                <BrandChips brands={isBrandSite(source) ? [] : namedOn(page.mentions)} />
              </td>
              <td className="px-3 py-2.5 font-medium tabular-nums">{share(page.count)}</td>
              <td className="hidden py-2.5 pr-4 pl-3 @lg:table-cell">
                {source.type === "competitor" ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <Mark value={page.mentions === null ? null : page.mentions.includes(youId)} yes={t("pageYou")} no={t("pageNotYou")} unknown={t("pageUnknown")} />
                )}
              </td>
            </LinkRow>
          ))}
        </Table>
      )}

      {tab === "gaps" && (
        <Table
          empty={gaps.length === 0 ? t("outreachEmpty") : visibleGaps.length === 0 ? t("emptyFiltered") : null}
          head={
            <>
              <Heading label={t("columns.page")} hint={t("hints.page")} className="pl-4" />
              <Heading label={t("columns.type")} hint={t("hints.type")} className="hidden w-44 px-3 @xl:table-cell" />
              <Heading label={t("columns.competitors")} hint={t("hints.competitors")} className="hidden w-56 px-3 @2xl:table-cell" />
              <Heading label={t("columns.used")} hint={t("hints.used")} className="w-24 pr-4 pl-3" />
            </>
          }
        >
          {visibleGaps.map(({ source, page, named, profile }) => (
            <LinkRow key={page.url} href={pageAnswersHref(source.domain, page.url)} className="transition-colors hover:bg-muted/40">
              <th scope="row" className="py-2.5 pl-4 text-left font-medium">
                <PageCell page={page} domain={source.domain} href={pageAnswersHref(source.domain, page.url)} />
                {profile && (
                  <Hint text={t("hints.profile")} focusable={false} className="mt-1 ml-8 rounded-md border px-1.5 py-px text-xs font-normal text-muted-foreground">
                    {t("outreachProfile")}
                  </Hint>
                )}
              </th>
              <td className="hidden px-3 py-2.5 @xl:table-cell">
                <TypePill type={source.type} />
              </td>
              <td className="hidden px-3 py-2.5 @2xl:table-cell">
                {named.length > 0 ? (
                  <ul className="flex flex-wrap gap-1">
                    {named.map((brand) => (
                      <li key={brand.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs">
                        <span aria-hidden className="size-2 rounded-full" style={{ background: brand.color }} />
                        {brand.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("outreachNobody")}</span>
                )}
              </td>
              <td className="py-2.5 pr-4 pl-3 font-medium tabular-nums">{share(page.count)}</td>
            </LinkRow>
          ))}
        </Table>
      )}
    </section>
  );
}
