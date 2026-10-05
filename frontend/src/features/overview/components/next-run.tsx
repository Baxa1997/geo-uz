import { CalendarClock } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatWeekdayDate } from "@/shared/helpers/dates";

/** When the questions are asked again, said in words: a bare countdown leaves people guessing what it counts. */
export function NextRun({ at }: { at: string }) {
  const t = useTranslations("Overview");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;

  return (
    <p title={t("nextRunHint")} className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <CalendarClock aria-hidden className="size-4 shrink-0" />
      {t("nextRun", { date: formatWeekdayDate(at, locale, timeZone) })}
    </p>
  );
}
