import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { MinusIcon as Minus } from "@phosphor-icons/react/dist/ssr/Minus";
import { XIcon as X } from "@phosphor-icons/react/dist/ssr/X";
import { useLocale, useTranslations } from "next-intl";
import { formatPercent } from "@/shared/helpers/numbers";
import { cn } from "@/shared/helpers/utils";
import type { Answer, BrandView, Report } from "@/shared/types/api";
import { BlockTitle, PercentBar, ReportCard, ReportTable } from "./report-parts";

type Locale = "uz" | "ru" | "en";

const CHECK_MARK = {
  confirmed: { icon: Check, color: "text-positive" },
  contradicted: { icon: X, color: "text-negative" },
  unverified: { icon: Minus, color: "text-muted-foreground" },
} as const;

const KNOWN_TONE: Record<BrandView["known"], string> = { knows: "text-positive", confuses: "text-progress", unknown: "text-negative" };

/** One assistant's answers in the report: how many, how many name the client, and whom they name most. */
function standingOn(report: Report, answers: Answer[]) {
  const { brand, competitors } = report.project;
  const named = (id: string) => answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === id)).length;
  const leader = [brand, ...competitors].map((item) => ({ brand: item, named: named(item.id) })).sort((a, b) => b.named - a.named)[0];
  return { answers: answers.length, you: named(brand.id), leader: leader && leader.named > 0 ? leader : null };
}

/**
 * Each assistant apart (the user, 17 Nov 2026: "AI overview, Gemini, ChatGPT – facts about our brand, what AI
 * knows" and "separate … shares of knowing the brand"). A: how often each names the client, beside whom it
 * names most, counted over its own answers. B: what each says when asked about the business by name, every
 * statement against the website: the same, different (with what the website says), or not on the website.
 * Google's AI answers in Search are not asked yet, and the section says so.
 */
export function Assistants({ report }: { report: Report }) {
  const t = useTranslations("Report.assistants");
  const locale = useLocale() as Locale;
  const answers = report.prompts.flatMap((result) => result.answers);
  const asked = (report.engines?.length ? report.engines : [{ engine: answers[0]?.engine ?? "chatgpt", name: report.method.engine, answers: answers.length }]).map((item) => ({
    ...item,
    ...standingOn(report, report.engines?.length ? answers.filter((answer) => (answer.engine ?? "chatgpt") === item.engine) : answers),
  }));
  const views = report.brandView ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("sharesTitle")}</BlockTitle>
        <ReportCard className="overflow-x-auto">
          <ReportTable
            head={
              <>
                <th>{t("columns.assistant")}</th>
                <th className="text-right">{t("columns.answers")}</th>
                <th className="w-[38%]">{t("columns.you")}</th>
                <th>{t("columns.leader")}</th>
              </>
            }
          >
            {asked.map((row) => (
              <tr key={row.engine}>
                <th scope="row" className="text-left font-semibold">
                  {row.name}
                </th>
                <td className="text-right tabular-nums">{row.answers}</td>
                <td>
                  <span className="flex items-center gap-3">
                    <PercentBar value={row.answers ? (row.you / row.answers) * 100 : 0} className="min-w-16 flex-1" />
                    <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">
                      {t("named", { count: row.you, total: row.answers, percent: formatPercent(row.answers ? row.you / row.answers : 0, locale) })}
                    </span>
                  </span>
                </td>
                <td className="text-pretty">
                  {row.leader ? (
                    <>
                      {row.leader.brand.name}
                      {row.leader.brand.id === report.project.brand.id && <span className="text-muted-foreground"> ({t("youLead")})</span>}
                      <span className="text-muted-foreground tabular-nums"> · {t("leaderNamed", { count: row.leader.named, total: row.answers })}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t("nobody")}</span>
                  )}
                </td>
              </tr>
            ))}
          </ReportTable>
        </ReportCard>
        <p className="text-xs text-pretty text-muted-foreground">{t("notYet")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <BlockTitle>{t("knowsTitle", { brand: report.project.brand.name })}</BlockTitle>
        {views.length === 0 ? (
          <p className="text-sm text-pretty">{t("notAsked")}</p>
        ) : (
          views.map((view, index) => (
            <div key={`${view.engine}-${index}`} className="flex flex-col gap-2 print:break-inside-avoid">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold">{view.name}</span>
                <span className={cn("font-semibold", KNOWN_TONE[view.known])}>{t(`known.${view.known}`)}</span>
                <span className="text-muted-foreground">· {t("asked", { question: view.question })}</span>
              </p>
              {view.statements.length === 0 ? (
                <p className="text-sm text-pretty text-muted-foreground">{t("saidNothing")}</p>
              ) : (
                <ReportCard>
                  <ReportTable
                    head={
                      <>
                        <th className="w-[58%]">{t("columns.says")}</th>
                        <th>{t("columns.check")}</th>
                      </>
                    }
                  >
                    {view.statements.map((statement, at) => {
                      const mark = CHECK_MARK[statement.check];
                      return (
                        <tr key={at}>
                          <td className="text-pretty">
                            <span className="text-xs text-muted-foreground">{t(`topics.${statement.topic}`)} · </span>
                            {statement.text[locale]}
                          </td>
                          <td className="text-pretty">
                            <span className={cn("inline-flex items-start gap-1.5 font-medium", mark.color)}>
                              <mark.icon aria-hidden className="mt-0.5 size-3.5 shrink-0" weight="bold" />
                              {t(`checks.${statement.check}`)}
                            </span>
                            {statement.check === "contradicted" && statement.correct && (
                              <span className="block text-muted-foreground">{t("website", { text: statement.correct[locale] })}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </ReportTable>
                </ReportCard>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
