import { useTranslations } from "next-intl";
import { useCountWords } from "@/shared/hooks/use-count-words";
import type { ShelfStatus as Status, WaveResponse } from "@/shared/types/api";
import { ReportCard, Share } from "./report-parts";

/** Who holds a question, in the order they are listed, each with its color. */
export const SHELF: { status: Status; color: string }[] = [
  { status: "competitor", color: "var(--rival-strong)" },
  { status: "shared", color: "var(--source-directory)" },
  { status: "client", color: "var(--you)" },
  { status: "open", color: "var(--rival-soft)" },
];
const COLOR = Object.fromEntries(SHELF.map(({ status, color }) => [status, color])) as Record<Status, string>;
/** The untracked businesses listed after every tracked brand; the rest are counted under them. */
const OTHERS_SHOWN = 8;

/**
 * Who holds each buyer question (report spec rule 8, §4.1's shelf status bar): the counts as one bar and a legend,
 * then, with `list`, every question with its dot. The Free Snapshot and the report's decision page share it (23 Nov
 * 2026: the decision page, Phase 1, at the user's "Build research + decision page").
 */
export function ShelfStatus({ wave, list = true }: { wave: WaveResponse; list?: boolean }) {
  const t = useTranslations("Report.snapshot");
  const { shelf } = wave.metrics;
  const prompts = new Map(wave.wave.prompts.map((prompt) => [prompt.id, prompt]));
  const questions = shelf.questions.length;
  return (
    <ReportCard className="flex flex-col gap-3 p-4 print:gap-2 print:p-3">
      <div role="img" aria-label={SHELF.map(({ status }) => `${t(`shelf.${status}`)}: ${shelf.counts[status]}`).join(", ")} className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {SHELF.filter(({ status }) => shelf.counts[status] > 0).map(({ status, color }) => (
          <span key={status} className="h-full min-w-1 ring-1 ring-border ring-inset" style={{ width: `${(shelf.counts[status] / Math.max(questions, 1)) * 100}%`, background: color }} />
        ))}
      </div>
      <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 print:grid-cols-2 print:gap-y-0.5 print:text-xs">
        {SHELF.map(({ status, color }) => (
          <li key={status} className="flex items-baseline gap-2">
            <span aria-hidden className="size-2.5 shrink-0 translate-y-px rounded-[3px] ring-1 ring-border ring-inset" style={{ background: color }} />
            <span className="min-w-0 flex-1">{t(`shelf.${status}`)}</span>
            <Share k={shelf.counts[status]} n={questions} text={t("questionsOf", { count: shelf.counts[status], total: questions })} className="font-semibold" />
          </li>
        ))}
      </ul>
      {list && (
        <ol className="flex flex-col divide-y border-t text-sm print:block print:columns-2 print:gap-6 print:divide-y-0 print:pt-1.5">
          {shelf.questions.map((row) => (
            <li key={row.prompt_id} className="flex items-baseline gap-2 py-1.5 print:break-inside-avoid print:py-0.5 print:text-[10.5px]">
              <span aria-hidden className="size-2 shrink-0 translate-y-[-1px] rounded-full ring-1 ring-border ring-inset" style={{ background: COLOR[row.status] }} />
              <span className="min-w-0 flex-1 text-pretty">“{prompts.get(row.prompt_id)?.text}”</span>
              {/* On a phone and on paper the dot says it, against the legend above */}
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline print:hidden">{t(`shelf.${row.status}`)}</span>
              <span className="sr-only sm:hidden">{t(`shelf.${row.status}`)}</span>
            </li>
          ))}
        </ol>
      )}
    </ReportCard>
  );
}

/**
 * Every business the answers named, with its count of answers (spec rule 7): every tracked brand, the client first,
 * 0 too, then the others the answers named most, marked "unverified" (they are as the answers wrote them). The Free
 * Snapshot, the report's decision page and its competitors share it.
 */
export function WhoAppeared({ wave, othersOnly = false }: { wave: WaveResponse; othersOnly?: boolean }) {
  const t = useTranslations("Report.snapshot");
  const words = useCountWords();
  const { providers } = wave.metrics;
  const project = wave.wave.project;
  const counted = new Map(providers.rows.map((row) => [row.key, row.answers]));
  const trackedRows = [{ ...project.brand, own: true }, ...project.competitors.map((brand) => ({ ...brand, own: false }))].map((brand) => ({ key: brand.id, name: brand.name, tracked: true, own: brand.own, answers: counted.get(brand.id) ?? 0 }));
  const others = providers.rows.filter((row) => !row.tracked);
  const shown = [...(othersOnly ? [] : trackedRows), ...others.slice(0, OTHERS_SHOWN)];
  return (
    <ReportCard className="flex flex-col p-4 text-sm print:p-3 print:text-xs">
      {shown.length === 0 ? (
        <p className="text-muted-foreground">{t(othersOnly ? "noOthers" : "nobodyNamed")}</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 print:grid-cols-2 print:gap-y-0.5">
          {shown.map((row) => (
            <li key={row.key} className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground print:text-[10px]">{t(row.own ? "you" : row.tracked ? "tracked" : "unverified")}</span>
              <Share k={row.answers} n={providers.answers} text={words.fraction(row.answers, providers.answers)} className="shrink-0 font-semibold" />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-pretty text-muted-foreground print:mt-1.5 print:text-[10px]">
        {others.length > OTHERS_SHOWN && `${t("more", { count: others.length - OTHERS_SHOWN })} `}
        {t("whoNote", { answers: providers.answers })}
      </p>
    </ReportCard>
  );
}
