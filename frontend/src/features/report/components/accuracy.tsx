import { CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { scoreOf } from "@/shared/helpers/scores";
import type { Report, Tone } from "@/shared/types/api";
import { BlockTitle, ReportCard } from "./report-parts";

/** The three tones in the bar's order, each in its color. */
const TONES: { tone: Tone; color: string }[] = [
  { tone: "positive", color: "var(--positive)" },
  { tone: "neutral", color: "var(--rival)" },
  { tone: "negative", color: "var(--negative)" },
];

/**
 * How ChatGPT speaks of the client and whether it is true. First the tone: its score out of 100 and how
 * the client's mentions split into positive, neutral and negative, as one bar with its counts. Then what
 * ChatGPT says that isn't true: each wrong statement beside the correct one, with the question it came up
 * in and since when. None found is said in a sentence, with a mark.
 */
export function Accuracy({ report }: { report: Report }) {
  const t = useTranslations("Report.accuracy");
  const tones = useTranslations("Tone");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { brand } = report.project;
  const questionOf = (id: string) => report.prompts.find((result) => result.prompt.id === id)?.prompt.text;
  const sentiment = scoreOf(report.scores, brand.id)?.sentiment ?? null;
  const mentions = report.prompts.flatMap((result) => result.answers.flatMap((answer) => answer.mentions.filter((mention) => mention.brandId === brand.id)));
  const split = TONES.map(({ tone, color }) => ({ tone, color, count: mentions.filter((mention) => mention.tone === tone).length })).filter((part) => part.count > 0);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("toneTitle")}</BlockTitle>
        {sentiment === null || mentions.length === 0 ? (
          <p className="text-sm text-pretty text-muted-foreground">{t("toneNone")}</p>
        ) : (
          <ReportCard className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
            <p className="flex items-baseline gap-1.5">
              <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{Math.round(sentiment)}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </p>
            <div className="flex min-w-0 flex-1 basis-72 flex-col gap-2">
              <p className="text-sm text-pretty text-muted-foreground">{t("toneOf", { count: mentions.length })}</p>
              <div
                role="img"
                aria-label={split.map((part) => `${tones(part.tone)}: ${part.count}`).join(", ")}
                className="flex h-3 gap-0.5 overflow-hidden rounded-full"
              >
                {split.map((part) => (
                  <span key={part.tone} className="h-full min-w-1" style={{ width: `${(part.count / mentions.length) * 100}%`, background: part.color }} />
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {split.map((part) => (
                  <li key={part.tone} className="flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: part.color }} />
                    {tones(part.tone)}
                    <span className="font-semibold tabular-nums">{part.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ReportCard>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <BlockTitle count={report.wrongFacts.length > 0 ? report.wrongFacts.length : undefined}>{t("factsTitle")}</BlockTitle>
        {report.wrongFacts.length === 0 ? (
          <p className="flex items-start gap-2 text-sm">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
            {t("none")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {report.wrongFacts.map((fact) => {
              const question = questionOf(fact.promptId);
              return (
                <li key={`${fact.promptId}-${fact.claim}`} className="print:break-inside-avoid">
                  <ReportCard className="flex flex-col">
                    <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2 print:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-negative" />
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{t("says")}</dt>
                          <dd className="font-medium text-pretty">{fact.claim}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{t("correct")}</dt>
                          <dd className="text-pretty">{fact.correct}</dd>
                        </div>
                      </div>
                    </dl>
                    <p className="border-t px-4 py-2 text-xs text-pretty text-muted-foreground">
                      {question && (
                        <>
                          {t("question")}: <span className="text-foreground">{question}</span> ·{" "}
                        </>
                      )}
                      {t("since")}: {formatLongDate(fact.foundAt, locale, timeZone)}
                    </p>
                  </ReportCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
