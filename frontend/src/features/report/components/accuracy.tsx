import { CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { Report } from "@/shared/types/api";
import { ReportCard } from "./report-parts";

/**
 * What ChatGPT says about the client that isn't true: each wrong statement beside the correct one, with
 * the question it came up in and since when. None found is said in a sentence, with a mark.
 */
export function Accuracy({ report }: { report: Report }) {
  const t = useTranslations("Report.accuracy");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const questionOf = (id: string) => report.prompts.find((result) => result.prompt.id === id)?.prompt.text;

  if (report.wrongFacts.length === 0) {
    return (
      <p className="flex items-start gap-2 text-sm">
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
        {t("none")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {report.wrongFacts.map((fact) => {
        const question = questionOf(fact.promptId);
        return (
          <li key={`${fact.promptId}-${fact.claim}`} className="print:break-inside-avoid">
            <ReportCard className="flex flex-col">
              <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-negative" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("says")}</dt>
                    <dd className="font-medium text-pretty">{fact.claim}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("correct")}</dt>
                    <dd className="text-pretty">{fact.correct}</dd>
                  </div>
                </div>
              </dl>
              <p className="border-t px-4 py-2 text-xs text-pretty text-muted-foreground">
                {question && (
                  <>
                    {t("question")}: <span className="text-foreground">{question}</span> ·{" "}
                  </>
                )}
                {t("since")}: {formatLongDate(fact.foundAt, locale, timeZone)}
              </p>
            </ReportCard>
          </li>
        );
      })}
    </ul>
  );
}
