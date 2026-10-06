import { Hourglass } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { EmptyState } from "@/shared/components/empty-state";
import { TIME_ZONE } from "@/shared/constants";
import { formatWeekdayDate } from "@/shared/helpers/dates";

/**
 * A question no check has asked yet: it has no numbers, so the page says when the first ones come. An
 * archived question that was never asked says that instead.
 */
export function PromptQueued({ archived, nextRunAt }: { archived: boolean; nextRunAt: string | null }) {
  const t = useTranslations("PromptPage.queued");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  return (
    <EmptyState
      icon={Hourglass}
      title={t(archived ? "archivedTitle" : "title")}
      text={archived ? t("archivedText") : nextRunAt ? t("text", { date: formatWeekdayDate(nextRunAt, locale, timeZone) }) : t("textNoDate")}
    />
  );
}
