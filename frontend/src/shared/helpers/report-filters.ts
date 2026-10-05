import { PROMPT_LANGUAGES } from "@/shared/constants";
import type { PromptLanguage, ReportFilters } from "@/shared/types/api";

type SearchParams = Record<string, string | string[] | undefined>;

/** URL names of the filters shared by a project's data pages: ?lang=uz&topic=implants. */
export const FILTER_PARAMS = { language: "lang", topic: "topic" } as const;

const isLanguage = (value: unknown): value is PromptLanguage => PROMPT_LANGUAGES.some((language) => language === value);

/** The filters in a page's search params; anything unknown is ignored. */
export function parseReportFilters(params: SearchParams): ReportFilters {
  const language = params[FILTER_PARAMS.language];
  const topic = params[FILTER_PARAMS.topic];
  return {
    ...(isLanguage(language) ? { language } : {}),
    ...(typeof topic === "string" && topic ? { topic } : {}),
  };
}

export const hasFilters = ({ language, topic }: ReportFilters) => Boolean(language || topic);

/** Adds the filters (and any extra params) to a link, so they follow the user from page to page. */
export function withFilters(href: string, { language, topic }: ReportFilters, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    ...(language ? { [FILTER_PARAMS.language]: language } : {}),
    ...(topic ? { [FILTER_PARAMS.topic]: topic } : {}),
    ...extra,
  });
  return params.size > 0 ? `${href}?${params}` : href;
}
