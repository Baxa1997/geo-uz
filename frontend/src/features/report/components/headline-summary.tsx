import { useTranslations } from "next-intl";
import { REPORT_AREAS } from "@/shared/helpers/areas";
import { cn } from "@/shared/helpers/utils";
import type { ReportArea, WaveMetrics } from "@/shared/types/api";
import { useCountWords } from "@/shared/hooks/use-count-words";

/**
 * Where the client stands, as a status report opens since the 0–100 score went (report spec rule 1, Phase 0
 * item 0.2; the user's decision of 21 Nov 2026: counts, no status): the buyers' answers that name it out of
 * all of them, large, with the "small sample" badge under 20 answers; beside it the five areas, each with its
 * own count and the sentence behind it. The same in the report's summary and at the top of Hisobotlar.
 */
export function HeadlineSummary({ metrics, findings, className }: { metrics: WaveMetrics; findings: Record<ReportArea, string>; className?: string }) {
  const t = useTranslations("Report.headline");
  const areas = useTranslations("Report.areas");
  const words = useCountWords();
  const seen = metrics.visibility;
  const client = metrics.brands.rows.find((row) => row.own);

  // Each area's own count, in the words its sentence uses
  const value: Record<ReportArea, string> = {
    visibility: words.fraction(seen.named, seen.answers),
    competition: client ? words.rank(client) : words.na,
    coverage: words.fraction(seen.prompts_named, seen.prompts),
    sources: seen.cited_answers > 0 ? words.fraction(seen.client_cited, seen.cited_answers) : words.na,
    accuracy: client ? words.tone(client) : words.na,
  };

  return (
    // On paper it stays in one piece: the count and its badge are never cut from the areas beside them
    <div data-tour="condition" className={cn("@container print:break-inside-avoid", className)}>
      <div className="grid gap-x-8 gap-y-5 @2xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-1.5 @2xl:border-r @2xl:pr-8">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("label")}</p>
          <p className="text-5xl leading-none font-semibold tracking-tight tabular-nums">
            <span data-metric="headline">{words.fraction(seen.named, seen.answers)}</span>
          </p>
          <p className="text-sm text-pretty text-muted-foreground">{t("of", { answers: seen.answers })}</p>
          {seen.small_sample && (
            <p className="mt-1 flex flex-col gap-1">
              <span className="w-fit rounded-[3px] bg-progress/10 px-2 py-0.5 text-xs font-semibold ring-1 ring-progress/40">{t("smallSample")}</span>
              <span className="text-xs text-pretty text-muted-foreground">{t("smallSampleNote", { minimum: seen.small_sample_below })}</span>
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <p className="border-b pb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("byArea")}</p>
          <ul className="divide-y">
            {REPORT_AREAS.map((area) => (
              <li key={area} className="flex flex-col gap-1 py-2.5 print:break-inside-avoid">
                <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="text-[0.9375rem] font-semibold">{areas(area)}</span>
                  <span className="font-semibold tabular-nums" {...(area === "accuracy" ? { "data-metric": "accuracy.tone" } : {})}>
                    {value[area]}
                  </span>
                </p>
                <p className="text-sm text-pretty text-muted-foreground">{findings[area]}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
