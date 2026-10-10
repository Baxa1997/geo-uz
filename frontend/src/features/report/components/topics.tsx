import { CircleCheck, CircleX, Minus } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { labelFor } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { namedBrands, promptsWithoutYou } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { groupsAgainstLeader, type GroupRow } from "../helpers/report";
import { BlockTitle, PercentBar, ReportCard, ReportTable } from "./report-parts";

/** The questions without the client that the report lists; the rest are counted. */
const MISSING_SHOWN = 5;

/**
 * Where the client wins and loses: its visibility in each topic against the strongest competitor there, as
 * two bars one over the other (the topics where it trails most first), the same by the language of the
 * question, and the questions in which ChatGPT names competitors and never the client, with who it names.
 */
export function Topics({ report }: { report: Report }) {
  const t = useTranslations("Report.topics");
  const languages = useTranslations("Locales");
  const messages = useMessages();
  const { brand, competitors } = report.project;
  const without = promptsWithoutYou(report.prompts, brand.id, competitors.map((competitor) => competitor.id));
  const byLanguage = groupsAgainstLeader(report, (prompt) => prompt.language);

  return (
    <div className="flex flex-col gap-3.5">
      <ReportCard className="@container">
        <GroupTable heading={t("topic")} rows={groupsAgainstLeader(report, (prompt) => prompt.topic)} label={(key) => labelFor(messages.Topics, key)} />
      </ReportCard>

      {/* One language has nothing to compare */}
      {byLanguage.length > 1 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle>{t("languageTitle")}</BlockTitle>
          <ReportCard className="@container">
            <GroupTable heading={t("language")} rows={byLanguage} label={(key) => (key === "uz" || key === "ru" ? languages(key) : key)} />
          </ReportCard>
        </div>
      )}

      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle count={without.length > 0 ? without.length : undefined}>{t("missingTitle")}</BlockTitle>
        {without.length === 0 ? (
          <p className="text-sm text-pretty text-muted-foreground">{t("missingNone")}</p>
        ) : (
          <ReportCard>
            <ul className="divide-y">
              {without.slice(0, MISSING_SHOWN).map((result) => (
                <li key={result.prompt.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm">
                  <span lang={result.prompt.language} className="font-medium text-pretty">
                    <span className="mr-1.5 align-[1px] text-[0.65rem] font-semibold text-muted-foreground uppercase">{result.prompt.language}</span>
                    {result.prompt.text}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("named", {
                      brands: namedBrands(result, competitors, brand.id)
                        .map(({ brand: named }) => named.name)
                        .join(", "),
                    })}
                  </span>
                </li>
              ))}
            </ul>
            {without.length > MISSING_SHOWN && (
              <p className="border-t px-4 py-2 text-xs text-muted-foreground">{t("missingMore", { count: without.length - MISSING_SHOWN })}</p>
            )}
          </ReportCard>
        )}
      </div>
    </div>
  );
}

/**
 * Groups of questions as rows: the client's visibility over the strongest competitor's, each a bar against
 * the whole scale with its number, then who is ahead and by how much.
 */
function GroupTable({ heading, rows, label }: { heading: string; rows: GroupRow[]; label: (key: string) => string }) {
  const t = useTranslations("Report.topics");
  const locale = useLocale();
  const percent = (value: number) => formatPercent(value / 100, locale);
  const bar = "hidden w-24 shrink-0 @xl:block @3xl:w-40";
  return (
    <ReportTable
      head={
        <>
          <th scope="col">{heading}</th>
          <th scope="col" className="hidden w-20 @2xl:table-cell">
            {t("questions")}
          </th>
          <th scope="col" className="w-40 @xl:w-72 @3xl:w-80">
            {t("compared")}
          </th>
          <th scope="col" className="hidden w-40 @lg:table-cell">
            {t("gap")}
          </th>
        </>
      }
    >
      {rows.map((row) => {
        const gap = row.you - (row.leader?.value ?? 0);
        const Icon = gap > 0 ? CircleCheck : gap < 0 ? CircleX : Minus;
        const result = gap > 0 ? t("ahead", { points: gap }) : gap < 0 ? t("behind", { points: -gap }) : t("level");
        return (
          <tr key={row.key} className="align-top">
            <th scope="row" className="text-left font-medium">
              {label(row.key)}
              {/* On a narrow sheet the result moves under the topic's name */}
              {row.leader && (
                <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-muted-foreground @lg:hidden">
                  <Icon aria-hidden className={gap > 0 ? "size-3.5 text-positive" : gap < 0 ? "size-3.5 text-negative" : "size-3.5"} />
                  {result}
                </span>
              )}
            </th>
            <td className="hidden text-muted-foreground tabular-nums @2xl:table-cell">{row.prompts}</td>
            <td>
              <span className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2.5">
                  <PercentBar value={row.you} className={bar} />
                  <span className="w-10 shrink-0 font-semibold tabular-nums">{percent(row.you)}</span>
                  <span className="truncate text-xs text-muted-foreground">{t("you")}</span>
                </span>
                {row.leader && (
                  <span className="flex items-center gap-2.5">
                    <PercentBar value={row.leader.value} color="var(--rival)" className={bar} />
                    <span className="w-10 shrink-0 tabular-nums">{percent(row.leader.value)}</span>
                    <span className="truncate text-xs text-muted-foreground">{row.leader.name}</span>
                  </span>
                )}
              </span>
            </td>
            <td className="hidden @lg:table-cell">
              {row.leader ? (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Icon aria-hidden className={gap > 0 ? "size-4 shrink-0 text-positive" : gap < 0 ? "size-4 shrink-0 text-negative" : "size-4 shrink-0 text-muted-foreground"} />
                  {result}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
          </tr>
        );
      })}
    </ReportTable>
  );
}
