import { LockSimpleIcon as Lock } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Logo } from "@/shared/components/logo";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { useCountWords } from "@/shared/hooks/use-count-words";
import type { Brand, ShelfStatus, SnapshotResponse } from "@/shared/types/api";
import { AuditRequest } from "./audit-request";
import { CopyDigest } from "./copy-digest";
import { BlockTitle, ReportCard, ReportPaper, Share } from "./report-parts";
import { TopFinding } from "./top-finding";

/** Who holds a question, in the order the snapshot lists them, each with its color. */
const SHELF: { status: ShelfStatus; color: string }[] = [
  { status: "competitor", color: "var(--rival-strong)" },
  { status: "shared", color: "var(--source-directory)" },
  { status: "client", color: "var(--you)" },
  { status: "open", color: "var(--rival-soft)" },
];
const COLOR = Object.fromEntries(SHELF.map(({ status, color }) => [status, color])) as Record<ShelfStatus, string>;
/** The untracked businesses named that the snapshot lists after every tracked brand; the rest are counted under them. */
const OTHERS_SHOWN = 8;

/**
 * The Free Snapshot (report spec §4.14, Phase 0 item 0.8): the free first check on one page, for a business that
 * hasn't paid. What was asked and that it is a single run; who holds each buyer question; every business the
 * answers named, with its count; the top finding with its answers; what the paid First Audit adds, locked; a
 * request for it; and the Telegram digest to send with the link. Every number from the check's data object.
 */
export function Snapshot({ snapshot, firstRunId }: { snapshot: SnapshotResponse; firstRunId: string }) {
  const t = useTranslations("Report.snapshot");
  const engines = useTranslations("Engines");
  const words = useCountWords();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { wave, metrics } = snapshot;
  const { scope, shelf, providers, sources, claims } = metrics;
  const project = wave.project;
  const brands: Brand[] = [project.brand, ...project.competitors].map((brand) => ({ id: brand.id, name: brand.name, aliases: brand.aliases, domain: brand.domains[0] ?? "" }));
  const prompts = new Map(wave.prompts.map((prompt) => [prompt.id, prompt]));
  const questions = shelf.questions.length;
  const byEngine = scope.engines.map((engine) => t("engineAnswers", { engine: engine.engine === "chatgpt" || engine.engine === "gemini" ? engines(engine.engine) : engine.engine, answers: engine.completed })).join(" + ");
  // Every tracked brand, the client first, each with its count (0 too: spec rule 7), then the others named most
  const counted = new Map(providers.rows.map((row) => [row.key, row.answers]));
  const trackedRows = [{ ...project.brand, own: true }, ...project.competitors.map((brand) => ({ ...brand, own: false }))].map((brand) => ({ key: brand.id, name: brand.name, tracked: true, own: brand.own, answers: counted.get(brand.id) ?? 0 }));
  const others = providers.rows.filter((row) => !row.tracked);
  const shown = [...trackedRows, ...others.slice(0, OTHERS_SHOWN)];

  // On paper one A4 sheet (spec §4.14): tighter, a little smaller, the questions in two columns
  return (
    <ReportPaper className="print:gap-3 print:text-[11px] print:[zoom:0.86]">
      <header className="flex flex-col gap-4 print:gap-2 print:break-inside-avoid">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-double border-foreground pb-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{formatLongDate(scope.wave.collected_at, locale, timeZone)}</p>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-bold tracking-[0.08em] uppercase sm:text-2xl print:text-lg">{t("title")}</h1>
          <p className="text-lg font-semibold">{project.brand.name}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {t("scope", { questions, answers: scope.slots.completed, engines: byEngine, runs: scope.runs_per_prompt })}
          </p>
        </div>
        <p data-block="single-run-note" className="rounded-[3px] border-l-4 border-foreground/40 bg-muted px-4 py-2.5 text-sm text-pretty print:py-1.5 print:text-xs">
          {t(scope.runs_per_prompt > 1 ? "runsNote" : "singleRun", { runs: scope.runs_per_prompt })}
        </p>
      </header>

      <section className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("shelfTitle")}</BlockTitle>
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
        </ReportCard>
      </section>

      <section className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("whoTitle")}</BlockTitle>
        <ReportCard className="flex flex-col p-4 text-sm print:p-3 print:text-xs">
          {shown.length === 0 ? (
            <p className="text-muted-foreground">{t("nobodyNamed")}</p>
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
      </section>

      <TopFinding wave={snapshot} brands={brands} youId={project.brand.id} paperNote={t("paperEvidence")} />

      <section className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("lockedTitle")}</BlockTitle>
        <ReportCard className="grid gap-px overflow-hidden bg-border p-0 sm:grid-cols-3 print:grid-cols-3">
          {[
            { key: "sources", text: t("locked.sources", { sites: sources.sites }) },
            { key: "facts", text: t("locked.facts", { statements: claims.statements }) },
            { key: "actions", text: t("locked.actions") },
          ].map((item) => (
            <div key={item.key} className="flex items-start gap-2.5 bg-card p-4 text-sm print:p-2.5 print:text-xs">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="text-pretty">{item.text}</span>
            </div>
          ))}
        </ReportCard>
      </section>

      <section className="flex flex-col gap-3 rounded-[3px] bg-foreground px-4 py-4 text-background sm:px-5 print:gap-1 print:break-inside-avoid print:bg-transparent print:py-2.5 print:text-foreground print:ring-1 print:ring-foreground/30">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{t("ctaTitle")}</h2>
          <p className="text-sm text-pretty opacity-80 print:hidden">{t("ctaText")}</p>
          <p className="hidden text-xs text-pretty print:block">{t("ctaPaper")}</p>
        </div>
        <div className="rounded-[3px] bg-card p-3 text-foreground print:hidden">
          <AuditRequest brand={project.brand.name} firstRunId={firstRunId} />
        </div>
      </section>

      <CopyDigest text={snapshot.digest} title={t("digestTitle")} hint={t("digestHint")} />
    </ReportPaper>
  );
}
