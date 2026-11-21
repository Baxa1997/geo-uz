import { CheckCircleIcon as CircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { Report, Tone, WaveMetrics } from "@/shared/types/api";
import { useCountWords } from "@/shared/hooks/use-count-words";
import { BlockTitle, ReportCard, ReportTable } from "./report-parts";

/** The three tones in the bar's order, each in its color. */
const TONES: { tone: Tone; color: string }[] = [
  { tone: "positive", color: "var(--positive)" },
  { tone: "neutral", color: "var(--rival)" },
  { tone: "negative", color: "var(--negative)" },
];

/** What the assistants' statements about the business came to, against its website: the spec's verdicts (§4.7). */
const VERDICTS = [
  { key: "verified", color: "text-positive" },
  { key: "contradicted", color: "text-negative" },
  { key: "unverified", color: "text-muted-foreground" },
] as const;

/**
 * Two questions, each answered in its own block (rebuilt on 16 Nov 2026; the user: "not very clear info, or
 * structure are not displayed correctly"). A: in what tone the assistants speak of the client: each mention
 * read as positive, neutral or negative and counted, the zeros too, with a word for them all only from three
 * mentions, and N/A when it isn't named (no score since 21 Nov 2026: report spec Phase 0 item 0.2). B: whether
 * what they say is true: how many statements they made when asked about the business by name and how each
 * stood against the website, then each wrong statement in a row beside what is correct and where it was
 * said. Nothing found, or nothing checked yet, is said in a sentence.
 */
export function Accuracy({ report, metrics }: { report: Report; metrics: WaveMetrics }) {
  const t = useTranslations("Report.accuracy");
  const tones = useTranslations("Tone");
  const locale = useLocale() as "uz" | "ru" | "en";
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { brand } = report.project;
  const questionOf = (id: string) => report.prompts.find((result) => result.prompt.id === id)?.prompt.text;
  const words = useCountWords();
  const client = metrics.brands.rows.find((row) => row.own);
  const tone = client?.tone ?? { mentions: 0, counts: {}, summary: null };
  const split = TONES.map(({ tone: key, color }) => ({ tone: key, color, count: tone.counts[key] ?? 0 }));
  const { claims } = metrics;
  const checked = claims.statements > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("toneTitle")}</BlockTitle>
        <p className="text-sm text-pretty text-muted-foreground">{t("toneHow", { minimum: metrics.brands.tone_summary_from })}</p>
        {!client || tone.mentions === 0 ? (
          <p className="text-sm text-pretty">
            <span className="font-semibold">{words.na}</span> · {t("toneNone")}
          </p>
        ) : (
          <ReportCard className="@container">
            <div className="flex flex-col gap-4 p-4 @lg:flex-row @lg:items-center @lg:gap-8">
              <p className="flex shrink-0 flex-col gap-0.5">
                <span className="text-lg leading-tight font-semibold text-pretty">{words.tone(client)}</span>
                <span className="text-xs text-muted-foreground">{t("toneFrom", { count: tone.mentions })}</span>
              </p>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <p className="text-sm text-pretty">{t("toneOf", { count: tone.mentions })}</p>
                <div role="img" aria-label={split.map((part) => `${tones(part.tone)}: ${part.count}`).join(", ")} className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                  {split
                    .filter((part) => part.count > 0)
                    .map((part) => (
                      <span key={part.tone} className="h-full min-w-1" style={{ width: `${(part.count / tone.mentions) * 100}%`, background: part.color }} />
                    ))}
                </div>
                <ul className="grid grid-cols-3 gap-2 text-sm">
                  {split.map((part) => (
                    <li key={part.tone} className="flex flex-col">
                      <span className="text-lg leading-tight font-semibold tabular-nums">{part.count}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: part.color }} />
                        {tones(part.tone)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ReportCard>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* The brand-question check, labelled and apart from every count of the buyers' answers (spec §4.7, Phase 0 item 0.3) */}
        <div data-block="branded" className="flex flex-col gap-2 print:break-inside-avoid">
          <BlockTitle>{t("truthTitle")}</BlockTitle>
          <p className="text-sm text-pretty text-muted-foreground">{t("truthHow", { brand: brand.name })}</p>
          <p className="w-fit rounded-[3px] border border-foreground/20 bg-muted px-2 py-0.5 text-xs font-medium text-pretty">{t("separate")}</p>
          {checked && (
            <>
              <dl className="grid grid-cols-3 gap-2">
                {VERDICTS.map((verdict) => (
                  <ReportCard key={verdict.key} className="flex flex-col gap-0.5 px-3.5 py-2.5">
                    <dd className={cn("text-2xl leading-tight font-semibold tabular-nums", verdict.color)}>
                      <span data-metric={`claims.${verdict.key}`}>{claims[verdict.key]}</span>
                    </dd>
                    <dt className="text-xs text-pretty text-muted-foreground">{t(`verdicts.${verdict.key}`)}</dt>
                  </ReportCard>
                ))}
              </dl>
              <p className="text-xs text-pretty text-muted-foreground">{t("verdictsOf", { statements: claims.statements, answers: claims.answers })}</p>
            </>
          )}
        </div>

        <BlockTitle count={report.wrongFacts.length > 0 ? report.wrongFacts.length : undefined}>{t("factsTitle")}</BlockTitle>
        {report.wrongFacts.length === 0 ? (
          <p className="flex items-start gap-2 text-sm">
            {(checked || report.factsChecked !== false) && <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />}
            {t(checked || report.factsChecked !== false ? "none" : "notChecked")}
          </p>
        ) : (
          <ReportCard className="@container">
            <ReportTable
              head={
                <>
                  <th scope="col" className="w-8">
                    #
                  </th>
                  <th scope="col">{t("says")}</th>
                  <th scope="col">{t("correct")}</th>
                  <th scope="col" className="hidden w-56 @2xl:table-cell">
                    {t("where")}
                  </th>
                </>
              }
            >
              {report.wrongFacts.map((fact, index) => {
                const question = fact.question ?? questionOf(fact.promptId);
                const where = (
                  <>
                    {fact.engine && <span className="font-medium text-foreground">{report.engines?.find((item) => item.engine === fact.engine)?.name ?? fact.engine}. </span>}
                    {question && <span>“{question}”. </span>}
                    <span className="whitespace-nowrap">
                      {t("since")}: {formatLongDate(fact.foundAt, locale, timeZone)}
                    </span>
                  </>
                );
                return (
                  <tr key={`${fact.promptId}-${fact.claim}-${index}`} className="align-top print:break-inside-avoid">
                    <th scope="row" className="text-left font-normal text-muted-foreground tabular-nums">
                      {index + 1}
                    </th>
                    <td className="border-l-2 border-l-negative/60 font-medium text-pretty">
                      {fact.texts?.claim[locale] ?? fact.claim}
                      <span className="mt-1 block text-xs font-normal text-pretty text-muted-foreground @2xl:hidden">{where}</span>
                    </td>
                    <td className="border-l-2 border-l-positive/60 text-pretty">{fact.texts?.correct[locale] ?? fact.correct}</td>
                    <td className="hidden text-xs text-pretty text-muted-foreground @2xl:table-cell">{where}</td>
                  </tr>
                );
              })}
            </ReportTable>
          </ReportCard>
        )}
      </div>
    </div>
  );
}
