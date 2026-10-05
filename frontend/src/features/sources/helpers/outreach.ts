import type { CitedPage, Source } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

export interface OutreachPage {
  source: Source;
  page: CitedPage;
  /** Tracked competitors the page names. */
  named: SeriesBrand[];
  /** Names only one competitor on a directory or social site: most likely that competitor's own listing. */
  profile: boolean;
}

/**
 * Cited pages that don't name the client, on sites it could get onto (not its own or a competitor's
 * website), most cited first. Pages that couldn't be read are left out: we don't know who they name.
 */
export function outreachPages(sources: Source[], youId: string, brands: SeriesBrand[]): OutreachPage[] {
  const rivals = brands.filter((brand) => brand.id !== youId);
  return sources
    .filter((source) => source.type !== "own" && source.type !== "competitor")
    .flatMap((source) =>
      source.pages.flatMap((page) => {
        if (page.mentions === null || page.mentions.includes(youId)) return [];
        const named = rivals.filter((brand) => page.mentions?.includes(brand.id));
        const profile = named.length === 1 && page.mentions.length === 1 && (source.type === "directory" || source.type === "social");
        return [{ source, page, named, profile }];
      }),
    )
    .sort((a, b) => b.page.count - a.page.count || b.named.length - a.named.length);
}

/** "2gis.uz/tashkent/firm/7000…" without the protocol, "www." or a trailing slash. */
export const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
