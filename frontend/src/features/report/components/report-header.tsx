import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { engineOf, TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { totalAnswers } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { ReportTools } from "./report-tools";

/** Over the shared report, on screen only: the language switch and the tools (link, print). Our mark is on the paper. */
export function ReportToolbar() {
  return (
    <div className="mx-auto flex w-full max-w-224 flex-wrap items-center justify-end gap-2 print:hidden">
      <LocaleSwitcher />
      <ReportTools />
    </div>
  );
}

/**
 * The head of the report's paper, as an official document opens: a letterhead (who prepared it, the
 * report's number in the run of weekly reports and its date) over a double rule; the document's title in
 * capitals with whom it is about under it, in the middle of the page; and a ruled table of the four facts
 * a reader needs before the first number (the period covered, how much was asked, of which assistant, and
 * by whom it was prepared).
 */
export function ReportLetterhead({ report }: { report: Report }) {
  const t = useTranslations("Report");
  const engines = useTranslations("Engines");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { project, method } = report;
  const previous = report.history.at(-2)?.collectedAt;
  const issued = formatLongDate(method.collectedAt, locale, timeZone);

  const facts = [
    {
      key: "period",
      label: t("meta.period"),
      // A first check covers its own day
      value: previous ? t("meta.periodRange", { from: formatShortDate(previous, locale, timeZone), to: issued }) : issued,
    },
    {
      key: "scope",
      label: t("meta.scope"),
      value: t("meta.scopeValue", { prompts: report.prompts.length, samples: method.samples, answers: totalAnswers(report.prompts) }),
    },
    { key: "assistant", label: t("meta.assistant"), value: t("meta.assistantValue", { engine: engines(engineOf(method.engine)) }) },
    { key: "preparedBy", label: t("meta.preparedBy"), value: t("meta.preparedByValue") },
  ];

  return (
    <header className="flex flex-col gap-4 print:break-inside-avoid">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-double border-foreground pb-3">
        <div className="flex flex-col gap-1">
          <Logo />
          <p className="text-xs text-muted-foreground">{t("letterhead")}</p>
        </div>
        <dl className="flex flex-col gap-0.5 text-sm sm:text-right">
          {/* A report's number is its place in the run of weekly reports */}
          {report.history.length > 0 && (
            <div>
              <dt className="sr-only">{t("meta.number")}</dt>
              <dd className="font-semibold tabular-nums">
                {t("weekly")} · {t("number", { number: report.history.length })}
              </dd>
            </div>
          )}
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
          {labelFor(messages.Categories, project.category)} · {labelFor(messages.Cities, project.city)} · {project.brand.domain}
        </p>
      </div>

      {/* A ruled table of the report's facts: hairlines between the cells, as in a printed form */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-foreground/20 bg-foreground/20 text-sm sm:grid-cols-4 print:grid-cols-4">
        {facts.map(({ key, label, value }) => (
          <div key={key} className="flex min-w-0 flex-col gap-0.5 bg-card px-3 py-2">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="font-medium text-pretty">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

/**
 * The end of the report proper, as an official document closes: who prepared it and when, and beside it a
 * place for the reader to sign that they have read it (a line for the signature, a line for the name and
 * the date). The reference sections and the appendix follow it.
 */
export function ReportSignOff({ report }: { report: Report }) {
  const t = useTranslations("Report.signoff");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const label = "text-xs font-semibold tracking-wider text-muted-foreground uppercase";
  return (
    <div className="grid gap-x-12 gap-y-5 border-t-2 border-foreground pt-3.5 text-sm sm:grid-cols-2 print:grid-cols-2 print:break-inside-avoid">
      <div className="flex flex-col gap-1">
        <p className={label}>{t("preparedBy")}</p>
        <p className="font-semibold">{t("preparedByValue")}</p>
        <p className="text-muted-foreground">{formatLongDate(report.method.collectedAt, locale, timeZone)}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className={label}>{t("acknowledged")}</p>
        <div className="grid grid-cols-2 gap-5 pt-7">
          <p className="border-t border-foreground/60 pt-1 text-xs text-muted-foreground">{t("signature")}</p>
          <p className="border-t border-foreground/60 pt-1 text-xs text-muted-foreground">{t("nameDate")}</p>
        </div>
      </div>
    </div>
  );
}
