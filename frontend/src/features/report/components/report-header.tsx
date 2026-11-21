import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { labelFor, placeLabel } from "@/shared/helpers/labels";
import type { Report, WaveScope } from "@/shared/types/api";
import { ReportTools } from "./report-tools";
import { ScopeCard } from "./scope-card";

/** Over the shared report, on screen only: the language switch and the tools (link, PDF). Our mark is on the paper. */
export function ReportToolbar({ projectId, runId }: { projectId: string; runId: string }) {
  return (
    <div className="mx-auto flex w-full max-w-224 flex-wrap items-center justify-end gap-2 print:hidden">
      <LocaleSwitcher />
      <ReportTools projectId={projectId} runId={runId} />
    </div>
  );
}

/**
 * The head of the report's paper, as an official document opens: a letterhead (who prepared it, the
 * report's number in the run of reports and its date) over a double rule; the document's title in capitals
 * with whom it is about under it, in the middle of the page; then the scope card (report spec §4.0): which
 * check this is, who was asked and how, and every answer planned against what came back, from the slot log
 * alone (Phase 0 item 0.1, 21 Nov 2026: it replaced a table that counted the answers shown).
 */
export function ReportLetterhead({ report, scope }: { report: Report; scope: WaveScope }) {
  const t = useTranslations("Report");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { project } = report;
  const issued = formatLongDate(scope.wave.collected_at, locale, timeZone);

  return (
    <header className="flex flex-col gap-4 print:break-inside-avoid">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-double border-foreground pb-3">
        <div className="flex flex-col gap-1">
          <Logo />
          <p className="text-xs text-muted-foreground">{t("letterhead")}</p>
        </div>
        <dl className="flex flex-col gap-0.5 text-sm sm:text-right">
          {/* A report's number is its check's place among the project's checks */}
          <div>
            <dt className="sr-only">{t("meta.number")}</dt>
            <dd className="font-semibold tabular-nums">
              {t("weekly")} · {t("number", { number: scope.wave.number })}
            </dd>
          </div>
          <div className="text-muted-foreground">
            <dt className="inline">{t("meta.issued")}: </dt>
            <dd className="inline text-foreground">{issued}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-bold tracking-[0.06em] text-balance uppercase sm:text-[1.625rem] sm:leading-tight">{t("kicker")}</h1>
        <p className="text-lg font-semibold text-balance">{project.brand.name}</p>
        <p className="text-sm text-pretty text-muted-foreground">
          {labelFor(messages.Categories, project.category)} · {placeLabel(messages.Cities, locale, project)} · {project.brand.domain}
        </p>
      </div>

      <ScopeCard scope={scope} />
    </header>
  );
}

/**
 * The end of the report proper, as an official document closes: who prepared it and when. The reference
 * sections and the appendix follow it.
 */
export function ReportSignOff({ report }: { report: Report }) {
  const t = useTranslations("Report.signoff");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const label = "text-xs font-semibold tracking-wider text-muted-foreground uppercase";
  return (
    // Who prepared it and when; the lines for the reader to sign are gone (the user, 18 Nov 2026)
    <div className="flex flex-col gap-1 border-t-2 border-foreground pt-3.5 text-sm print:break-inside-avoid">
      <p className={label}>{t("preparedBy")}</p>
      <p className="font-semibold">{t("preparedByValue")}</p>
      <p className="text-muted-foreground">{formatLongDate(report.method.collectedAt, locale, timeZone)}</p>
    </div>
  );
}
