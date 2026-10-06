import { Lightbulb } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal, formatPercent } from "@/shared/helpers/numbers";
import { headlineMetrics, outOfTen, scoreOf, topCompetitor } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";

/**
 * The Overview in a sentence, above the numbers: how often ChatGPT names the client, how often it names
 * the strongest competitor, and whether that got better since last week. Never a place without its
 * number: "first" means little at 2 answers in 10.
 */
export function Verdict({ report }: { report: Report }) {
  const t = useTranslations("Headline");
  const common = useTranslations("Common");
  const standing = useTranslations("Standing");
  const locale = useLocale();
  const { brand, competitors } = report.project;
  const you = scoreOf(report.scores, brand.id);
  if (!you) return null;

  const rival = topCompetitor(competitors, report.scores);
  const percent = formatPercent(you.visibility, locale);
  const change = headlineMetrics(report.history, brand.id).find(({ metric }) => metric === "visibility")?.change ?? null;
  const amount = change === null ? null : formatDecimal(Math.abs(change), locale);

  return (
    <section aria-label={common("takeaway")} className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3.5">
      <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 text-sm text-pretty">
        <span className="font-medium">
          {rival
            ? t("summary", {
                you: outOfTen(you.visibility),
                percent,
                competitor: rival.brand.name,
                them: outOfTen(rival.score.visibility),
              })
            : t("summaryAlone", { you: outOfTen(you.visibility), percent })}
        </span>
        {change !== null && amount !== null && (
          <span className="text-muted-foreground"> {amount === "0" ? standing("same") : standing(change > 0 ? "better" : "worse", { amount })}</span>
        )}
      </p>
    </section>
  );
}
