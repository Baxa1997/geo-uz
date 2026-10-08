import { pathOf, siteHref } from "@/shared/helpers/domain";
import type { Source } from "@/shared/types/api";
import type { ChartLine } from "../components/sources-chart";

/** The brands' palette without its first color, which is the client's. */
const PALETTE = [2, 3, 4, 5, 6].map((slot) => `var(--series-${slot})`);

/** How many sites the chart of the sources page draws. */
export const TOP_SITES = 5;

/**
 * The sources chart's lines: the most cited sites, each leading to its own page. The client's own site
 * keeps the client's color and is drawn thicker; the others take the rest of the palette in order.
 */
export function siteLines(sources: Source[], sitePattern: string): ChartLine[] {
  const top = sources.slice(0, TOP_SITES);
  const others = top.filter((source) => source.type !== "own");
  return top.map((source) => ({
    key: source.domain,
    name: source.domain,
    domain: source.domain,
    strong: source.type === "own",
    color: source.type === "own" ? "var(--series-1)" : (PALETTE[others.indexOf(source)] ?? "var(--rival-strong)"),
    href: siteHref(sitePattern, source.domain),
  }));
}

/**
 * One site's lines: the site as a whole, thicker (`whole` names it), then its most cited pages by their
 * paths. A site with a single cited page has one line: the page's would lie exactly on the site's.
 */
export function pageLines(domain: string, own: boolean, pages: { url: string }[], whole: string): ChartLine[] {
  const site: ChartLine = { key: domain, name: pages.length > 1 ? whole : domain, domain, strong: true, color: own ? "var(--series-1)" : "var(--rival-strong)" };
  if (pages.length <= 1) return [site];
  return [
    site,
    ...pages.slice(0, PALETTE.length - 1).map((page, index) => ({
      key: page.url,
      name: pathOf(page.url) || domain,
      domain,
      url: page.url,
      color: PALETTE[index] ?? "var(--rival-strong)",
    })),
  ];
}
