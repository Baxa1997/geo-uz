import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";

/** The line under "What changed": which check the latest one is compared with, and what the two cards show. */
export function MoversDescription({ comparedWith, scope }: { comparedWith: string | null; scope: "sites" | "pages" | "site" }) {
  const t = useTranslations("SourcesPage.sections.movers");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  return comparedWith ? t(scope, { date: formatLongDate(comparedWith, locale, timeZone) }) : t(`first.${scope}`);
}
