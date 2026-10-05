// The site check: what the backend would find when it reads a brand's website.
import type { SiteCheck, SiteCheckResult } from "@/shared/types/api";
import { BRANDS } from "./data";

const CHECKS: SiteCheck[] = ["ai_bots_blocked", "prices_as_images", "no_business_markup", "contacts_missing"];

const SAMPLE_SITES = new Set<string>(Object.values(BRANDS).map((brand) => brand.domain));

/**
 * The same result every time for a domain. Most local sites lack business markup, and some show their
 * prices only as pictures. Every brand's pages are cited in the mock answers, so the mock never reports
 * blocked bots or missing contacts: ChatGPT couldn't have cited them otherwise.
 */
export function siteChecks(domain: string): SiteCheckResult[] {
  const hash = [...domain].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const failed = new Set<SiteCheck>(["no_business_markup"]);
  if (!SAMPLE_SITES.has(domain) && hash % 3 === 0) failed.add("prices_as_images");
  return CHECKS.map((check) => ({ check, passed: !failed.has(check) }));
}
