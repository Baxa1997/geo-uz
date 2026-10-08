import { CircleCheck, CircleX, Minus } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { labelFor } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { namedBrands, promptsWithoutYou } from "@/shared/helpers/scores";
import type { Report } from "@/shared/types/api";
import { groupsAgainstLeader, type GroupRow } from "../helpers/report";
import { ReportCard, ReportTable } from "./report-parts";

/** The questions without the client that the report lists; the rest are counted. */
const MISSING_SHOWN = 5;

/**
 * Where the client wins and loses: its visibility in each topic against the strongest competitor there
 * (the topics where it trails most first), the same by the language of the question, and the questions in
 * which ChatGPT names competitors and never the client, with who it names.
 */
export function Topics({ report }: { report: Report }) {
  const t = useTranslations("Report.topics");
  const languages = useTranslations("Locales");
  const messages = useMessages();
  const { brand, competitors } = report.project;
  const without = promptsWithoutYou(report.prompts, brand.id, competitors.map((competitor) => competitor.id));
  const byLanguage = groupsAgainstLeader(report, (prompt) => prompt.language);

  return (
    <div className="flex flex-col gap-4">
      <ReportCard>
        <GroupTable heading={t("topic")} rows={groupsAgainstLeader(report, (prompt) => prompt.topic)} label={(key) => labelFor(messages.Topics, key)} />
      </ReportCard>

      {/* One language has nothing to compare */}
      {byLanguage.length > 1 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <h3 className="text-sm font-medium">{t("languageTitle")}</h3>
          <ReportCard>
            <GroupTable heading={t("language")} rows={byLanguage} label={(key) => (key === "uz" || key === "ru" ? languages(key) : key)} />
          </ReportCard>
        </div>
      )}

      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <h3 className="text-sm font-medium">
          {t("missingTitle")}
          {without.length > 0 && <span className="font-normal text-muted-foreground tabular-nums"> · {without.length}</span>}
        </h3>
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

/** Groups of questions as rows: the client's visibility, the strongest competitor's, and who is ahead by how much. */
function GroupTable({ heading, rows, label }: { heading: string; rows: GroupRow[]; label: (key: string) => string }) {
  const t = useTranslations("Report.topics");
  const locale = useLocale();
  const percent = (value: number) => formatPercent(value / 100, locale);
  return (
    <ReportTable
      head={
        <>
          <th scope="col">{heading}</th>
          <th scope="col" className="hidden w-24 sm:table-cell">
            {t("questions")}
          </th>
          <th scope="col" className="w-14 sm:w-20">
            {t("you")}
          </th>
          <th scope="col" className="w-28 sm:w-48">
            {t("leader")}
          </th>
          <th scope="col" className="hidden w-44 sm:table-cell">
            {t("gap")}
          </th>
        </>
      }
    >
      {rows.map((row) => {
        const gap = row.you - (row.leader?.value ?? 0);
        const Icon = gap > 0 ? CircleCheck : gap < 0 ? CircleX : Minus;
        return (
          <tr key={row.key} className="align-top">
            <th scope="row" className="text-left font-medium">
              {label(row.key)}
              {/* On a phone the result moves under the topic's name */}
              {row.leader && (
                <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-muted-foreground sm:hidden">
                  <Icon aria-hidden className={gap > 0 ? "size-3.5 text-positive" : gap < 0 ? "size-3.5 text-negative" : "size-3.5"} />
                  {gap > 0 ? t("ahead", { points: gap }) : gap < 0 ? t("behind", { points: -gap }) : t("level")}
                </span>
              )}
            </th>
            <td className="hidden text-muted-foreground tabular-nums sm:table-cell">{row.prompts}</td>
            <td className="font-semibold tabular-nums">{percent(row.you)}</td>
            <td>
              {row.leader ? (
                <>
                  <span className="tabular-nums">{percent(row.leader.value)}</span>
                  <span className="block truncate text-xs text-muted-foreground sm:ml-1.5 sm:inline">{row.leader.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className="hidden sm:table-cell">
              {row.leader ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon aria-hidden className={gap > 0 ? "size-4 text-positive" : gap < 0 ? "size-4 text-negative" : "size-4 text-muted-foreground"} />
                  {gap > 0 ? t("ahead", { points: gap }) : gap < 0 ? t("behind", { points: -gap }) : t("level")}
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
