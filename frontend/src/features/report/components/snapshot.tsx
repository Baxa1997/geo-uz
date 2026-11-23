import { LockSimpleIcon as Lock } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Logo } from "@/shared/components/logo";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { Brand, SnapshotResponse } from "@/shared/types/api";
import { AuditRequest } from "./audit-request";
import { CopyDigest } from "./copy-digest";
import { BlockTitle, ReportCard, ReportPaper } from "./report-parts";
import { ShelfStatus, WhoAppeared } from "./shelf-status";
import { TopFinding } from "./top-finding";

/**
 * The Free Snapshot (report spec §4.14, Phase 0 item 0.8): the free first check on one page, for a business that
 * hasn't paid. What was asked and that it is a single run; who holds each buyer question; every business the
 * answers named, with its count; the top finding with its answers; what the paid First Audit adds, locked; a
 * request for it; and the Telegram digest to send with the link. Every number from the check's data object.
 */
export function Snapshot({ snapshot, firstRunId }: { snapshot: SnapshotResponse; firstRunId: string }) {
  const t = useTranslations("Report.snapshot");
  const engines = useTranslations("Engines");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { wave, metrics } = snapshot;
  const { scope, shelf, sources, claims } = metrics;
  const project = wave.project;
  const brands: Brand[] = [project.brand, ...project.competitors].map((brand) => ({ id: brand.id, name: brand.name, aliases: brand.aliases, domain: brand.domains[0] ?? "" }));
  const questions = shelf.questions.length;
  const byEngine = scope.engines.map((engine) => t("engineAnswers", { engine: engine.engine === "chatgpt" || engine.engine === "gemini" ? engines(engine.engine) : engine.engine, answers: engine.completed })).join(" + ");

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
        <ShelfStatus wave={snapshot} />
      </section>

      <section className="flex flex-col gap-2 print:break-inside-avoid">
        <BlockTitle>{t("whoTitle")}</BlockTitle>
        <WhoAppeared wave={snapshot} />
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
