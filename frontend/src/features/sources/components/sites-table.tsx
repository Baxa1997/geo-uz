"use client";

import { Shapes, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { PageSection } from "@/shared/components/page-section";
import { Link } from "@/i18n/navigation";
import { siteHref } from "@/shared/helpers/domain";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import type { Source, SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { SOURCE_TYPES } from "../constants";
import { GapSwitch } from "./gap-switch";
import { BrandChips, Heading, Initial, Mark, SearchBox, Table, TableCard, TypePill } from "./parts";

type TypeFilter = SourceType | "";

/** The client's own website, or a competitor's: "listed?" and "who it names" go without saying there. */
const isBrandSite = (source: Source) => source.type === "own" || source.type === "competitor";

/**
 * Every site ChatGPT cites, as Peec's Domains table: the section's heading with the gap switch, then the
 * card with search, a kind filter and the CSV, the table, and its count. A row: the site, its kind, the
 * tracked brands its cited pages name, the share of answers citing it, citations per answer, whether the
 * client is listed there; a click anywhere on it opens the site's own page. The switch keeps the sites
 * the client could get onto where a competitor is named and the client isn't (Peec's "gap analysis", at
 * least one competitor), and then filters by the competitor named. Headings and marks explain themselves
 * on hover.
 */
export function SitesTable({
  sources,
  totalAnswers,
  brands,
  filename,
  initialType = "",
  sitePattern,
}: {
  sources: Source[];
  totalAnswers: number;
  brands: SeriesBrand[];
  filename: string;
  /** A kind of site to start with (`?type=`). */
  initialType?: TypeFilter;
  /** The address of a cited site's page, with SITE_SLOT where its domain goes. */
  sitePattern: string;
}) {
  const t = useTranslations("SourcesPage");
  const types = useTranslations("SourcesPage.types");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>(initialType);
  const [gaps, setGaps] = useState(false);
  const [rival, setRival] = useState("");
  const share = (count: number) => formatPercent(totalAnswers ? count / totalAnswers : 0, locale);
  const rivals = brands.filter((brand) => !brand.isYou);
  const namedOn = (source: Source) => brands.filter((brand) => source.pages.some((page) => page.mentions?.includes(brand.id)));
  const isGap = (source: Source) => !isBrandSite(source) && !source.brandListed && namedOn(source).some((brand) => !brand.isYou);

  const matching = sources.filter((source) => source.domain.includes(query.trim().toLowerCase()) && (!gaps || isGap(source)));
  const ofKind = matching.filter((source) => !type || source.type === type);
  const visible = ofKind.filter((source) => !gaps || !rival || namedOn(source).some((brand) => brand.id === rival));
  const kinds = matching.map((source) => source.type);

  const csv = () => [
    [t("csvHeaders.site"), t("csvHeaders.type"), t("csvHeaders.share"), t("csvHeaders.answers"), t("csvHeaders.citations"), t("csvHeaders.listed")],
    ...visible.map((source) => [
      source.domain,
      types(source.type),
      totalAnswers ? Math.round((source.count / totalAnswers) * 100) : 0,
      source.count,
      source.count ? Math.round((source.pages.reduce((sum, page) => sum + page.count, 0) / source.count) * 10) / 10 : null,
      isBrandSite(source) ? null : source.brandListed ? t("isListed") : t("notListed"),
    ]),
  ];

  return (
    <PageSection
      title={t("sections.sites.title")}
      description={t("sections.sites.description")}
      actions={
        <span data-tour="gaps" className="flex">
          <GapSwitch
            on={gaps}
            onChange={(on) => {
              setGaps(on);
              setRival("");
            }}
            label={t("gaps.label")}
            hint={t("gaps.hint.sites")}
          />
        </span>
      }
    >
      <TableCard
        count={t("count.sites", { count: visible.length })}
        toolbar={
          <>
            <SearchBox id="sites-search" label={t("searchSites")} value={query} onChange={setQuery} />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {gaps && rivals.length > 0 && (
                <FilterMenu
                  icon={Users}
                  label={t("brandFilter.label")}
                  value={rival}
                  options={[
                    { value: "", label: t("brandFilter.all"), count: ofKind.length },
                    ...rivals.map((brand) => ({
                      value: brand.id,
                      label: brand.name,
                      count: ofKind.filter((source) => namedOn(source).some((item) => item.id === brand.id)).length,
                    })),
                  ]}
                  onChange={setRival}
                />
              )}
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
              <CsvButton iconOnly filename={`${filename}-sites`} label={t("csv")} hint={t("csvHint")} rows={csv} />
            </div>
          </>
        }
      >
        <Table
          empty={visible.length === 0 ? t(gaps && !query && !type && !rival ? "gaps.empty.sites" : "emptyFiltered") : null}
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
          {visible.map((source, index) => {
            const href = siteHref(sitePattern, source.domain);
            return (
              <LinkRow key={source.domain} href={href} tour={index === 0 ? "site" : undefined} className="transition-colors hover:bg-muted/40">
                {/* The site's place among all cited sites, whatever the filters keep */}
                <td className="py-3 pl-4 text-muted-foreground tabular-nums">{sources.indexOf(source) + 1}</td>
                <th scope="row" className="px-2 py-3 text-left font-medium">
                  <span className="flex min-w-0 items-center gap-2">
                    <Initial text={source.domain} />
                    {/* The row opens the same page; the link is the way in for the keyboard */}
                    <Link href={href} className="truncate underline-offset-4 outline-none hover:underline focus-visible:underline">
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
                <td className="hidden px-3 py-3 @xl:table-cell">
                  <TypePill type={source.type} />
                </td>
                <td className="hidden px-3 py-3 @4xl:table-cell">
                  <BrandChips brands={isBrandSite(source) ? [] : namedOn(source)} />
                </td>
                <td className="px-3 py-3 font-medium tabular-nums">{share(source.count)}</td>
                <td className="hidden px-3 py-3 tabular-nums @2xl:table-cell">
                  {source.count ? formatDecimal(source.pages.reduce((sum, page) => sum + page.count, 0) / source.count, locale) : "—"}
                </td>
                <td className="hidden py-3 pr-4 pl-3 @lg:table-cell">
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
      </TableCard>
    </PageSection>
  );
}
