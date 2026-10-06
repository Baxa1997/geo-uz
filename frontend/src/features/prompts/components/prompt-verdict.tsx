import { Lightbulb } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { answersNaming, scoreOf } from "@/shared/helpers/scores";
import type { PromptResult, Report } from "@/shared/types/api";

/**
 * A question's latest check in a sentence, above its charts: in how many of the answers ChatGPT named the
 * client, who it named most among the competitors, and how that compares with the check before. Counted
 * in answers, not in percent: with three answers a check, "1 of 3" says more than "33%".
 */
export function PromptVerdict({ report, result }: { report: Report; result: PromptResult }) {
  const t = useTranslations("PromptPage.verdict");
  const common = useTranslations("Common");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { brand, competitors } = report.project;
  const total = result.answers.length;
  const mine = answersNaming(result, brand.id);
  const rival = competitors
    .map((competitor) => ({ name: competitor.name, count: answersNaming(result, competitor.id) }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)[0];
  // The check before, in answers: the report keeps it as a share
  const past = scoreOf(report.history.at(-2)?.scores ?? [], brand.id);
  const before = past ? Math.round(past.visibility * total) : null;
  const date = formatLongDate(report.method.collectedAt, locale, timeZone);

  return (
    <section aria-label={common("takeaway")} className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3.5">
      <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 text-sm text-pretty">
        <span className="font-medium">
          {mine > 0 ? t("named", { date, count: mine, total }) : t("missing", { date, total })}{" "}
          {!rival
            ? t(mine > 0 ? "alone" : "nobody")
            : mine > rival.count
              ? t("ahead", { competitor: rival.name, count: rival.count, total })
              : mine === rival.count
                ? t("level", { competitor: rival.name })
                : t("behind", { competitor: rival.name, count: rival.count, total })}
        </span>
        {before !== null && <span className="text-muted-foreground"> {before === mine ? t("same") : t("before", { count: before, total })}</span>}
      </p>
    </section>
  );
}
