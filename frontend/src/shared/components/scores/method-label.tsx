import { Info } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { ReportMethod } from "@/shared/types/api";

const ENGINE_NAMES: Record<string, string> = { chatgpt: "ChatGPT" };

/** How the answers were collected. Required on every report. */
export function MethodLabel({ method }: { method: ReportMethod }) {
  const t = useTranslations("Method");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;

  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>
        <span className="font-medium text-foreground">{t("title")}:</span>{" "}
        {t("label", {
          engine: ENGINE_NAMES[method.engine] ?? method.engine,
          webSearch: method.webSearch ? "yes" : "no",
          model: method.model,
          samples: method.samples,
          date: formatLongDate(method.collectedAt, locale, timeZone),
        })}
      </span>
    </p>
  );
}
