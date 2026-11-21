import { useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { AnswerMarkdown } from "@/shared/components/scores/answer-viewer";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { Brand, Wave } from "@/shared/types/api";
import { answerAnchor, answerLabels, excerptOf, orderedAnswers, type WaveAnswer } from "../helpers/evidence";
import { AnswersCsv } from "./answers-csv";

/**
 * One buyer answer as evidence (report spec rule 3, §4.13, Phase 0 item 0.5): its number, the assistant and
 * model, the date and whether it searched the web; the question word for word with its language; the whole
 * answer with the tracked brands highlighted (the client's in its own color); every page it cites, as links.
 * `anchor` gives it the place a finding links to: only the evidence section's copy has it. With several runs
 * (Phase 0 item 0.6) it says which run it is; `paperBeginning` prints only its beginning on paper (the whole of
 * it stays on the screen and in the CSV).
 */
export function AnswerCard({
  answer,
  number,
  question,
  brands,
  youId,
  anchor = true,
  runs = 1,
  paperBeginning = false,
}: {
  answer: WaveAnswer;
  number: number;
  /** The question it answers, when the card stands away from it. */
  question?: { text: string; lang: string };
  brands: Brand[];
  youId: string;
  anchor?: boolean;
  /** The check's runs of each question: above one, the card says which run it is. */
  runs?: number;
  paperBeginning?: boolean;
}) {
  const t = useTranslations("Report.evidence");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const engine = answer.engine === "chatgpt" || answer.engine === "gemini" ? engines(answer.engine) : answer.engine;

  return (
    <article
      id={anchor ? answerAnchor(answer.id) : undefined}
      data-answer={answer.id}
      data-engine={answer.engine}
      data-date={answer.collected_at}
      className="flex scroll-mt-4 flex-col gap-2 border-l-2 border-foreground/20 pl-3"
    >
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground print:break-after-avoid">
        <span className="font-semibold text-foreground tabular-nums">A{number}</span>
        <span aria-hidden>·</span>
        <span>{answer.model ? t("engineModel", { engine, model: answer.model }) : engine}</span>
        {runs > 1 && (
          <>
            <span aria-hidden>·</span>
            <span>{t("runOf", { run: answer.run_index, runs })}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{formatLongDate(answer.collected_at, locale, timeZone)}</span>
        <span aria-hidden>·</span>
        <span>{t(answer.searched ? "searched" : "notSearched")}</span>
      </p>
      {question && (
        <p className="text-sm font-medium text-pretty">
          “{question.text}” <span className="text-xs font-normal text-muted-foreground uppercase">{question.lang}</span>
        </p>
      )}
      {/* Word for word: the assistant's own words and numbers, none of them the report's. On paper in a smaller
          type and two columns, so every answer prints in full without the PDF running to dozens of pages */}
      {paperBeginning && (
        <p data-verbatim className="hidden text-[9.5px] leading-snug text-pretty print:block">
          {excerptOf(answer.text, [], 420)} <span className="text-muted-foreground">{t("beginningNote")}</span>
        </p>
      )}
      <div
        data-verbatim
        className={cn(paperBeginning && "print:hidden", "print:columns-2 print:gap-6 print:[&_.prose]:text-[9.5px] print:[&_.prose]:leading-snug print:[&_.prose_:is(h1,h2,h3,h4)]:my-[0.6em] print:[&_.prose_:is(h1,h2,h3,h4)]:text-[10.5px] print:[&_.prose_hr]:my-[0.8em]")}
      >
        <AnswerMarkdown answer={answer} brands={brands} youId={youId} />
      </div>
      <div className={cn("flex flex-col gap-1 text-xs print:text-[9px]", paperBeginning && "print:hidden")}>
        <span className="font-medium">{t("cited", { count: answer.citations.length })}</span>
        {answer.citations.length === 0 ? (
          <span className="text-muted-foreground">{t("noCitations")}</span>
        ) : (
          <ol className="flex list-decimal flex-col gap-0.5 pl-4 text-muted-foreground print:block print:columns-2 print:gap-6">
            {answer.citations.map((citation, index) => (
              <li key={`${citation.url}-${index}`} className="wrap-anywhere">
                <a href={citation.url} target="_blank" rel="noopener noreferrer nofollow" className="underline-offset-2 hover:text-foreground hover:underline">
                  {citation.title || citation.url}
                </a>
                {citation.title && <span className="hidden print:inline"> ({citation.url})</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}

/** "Evidence: A3, A7": the answers behind a finding, each a link to it in the evidence section. */
export function EvidenceLinks({ ids, numbers }: { ids: string[]; numbers: Map<string, number> }) {
  const t = useTranslations("Report.evidence");
  const known = ids.filter((id) => numbers.has(id)).sort((a, b) => (numbers.get(a) ?? 0) - (numbers.get(b) ?? 0));
  if (known.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 text-muted-foreground">
      {t("evidence")}
      {known.map((id, index) => (
        <span key={id}>
          <a href={`#${answerAnchor(id)}`} className="font-medium tabular-nums underline-offset-4 hover:text-foreground hover:underline">
            {answerLabels([id], numbers)}
          </a>
          {index < known.length - 1 && ","}
        </span>
      ))}
    </span>
  );
}

/**
 * The evidence appendix (spec §4.13): every buyer answer of the check in full, word for word, under its
 * question, numbered as the findings name them, on the screen and on paper alike (the user, 21 Nov 2026: "Full
 * answers in the PDF"); and the answers as a CSV. The brand questions' answers are the brand facts check's.
 * With several runs (0.6) the paper prints in full only the questions where the client or a tracked competitor
 * is named (the top finding's among them), and the others by their beginning (the user, 21 Nov 2026: "Full for
 * key questions"): all of them stay whole on the screen and in the CSV.
 */
export function Evidence({ wave, brands, youId }: { wave: Wave; brands: Brand[]; youId: string }) {
  const t = useTranslations("Report.evidence");
  const messages = useMessages();
  const answers = orderedAnswers(wave);
  const numbers = new Map(answers.map((answer, index) => [answer.id, index + 1]));
  const questions = wave.prompts.filter((prompt) => prompt.group === "discovery" && answers.some((answer) => answer.prompt_id === prompt.id));
  const runs = wave.wave.runs_per_prompt;
  const tracked = new Set(brands.map((brand) => brand.id));
  // The questions printed in full on paper when there are several runs: a tracked business is named in an answer
  const key = new Set(answers.filter((answer) => answer.mentions.some((mention) => mention.brand_id !== null && tracked.has(mention.brand_id))).map((answer) => answer.prompt_id));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-pretty text-muted-foreground">
          {t("count", { answers: answers.length, questions: questions.length })}
          {runs > 1 && <span className="hidden print:inline"> {t("paperKey")}</span>}
        </p>
        <AnswersCsv wave={wave} brands={brands} youId={youId} />
      </div>
      {questions.map((prompt) => {
        const theirs = answers.filter((answer) => answer.prompt_id === prompt.id);
        return (
          <section key={prompt.id} className="flex flex-col gap-3">
            <h3 className="flex flex-col gap-0.5 border-b pb-1.5 print:break-after-avoid">
              <span className="text-sm font-semibold text-pretty">“{prompt.text}”</span>
              <span className="text-xs font-normal text-muted-foreground">
                {[prompt.lang.toUpperCase(), prompt.topic ? labelFor(messages.Topics as Record<string, string>, prompt.topic) : null, t("answersOf", { answers: answerLabels(theirs.map((answer) => answer.id), numbers) })]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </h3>
            {theirs.map((answer) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                number={numbers.get(answer.id) ?? 0}
                brands={brands}
                youId={youId}
                runs={runs}
                paperBeginning={runs > 1 && !key.has(prompt.id)}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
