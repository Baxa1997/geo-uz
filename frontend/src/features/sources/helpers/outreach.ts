import type { CitedPage, PromptResult, Source } from "@/shared/types/api";
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

/**
 * How ChatGPT uses the client's own website: the answers that cite it, and how many of those don't name
 * the client (Peec's "cited without a mention": the site served as a source, the brand wasn't recommended).
 */
export function ownSiteUse(results: PromptResult[], domain: string, youId: string): { answers: number; citing: number; unnamed: number } {
  const answers = results.flatMap((result) => result.answers);
  const citing = answers.filter((answer) => answer.citations.some((citation) => citation.domain === domain));
  return {
    answers: answers.length,
    citing: citing.length,
    unnamed: citing.filter((answer) => !answer.mentions.some((mention) => mention.brandId === youId)).length,
  };
}
