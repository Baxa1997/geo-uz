import { useMessages, useTranslations } from "next-intl";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import { shareOf, useCountWords } from "@/shared/hooks/use-count-words";
import type { Report, WaveGroup, WaveMetrics } from "@/shared/types/api";
import { BlockTitle, PercentBar, ReportCard, ReportTable, Share } from "./report-parts";

/** How the client stands in a group of questions, the worst first. */
type Standing = "absent" | "behind" | "level" | "ahead" | "nobody";

const ORDER: Standing[] = ["absent", "behind", "level", "ahead", "nobody"];
const TAG: Record<Standing, string> = {
  absent: "border-negative/40 bg-negative/10 text-negative",
  behind: "border-progress/40 bg-progress/10 text-progress",
  level: "border-foreground/20 bg-muted text-foreground",
  ahead: "border-positive/40 bg-positive/10 text-positive",
  nobody: "border-foreground/15 text-muted-foreground",
};

function standingOf(row: WaveGroup): Standing {
  const rival = row.rivals.value;
  if (row.named === 0) return rival > 0 ? "absent" : "nobody";
  return row.named > rival ? "ahead" : row.named < rival ? "behind" : "level";
}

/**
 * Where the client is named and where it isn't (rebuilt on 16 Nov 2026; the user: "the Theme what does it give
 * to the brand, and its structure of illustrating not clear"). First what a topic is and what it is for, in
 * two sentences. Then how many topics fall into each standing, as three counts. Then one row a topic, the
 * worst first: its questions, the answers naming the client counted in answers ("0 / 2", its share beside it
 * only on a wide sheet), the competitors named most there (every one that ties), the standing as a word, and
 * what to do about it. The same by the language of the question. The counts are the check's data object's
 * (Phase 0 item 0.3). The questions themselves are the next section.
 */
export function Topics({ report, metrics }: { report: Report; metrics: WaveMetrics }) {
  const t = useTranslations("Report.topics");
  const languages = useTranslations("Locales");
  const messages = useMessages();
  const { brand, competitors } = report.project;
  const nameOf = (id: string) => [brand, ...competitors].find((item) => item.id === id)?.name ?? id;
  const byTopic = metrics.topics;
  const byLanguage = metrics.languages;
  const count = (standings: Standing[]) => byTopic.filter((row) => standings.includes(standingOf(row))).length;
  const totals = [
    { key: "strong", value: count(["ahead"]), color: "text-positive" },
    { key: "even", value: count(["level"]), color: "text-foreground" },
    { key: "lost", value: count(["absent", "behind"]), color: "text-negative" },
  ] as const;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1 border-l-2 border-foreground/30 pl-3 text-sm text-pretty print:break-inside-avoid">
        <p>
          <span className="font-semibold">{t("whatTitle")}</span> {t("what")}
        </p>
        <p className="text-muted-foreground">{t("why")}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 print:break-inside-avoid">
        {totals.map((total) => (
          <ReportCard key={total.key} className="flex flex-col gap-0.5 px-3.5 py-2.5">
            <dd className={cn("text-2xl leading-tight font-semibold tabular-nums", total.color)}>{total.value}</dd>
            <dt className="text-xs text-pretty text-muted-foreground">{t(`totals.${total.key}`)}</dt>
          </ReportCard>
        ))}
      </dl>

      <ReportCard className="@container">
        <GroupTable heading={t("topic")} rows={byTopic} label={(key) => labelFor(messages.Topics, key)} nameOf={nameOf} advice />
      </ReportCard>

      {/* One language has nothing to compare */}
      {byLanguage.length > 1 && (
        <div className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle>{t("languageTitle")}</BlockTitle>
          <ReportCard className="@container">
            <GroupTable heading={t("language")} rows={byLanguage} label={(key) => (key === "uz" || key === "ru" || key === "en" ? languages(key) : key)} nameOf={nameOf} />
          </ReportCard>
        </div>
      )}
    </div>
  );
}

/**
 * Groups of questions as rows, the worst standing first: the answers naming the client out of all the
 * group's answers with a bar, the competitors named most with their own count, the standing as a tag, and
 * (`advice`) what the standing asks for under the group's name.
 */
function GroupTable({
  heading,
  rows,
  label,
  nameOf,
  advice = false,
}: {
  heading: string;
  rows: WaveGroup[];
  label: (key: string) => string;
  nameOf: (id: string) => string;
  advice?: boolean;
}) {
  const t = useTranslations("Report.topics");
  const words = useCountWords();
  const share = (row: WaveGroup) => shareOf(row.named, row.answers) ?? 0;
  const sorted = [...rows].sort((a, b) => ORDER.indexOf(standingOf(a)) - ORDER.indexOf(standingOf(b)) || share(a) - share(b));
  const bar = "hidden w-14 shrink-0 @xl:block @3xl:w-24";

  return (
    <ReportTable
      head={
        <>
          <th scope="col">{heading}</th>
          <th scope="col" className="hidden w-20 @2xl:table-cell">
            {t("questions")}
          </th>
          <th scope="col" className="w-28 @xl:w-44">
            {t("youNamed")}
          </th>
          <th scope="col" className="hidden w-44 @lg:table-cell">
            {t("rival")}
          </th>
          <th scope="col" className="w-28">
            {t("standing")}
          </th>
        </>
      }
    >
      {sorted.map((row) => {
        const standing = standingOf(row);
        const rivals = words.names(row.rivals.ids.map(nameOf));
        return (
          <tr key={row.key} className="align-top print:break-inside-avoid">
            <th scope="row" className="text-left font-medium">
              {label(row.key)}
              {advice && <span className="mt-0.5 block text-xs font-normal text-pretty text-muted-foreground">{t(`advice.${standing}`, { rival: rivals })}</span>}
            </th>
            <td className="hidden text-muted-foreground tabular-nums @2xl:table-cell">{row.prompts}</td>
            <td>
              <span className="flex items-center gap-2.5">
                <PercentBar value={share(row)} className={bar} />
                <span className="font-semibold whitespace-nowrap tabular-nums">{t("ofAnswers", { named: row.named, answers: row.answers })}</span>
                <Share k={row.named} n={row.answers} text={words.percent(row.named, row.answers)} className="hidden text-xs text-muted-foreground @3xl:inline" />
              </span>
            </td>
            <td className="hidden @lg:table-cell">
              {row.rivals.ids.length > 0 ? (
                <span className="flex items-baseline gap-2">
                  <span className="whitespace-nowrap tabular-nums">{t("ofAnswers", { named: row.rivals.value, answers: row.answers })}</span>
                  <span className="min-w-0 text-xs text-pretty text-muted-foreground">{rivals}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{t("noRival")}</span>
              )}
            </td>
            <td>
              <span className={cn("inline-block rounded-[3px] border px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap", TAG[standing])}>{t(`standings.${standing}`)}</span>
            </td>
          </tr>
        );
      })}
    </ReportTable>
  );
}
