"use client";

import { Shapes, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CsvButton } from "@/shared/components/csv-button";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { PageSection } from "@/shared/components/page-section";
import { siteHref } from "@/shared/helpers/domain";
import { formatPercent } from "@/shared/helpers/numbers";
import type { CitedPage, Source, SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { SOURCE_TYPES } from "../constants";
import { GapSwitch } from "./gap-switch";
import { PageCell } from "./page-cell";
import { BrandChips, Heading, Mark, SearchBox, Table, TableCard, TypePill } from "./parts";

type TypeFilter = SourceType | "";

/** The client's own website, or a competitor's: neither is a place to get onto. */
const isBrandSite = (source: Source) => source.type === "own" || source.type === "competitor";

/**
 * Every page ChatGPT cites, as Peec's URLs table: of all sites on the sources page, or of one site on its
 * own page (`site`, where the kind of site goes without saying). The section's heading with the gap
 * switch, then the card with search, filters and the CSV, the table and its count. A row: the page (title
 * over address), the site's kind, the tracked brands it names, the share of answers citing it, whether it
 * names the client; a click anywhere on it opens its site's page on the answers that cite it. The switch
 * keeps the pages, on sites the client could get onto, that name a competitor and not the client: someone
 * to write to, or a competitor's listing to beat (marked). Headings and marks explain themselves on hover.
 */
export function PagesTable({
  sources,
  totalAnswers,
  youId,
  brands,
  filename,
  sitePattern,
  site = false,
}: {
  /** All cited sites, or the one site whose page this is. */
  sources: Source[];
  totalAnswers: number;
  youId: string;
  brands: SeriesBrand[];
  filename: string;
  /** The address of a cited site's page, with SITE_SLOT where its domain goes. */
  sitePattern: string;
  /** On a site's own page. */
  site?: boolean;
}) {
  const t = useTranslations("SourcesPage");
  const types = useTranslations("SourcesPage.types");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("");
  const [gaps, setGaps] = useState(false);
  const [rival, setRival] = useState("");
  const share = (count: number) => formatPercent(totalAnswers ? count / totalAnswers : 0, locale);
  const rivals = brands.filter((brand) => !brand.isYou);
  const namedOn = (page: CitedPage) => brands.filter((brand) => page.mentions?.includes(brand.id));
  const isGap = (source: Source, page: CitedPage) =>
    !isBrandSite(source) && page.mentions !== null && !page.mentions.includes(youId) && rivals.some((brand) => page.mentions?.includes(brand.id));
  // A competitor's own listing, most likely: a directory or social page that names that one brand alone
  const isProfile = (source: Source, page: CitedPage) =>
    (source.type === "directory" || source.type === "social") && page.mentions?.length === 1 && rivals.some((brand) => page.mentions?.[0] === brand.id);
  // A site's own page has the switch only where the client could get on: not its own site or a competitor's
  const canGap = !site || sources.some((source) => !isBrandSite(source));
  const words = query.trim().toLowerCase();

  const pages = sources.flatMap((source) => source.pages.map((page) => ({ source, page }))).sort((a, b) => b.page.count - a.page.count);
  const matching = pages.filter(
    ({ source, page }) => `${page.url} ${page.title ?? ""}`.toLowerCase().includes(words) && (!gaps || isGap(source, page)),
  );
  const ofKind = matching.filter(({ source }) => !type || source.type === type);
  const visible = ofKind.filter(({ page }) => !gaps || !rival || page.mentions?.includes(rival));
  const kinds = matching.map(({ source }) => source.type);

  const csv = () => [
    [t("csvHeaders.page"), t("csvHeaders.title"), t("csvHeaders.site"), t("csvHeaders.type"), t("csvHeaders.share"), t("csvHeaders.answers"), t("csvHeaders.named"), t("csvHeaders.you")],
    ...visible.map(({ source, page }) => [
      page.url,
      page.title,
      source.domain,
      types(source.type),
      totalAnswers ? Math.round((page.count / totalAnswers) * 100) : 0,
      page.count,
      namedOn(page)
        .map((brand) => brand.name)
        .join(", "),
      page.mentions === null ? t("pageUnknown") : page.mentions.includes(youId) ? t("pageYou") : t("pageNotYou"),
    ]),
  ];

  return (
    <PageSection
      title={t("sections.pages.title")}
      description={t(site ? "sections.pages.descriptionSite" : "sections.pages.description")}
      actions={
        canGap && (
          <span data-tour="gaps" className="flex">
            <GapSwitch
              on={gaps}
              onChange={(on) => {
                setGaps(on);
                setRival("");
              }}
              label={t("gaps.label")}
              hint={t("gaps.hint.pages")}
            />
          </span>
        )
      }
    >
      <TableCard
        count={t("count.pages", { count: visible.length })}
        toolbar={
          <>
            <SearchBox id="pages-search" label={t("searchPages")} value={query} onChange={setQuery} />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {gaps && rivals.length > 0 && (
                <FilterMenu
                  icon={Users}
                  label={t("brandFilter.label")}
                  value={rival}
                  options={[
                    { value: "", label: t("brandFilter.all"), count: ofKind.length },
                    ...rivals.map((brand) => ({ value: brand.id, label: brand.name, count: ofKind.filter(({ page }) => page.mentions?.includes(brand.id)).length })),
                  ]}
                  onChange={setRival}
                />
              )}
              {!site && (
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
              )}
              <CsvButton iconOnly filename={`${filename}-pages`} label={t("csv")} hint={t("csvHint")} rows={csv} />
            </div>
          </>
        }
      >
        <Table
          empty={visible.length === 0 ? t(gaps && !words && !type && !rival ? "gaps.empty.pages" : "emptyFiltered") : null}
          head={
            <>
              <Heading label={t("columns.page")} hint={t("hints.page")} className="pl-4" />
              {!site && <Heading label={t("columns.type")} hint={t("hints.type")} className="hidden w-44 px-3 @xl:table-cell" />}
              <Heading label={t("columns.named")} hint={t("hints.named")} className="hidden w-44 px-3 @3xl:table-cell" />
              <Heading label={t("columns.used")} hint={t("hints.used")} className="w-24 px-3" />
              <Heading label={t("columns.you")} hint={t("hints.you")} className="hidden w-32 pr-4 pl-3 @lg:table-cell" />
            </>
          }
        >
          {visible.map(({ source, page }) => {
            const href = siteHref(sitePattern, source.domain, { tab: "answers", page: page.url });
            return (
              <LinkRow key={page.url} href={href} className="transition-colors hover:bg-muted/40">
                <th scope="row" className="py-3 pl-4 text-left font-medium">
                  <PageCell page={page} domain={source.domain} href={href} />
                  {gaps && isProfile(source, page) && (
                    <Hint text={t("hints.profile")} focusable={false} className="mt-1 ml-8 rounded-md border px-1.5 py-px text-xs font-normal text-muted-foreground">
                      {t("outreachProfile")}
                    </Hint>
                  )}
                </th>
                {!site && (
                  <td className="hidden px-3 py-3 @xl:table-cell">
                    <TypePill type={source.type} />
                  </td>
                )}
                <td className="hidden px-3 py-3 @3xl:table-cell">
                  <BrandChips brands={isBrandSite(source) ? [] : namedOn(page)} />
                </td>
                <td className="px-3 py-3 font-medium tabular-nums">{share(page.count)}</td>
                <td className="hidden py-3 pr-4 pl-3 @lg:table-cell">
                  {source.type === "competitor" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Mark value={page.mentions === null ? null : page.mentions.includes(youId)} yes={t("pageYou")} no={t("pageNotYou")} unknown={t("pageUnknown")} />
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
