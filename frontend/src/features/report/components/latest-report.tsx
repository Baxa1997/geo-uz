import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useId } from "react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import type { Report, WaveResponse } from "@/shared/types/api";
import { REPORT_PARTS, REPORT_SECTIONS } from "../constants";
import { useAreaFindings } from "../hooks/use-area-findings";
import { HeadlineSummary } from "./headline-summary";

/**
 * The latest weekly report as Hisobotlar opens: what it is (its number, the period, how much was asked),
 * where the client stands as the report's summary has it (the buyers' answers that name it, as a count, and
 * the five areas each with its own count: no score since 21 Nov 2026, report spec Phase 0 item 0.2), and the
 * ways on: the whole report, its link, Telegram and its PDF (`share`).
 */
export function LatestReport({ report, wave, href, share }: { report: Report; wave: WaveResponse; /** The report's own page. */ href: string; share: React.ReactNode }) {
  const t = useTranslations("Reports.latest");
  const document = useTranslations("Report");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const id = useId();
  const { scope } = wave.metrics;
  const findings = useAreaFindings(report, wave.metrics);
  const before = report.history.at(-2)?.collectedAt;
  const issued = formatLongDate(scope.wave.collected_at, locale, timeZone);
  const names = scope.engines.map(({ engine }) => (engine === "chatgpt" || engine === "gemini" ? engines(engine) : engine)).join(", ");
  const sentences = {
    visibility: findings.visibility.finding,
    competition: findings.competition.finding,
    coverage: findings.coverage.finding,
    sources: findings.sources.finding,
    accuracy: findings.accuracy.finding,
  };

  return (
    <section aria-labelledby={id} data-tour="latest" className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase tabular-nums">
            {t("kicker")} · {document("number", { number: scope.wave.number })}
          </p>
          <h2 id={id} className="text-xl font-semibold tracking-tight text-balance">
            {document("kicker")}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {before ? document("meta.periodRange", { from: formatShortDate(before, locale, timeZone), to: issued }) : issued}
            {" · "}
            {t("scope", { prompts: scope.prompts.discovery, answers: scope.slots.completed, engine: names })}
          </p>
        </div>
        {share}
      </header>

      <div className="px-4 py-4 sm:px-5">
        <HeadlineSummary metrics={wave.metrics} findings={sentences} />
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
