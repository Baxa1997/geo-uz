import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { useCountWords } from "@/shared/hooks/use-count-words";
import type { Brand, WaveResponse } from "@/shared/types/api";
import { sectionNumber } from "../constants";
import { answerLabels, answerNumbers, excerptOf } from "../helpers/evidence";
import { AnswerCard } from "./evidence";
import { BlockTitle, ReportCard } from "./report-parts";

/**
 * The report's top finding (spec §4.1, §4.14, Phase 0 item 0.5), computed by the backend (`metrics.top_finding`):
 * one buyer question with who appeared in its answers and whether the client did, each answer by its assistant,
 * date and a passage word for word, and "Open evidence" with the whole answers and their cited pages. On paper it
 * can't open: it points to the answers in the evidence section. With no tracked business named anywhere, the
 * open shelf.
 */
export function TopFinding({
  wave,
  brands,
  youId,
  paperNote,
}: {
  wave: WaveResponse;
  brands: Brand[];
  youId: string;
  /** What the paper says of the whole answers; the report's own evidence section when not given. */
  paperNote?: string;
}) {
  const t = useTranslations("Report.topFinding");
  const engines = useTranslations("Engines");
  const words = useCountWords();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const found = wave.metrics.top_finding;
  if (!found) return null;
  const client = brands.find((brand) => brand.id === youId);

  if (found.kind === "open" || !found.prompt_id) {
    return (
      <div data-block="top-finding" className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("title")}</BlockTitle>
        <ReportCard className="p-4 text-sm text-pretty">{t("open")}</ReportCard>
      </div>
    );
  }

  const prompt = wave.wave.prompts.find((candidate) => candidate.id === found.prompt_id);
  const byId = new Map(wave.wave.answers.map((answer) => [answer.id, answer]));
  const answers = found.answers.flatMap((id) => (byId.has(id) ? [byId.get(id) as (typeof wave.wave.answers)[number]] : []));
  const numbers = answerNumbers(wave.wave);
  const named = found.named.flatMap((id) => brands.filter((brand) => brand.id === id));
  const spellings = [...named, ...(client ? [client] : [])].flatMap((brand) => [brand.name, ...brand.aliases]);
  const engineName = (engine: string) => (engine === "chatgpt" || engine === "gemini" ? engines(engine) : engine);
  const brand = client?.name ?? "";
  const who =
    found.kind === "competitor"
      ? t("competitor", { names: words.names(named.map((rival) => rival.name)), brand })
      : found.kind === "shared"
        ? t("shared", { names: words.names(named.map((rival) => rival.name)), brand, named: found.client_named, answers: found.of })
        : t("client", { brand, named: found.client_named, answers: found.of });

  return (
    <div data-block="top-finding" className="flex flex-col gap-2">
      <BlockTitle>{t("title")}</BlockTitle>
      <ReportCard className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-pretty">
            “{prompt?.text}”{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {t("meta", { lang: (prompt?.lang ?? "").toUpperCase(), answers: found.of })}
            </span>
          </p>
          <p className="text-sm text-pretty">{who}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {answers.map((answer) => (
            <li key={answer.id} className="flex flex-col gap-0.5 border-l-2 border-foreground/20 pl-3 text-sm print:break-inside-avoid">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">A{numbers.get(answer.id)}</span> · {engineName(answer.engine)}
                {wave.wave.wave.runs_per_prompt > 1 && ` · ${t("runOf", { run: answer.run_index, runs: wave.wave.wave.runs_per_prompt })}`} ·{" "}
                {formatLongDate(answer.collected_at, locale, timeZone)} ·{" "}
                {t("cited", { count: answer.citations.length })}
              </span>
              <span data-verbatim className="text-pretty print:line-clamp-2">
                {excerptOf(answer.text, spellings)}
              </span>
            </li>
          ))}
        </ul>
        {/* The whole answers: opened on the screen; on paper the evidence section holds them */}
        <details className="group print:hidden">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
            {t("openEvidence")}
            <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            {answers.map((answer) => (
              <AnswerCard key={answer.id} answer={answer} number={numbers.get(answer.id) ?? 0} brands={brands} youId={youId} anchor={false} runs={wave.wave.wave.runs_per_prompt} />
            ))}
          </div>
        </details>
        <p className="hidden text-xs text-pretty text-muted-foreground print:block">
          {paperNote ?? t("printNote", { answers: answerLabels(found.answers, numbers), section: sectionNumber("evidence") })}
        </p>
      </ReportCard>
    </div>
  );
}
