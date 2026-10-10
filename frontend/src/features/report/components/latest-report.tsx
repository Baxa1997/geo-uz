import { ArrowRight } from "lucide-react";
import { useId } from "react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { engineOf, TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { totalAnswers } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { REPORT_PARTS, REPORT_SECTIONS } from "../constants";
import { useAreaFindings } from "../hooks/use-area-findings";
import { ConditionSummary } from "./condition-summary";

/**
 * The latest weekly report as Hisobotlar opens: what it is (its number, the period, how much was asked),
 * the condition it found (the overall score with its status and change, and the five areas with the fact
 * behind each), and the ways on: the whole report, its link, Telegram and its PDF (`share`).
 */
export function LatestReport({ report, href, share }: { report: Report; /** The report's own page. */ href: string; share: React.ReactNode }) {
  const t = useTranslations("Reports.latest");
  const document = useTranslations("Report");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const id = useId();
  const findings = useAreaFindings(report);
  const before = report.history.at(-2)?.collectedAt;
  const issued = formatLongDate(report.method.collectedAt, locale, timeZone);

  return (
    <section aria-labelledby={id} data-tour="latest" className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase tabular-nums">
            {t("kicker")} · {document("number", { number: report.history.length })}
          </p>
          <h2 id={id} className="text-xl font-semibold tracking-tight text-balance">
            {document("kicker")}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {before ? document("meta.periodRange", { from: formatShortDate(before, locale, timeZone), to: issued }) : issued}
            {" · "}
            {t("scope", { prompts: report.prompts.length, answers: totalAnswers(report.prompts), engine: engines(engineOf(report.method.engine)) })}
          </p>
        </div>
        {share}
      </header>

      <div className="px-4 py-4 sm:px-5">
        <ConditionSummary
          report={report}
          findings={{
            visibility: findings.visibility.finding,
            competition: findings.competition.finding,
            coverage: findings.coverage.finding,
            sources: findings.sources.finding,
            accuracy: findings.accuracy.finding,
          }}
        />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t bg-muted/50 px-4 py-3 sm:px-5">
        <p className="min-w-0 flex-1 basis-72 text-sm text-pretty text-muted-foreground">{t("inside", { parts: REPORT_PARTS.length, sections: REPORT_SECTIONS.length })}</p>
        <Link href={href} className={buttonVariants({ size: "lg" })}>
          {t("open")}
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Link>
      </footer>
    </section>
  );
}
