/** "https://www.Example.uz/about" → "example.uz" */
export function normalizeDomain(input: string): string {
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  return host.split(/[/?#]/)[0] ?? host;
}

export const isValidDomain = (domain: string) =>
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);

/** "https://www.2gis.uz/tashkent/firm/7000/" → "2gis.uz/tashkent/firm/7000": an address without the protocol, "www." or a trailing slash. */
export const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** A page's path on its site, "/tashkent/search/stomatologiya"; empty for the site's front page. */
export function pathOf(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname === "/" ? "" : decodeURIComponent(pathname).replace(/\/$/, "");
  } catch {
    return "";
  }
}

/**
 * Stands for a site's domain in the address of the cited sites' pages. A server page can't hand a client
 * component a function that builds links, so it hands the address with this in it:
 * "/projects/p1/sources/[site]?lang=uz".
 */
export const SITE_SLOT = "[site]";

/** The address of one cited site's page, from the pattern; `params` are added to its query (a tab, a page). */
export function siteHref(pattern: string, domain: string, params: Record<string, string> = {}): string {
  const href = pattern.replace(SITE_SLOT, encodeURIComponent(domain));
  const query = new URLSearchParams(params).toString();
  return query ? `${href}${href.includes("?") ? "&" : "?"}${query}` : href;
}
