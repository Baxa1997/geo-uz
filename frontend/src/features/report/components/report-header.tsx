import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { engineOf, TIME_ZONE } from "@/shared/constants";
import { formatLongDate, formatShortDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { totalAnswers } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { ReportTools } from "./report-tools";

/**
 * The report's title block, as a business report opens: what it is, whom it is about, and the four facts a
 * reader needs before the first number (the period covered, the date, how much was asked, of which
 * assistant). Above it, on screen only, the language switch and the tools.
 */
export function ReportHeader({ report }: { report: Report }) {
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
    { key: "issued", label: t("meta.issued"), value: issued },
    {
      key: "scope",
      label: t("meta.scope"),
      value: t("meta.scopeValue", { prompts: report.prompts.length, samples: method.samples, answers: totalAnswers(report.prompts) }),
    },
    { key: "assistant", label: t("meta.assistant"), value: t("meta.assistantValue", { engine: engines(engineOf(method.engine)) }) },
  ];

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <LocaleSwitcher />
          <ReportTools />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {t("kicker")} · {t("weekly")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{project.brand.name}</h1>
        <p className="text-sm text-muted-foreground">
          {labelFor(messages.Categories, project.category)} · {labelFor(messages.Cities, project.city)} · {project.brand.domain}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y py-4 text-sm sm:grid-cols-4">
        {facts.map(({ key, label, value }) => (
          <div key={key} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium text-pretty">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
