"use client";

import { ArrowRight, CircleCheck, CircleHelp, CircleX, Search, Shapes } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Source, SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { SOURCE_TYPES } from "../constants";
import { outreachPages, shortUrl } from "../helpers/outreach";

type Tab = "sites" | "pages" | "gaps";
type TypeFilter = SourceType | "";

const TABS: Tab[] = ["sites", "pages", "gaps"];

/** The client's own website, or a competitor's: "listed?" and "who it names" go without saying there. */
const isBrandSite = (source: Source) => source.type === "own" || source.type === "competitor";

/**
 * The sources ChatGPT cites, laid out like Peec's domains, pages and gap analysis: one card with three
 * tabs. Sites: kind, share of answers, citations per answer, whether the client is listed. Pages: the
 * exact pages and whether each names the client. Gaps: the pages that name competitors and not the
 * client, someone to write to or a listing to beat. Search, a kind filter and a CSV per tab.
 */
export function SourcesTabs({
  sources,
  totalAnswers,
  youId,
  brands,
  filename,
  initialTab = "sites",
}: {
  sources: Source[];
  totalAnswers: number;
  youId: string;
  brands: SeriesBrand[];
  filename: string;
  initialTab?: Tab;
}) {
  const t = useTranslations("SourcesPage");
  const types = useTranslations("SourcesPage.types");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("");
  const share = (count: number) => formatPercent(totalAnswers ? count / totalAnswers : 0, locale);
  const matches = (text: string, kind: SourceType) => (!type || kind === type) && text.toLowerCase().includes(query.trim().toLowerCase());

  const pages = sources
    .flatMap((source) => source.pages.map((page) => ({ source, page })))
    .sort((a, b) => b.page.count - a.page.count);
  const gaps = outreachPages(sources, youId, brands);
  const counts: Record<Tab, number> = { sites: sources.length, pages: pages.length, gaps: gaps.length };
  const visibleSites = sources.filter((source) => matches(source.domain, source.type));
  const visiblePages = pages.filter(({ source, page }) => matches(page.url, source.type));
  const visibleGaps = gaps.filter(({ source, page }) => matches(page.url, source.type));
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
      [t("csvHeaders.page"), t("csvHeaders.site"), t("csvHeaders.type"), t("csvHeaders.share"), t("csvHeaders.answers"), t("csvHeaders.you")],
      ...visiblePages.map(({ source, page }) => [
        page.url,
        source.domain,
        types(source.type),
        totalAnswers ? Math.round((page.count / totalAnswers) * 100) : 0,
        page.count,
        page.mentions === null ? t("pageUnknown") : page.mentions.includes(youId) ? t("pageYou") : t("pageNotYou"),
      ]),
    ],
    gaps: () => [
      [t("csvHeaders.page"), t("csvHeaders.site"), t("csvHeaders.type"), t("csvHeaders.share"), t("csvHeaders.answers"), t("csvHeaders.named")],
      ...visibleGaps.map(({ source, page, named }) => [
        page.url,
        source.domain,
        types(source.type),
        totalAnswers ? Math.round((page.count / totalAnswers) * 100) : 0,
        page.count,
        named.map((brand) => brand.name).join(", "),
      ]),
    ],
  };

  return (
    <section aria-label={t("tabsLabel")} className="@container overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div role="group" aria-label={t("tabsLabel")} className="flex gap-5 overflow-x-auto border-b px-4">
        {TABS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={tab === option}
            onClick={() => {
              setTab(option);
              setType("");
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 py-3.5 text-sm transition-colors",
              tab === option ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`tabs.${option}`)}
            <span className="text-xs tabular-nums opacity-70">{counts[option]}</span>
          </button>
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
                <span aria-hidden>#</span>
                <span className="sr-only">{t("columns.rank")}</span>
              </th>
              <th scope="col" className="px-2">
                {t("columns.site")}
              </th>
              <th scope="col" className="hidden w-44 px-3 @xl:table-cell">
                {t("columns.type")}
              </th>
              <th scope="col" className="hidden w-36 px-3 @4xl:table-cell">
                {t("columns.named")}
              </th>
              <th scope="col" title={t("usedHint")} className="w-24 px-3">
                {t("columns.used")}
              </th>
              <th scope="col" title={t("citationsHint")} className="hidden w-24 px-3 @2xl:table-cell">
                {t("columns.citations")}
              </th>
              <th scope="col" className="hidden w-28 px-3 @lg:table-cell">
                {t("columns.listed")}
              </th>
              <th scope="col" className="hidden w-28 pr-4 @3xl:table-cell">
                <span className="sr-only">{t("columns.pages")}</span>
              </th>
            </>
          }
        >
          {visibleSites.map((source, index) => {
            const named = namedOn([...new Set(source.pages.flatMap((page) => page.mentions ?? []))]);
            return (
              <tr key={source.domain} className="transition-colors hover:bg-muted/30">
                <td className="py-2.5 pl-4 text-muted-foreground tabular-nums">{index + 1}</td>
                <th scope="row" className="px-2 py-2.5 text-left font-medium">
                  <span className="flex min-w-0 items-center gap-2">
                    <Initial text={source.domain} />
                    <span className="truncate">{source.domain}</span>
                  </span>
                  <span className="mt-1 flex @xl:hidden">
                    <TypePill type={source.type} />
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
                <td className="hidden px-3 py-2.5 @lg:table-cell">
                  {isBrandSite(source) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Mark value={source.brandListed} yes={t("isListed")} no={t("notListed")} />
                  )}
                </td>
                <td className="hidden py-2.5 pr-4 @3xl:table-cell">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("pages");
                      setType("");
                      setQuery(source.domain);
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("pagesCount", { count: source.pages.length })}
                    <ArrowRight aria-hidden className="size-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {tab === "pages" && (
        <Table
          empty={visiblePages.length === 0 ? t("emptyFiltered") : null}
          head={
            <>
              <th scope="col" className="pl-4">
                {t("columns.page")}
              </th>
              <th scope="col" className="hidden w-44 px-3 @xl:table-cell">
                {t("columns.type")}
              </th>
              <th scope="col" className="hidden w-36 px-3 @3xl:table-cell">
                {t("columns.named")}
              </th>
              <th scope="col" title={t("usedHint")} className="w-24 px-3">
                {t("columns.used")}
              </th>
              <th scope="col" className="hidden w-28 pr-4 pl-3 @lg:table-cell">
                {t("columns.you")}
              </th>
            </>
          }
        >
          {visiblePages.map(({ source, page }) => (
            <tr key={page.url} className="transition-colors hover:bg-muted/30">
              <th scope="row" className="py-2.5 pl-4 text-left font-medium">
                <PageLink url={page.url} domain={source.domain} />
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
            </tr>
          ))}
        </Table>
      )}

      {tab === "gaps" && (
        <Table
          empty={gaps.length === 0 ? t("outreachEmpty") : visibleGaps.length === 0 ? t("emptyFiltered") : null}
          head={
            <>
              <th scope="col" className="pl-4">
                {t("columns.page")}
              </th>
              <th scope="col" className="hidden w-44 px-3 @xl:table-cell">
                {t("columns.type")}
              </th>
              <th scope="col" className="hidden w-56 px-3 @2xl:table-cell">
                {t("columns.competitors")}
              </th>
              <th scope="col" title={t("usedHint")} className="w-24 pr-4 pl-3">
                {t("columns.used")}
              </th>
            </>
          }
        >
          {visibleGaps.map(({ source, page, named, profile }) => (
            <tr key={page.url} className="transition-colors hover:bg-muted/30">
              <th scope="row" className="py-2.5 pl-4 text-left font-medium">
                <PageLink url={page.url} domain={source.domain} />
                {profile && (
                  <span className="mt-1 inline-flex rounded-md border px-1.5 py-px text-xs font-normal text-muted-foreground">
                    {t("outreachProfile")}
                  </span>
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
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}

function Table({ head, empty, children }: { head: React.ReactNode; empty: string | null; children: React.ReactNode }) {
  if (empty) return <p className="p-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">{head}</tr>
      </thead>
      <tbody className="divide-y">{children}</tbody>
    </table>
  );
}

function Initial({ text }: { text: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[0.7rem] font-semibold text-muted-foreground uppercase"
    >
      {text.charAt(0)}
    </span>
  );
}

/** A site's kind as a labelled pill with its color dot. */
function TypePill({ type }: { type: SourceType }) {
  const types = useTranslations("SourceTypes.short");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-normal whitespace-nowrap">
      <SourceTypeDot type={type} />
      {types(type)}
    </span>
  );
}

/** A cited page: its address without the protocol, and its site under it. */
function PageLink({ url, domain }: { url: string; domain: string }) {
  return (
    <span className="flex min-w-0 items-start gap-2">
      <Initial text={domain} />
      <span className="flex min-w-0 flex-col">
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" title={url} className="truncate underline-offset-4 hover:underline">
          {shortUrl(url)}
        </a>
        <span className="truncate text-xs font-normal text-muted-foreground">{domain}</span>
      </span>
    </span>
  );
}

/** Tracked brands as small chips with their color, or a dash. */
function BrandChips({ brands }: { brands: SeriesBrand[] }) {
  if (brands.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {brands.map((brand) => (
        <li
          key={brand.id}
          title={brand.name}
          className={cn(
            "flex h-6 items-center gap-1 rounded-md px-1.5 text-[0.7rem] font-semibold",
            brand.isYou ? "bg-you-soft/60 ring-1 ring-you/30" : "bg-muted",
          )}
        >
          <span aria-hidden className="size-2 rounded-full" style={{ background: brand.color }} />
          <span aria-hidden>{brand.name.charAt(0).toUpperCase()}</span>
          <span className="sr-only">{brand.name}</span>
        </li>
      ))}
    </ul>
  );
}

/** Yes, no or unknown, as icon and words. */
function Mark({ value, yes, no, unknown }: { value: boolean | null; yes: string; no: string; unknown?: string }) {
  const Icon = value === null ? CircleHelp : value ? CircleCheck : CircleX;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Icon aria-hidden className={cn("size-3.5", value === null ? "text-muted-foreground" : value ? "text-positive" : "text-negative")} />
      {value === null ? unknown : value ? yes : no}
    </span>
  );
}
