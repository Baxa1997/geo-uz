import { ArrowSquareOutIcon as ExternalLink } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { useLocale, useTranslations } from "next-intl";
import type { PromptLanguage, Report, ResearchFinding } from "@/shared/types/api";
import { ReportCard } from "./report-parts";

/** The interface languages, which a finding's facts are written in. */
const LANGUAGES = ["uz", "ru", "en"] as const;

/** The compared findings first, in the check's order; the ones with nothing to compare after them. */
export const researchOrder = (findings: ResearchFinding[]) => [...findings.filter((finding) => finding.status === "compared"), ...findings.filter((finding) => finding.status !== "compared")];

/** A finding's questions shown: the report may be narrowed to a language or a topic. */
export const researchShown = (report: Report) => {
  const shown = new Set(report.prompts.map((result) => result.prompt.id));
  return report.research ? report.research.filter((finding) => shown.has(finding.promptId)) : null;
};

/**
 * Why AI names them, not you (report spec §4.5, the win–loss view; Phase 1, built on 23 Nov 2026 at the user's "Build
 * research + decision page"): for each question where the answers named other businesses and never the client, the
 * business named and the sentence the answer said about it, the page it cited for it beside the client's closest
 * page, what that page states and the client's doesn't (each with the page's own words), and a section the client
 * could put on its page, its unknown figures left as blanks. Every finding is `automated`: the report says so.
 */
export function Research({ report }: { report: Report }) {
  const t = useTranslations("Report.research");
  const findings = researchShown(report);
  if (findings === null) return <p className="text-sm text-pretty text-muted-foreground">{t("notYet")}</p>;
  if (findings.length === 0) return <p className="text-sm text-pretty text-muted-foreground">{t("none")}</p>;
  const compared = findings.filter((finding) => finding.status === "compared");
  const facts = compared.reduce((sum, finding) => sum + (finding.missing?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-pretty">{t("summary", { compared: compared.length, lost: findings.length, facts })}</p>
      <ol className="flex flex-col gap-3">
        {researchOrder(findings).map((finding, index) => (
          <li key={finding.promptId} className="print:break-inside-avoid">
            <FindingCard finding={finding} number={index + 1} />
          </li>
        ))}
      </ol>
      <p className="text-xs text-pretty text-muted-foreground">{t("automated")}</p>
    </div>
  );
}

function FindingCard({ finding, number }: { finding: ResearchFinding; number: number }) {
  const t = useTranslations("Report.research");
  const locale = useLocale();
  const language = (LANGUAGES as readonly string[]).includes(locale) ? (locale as PromptLanguage) : "en";
  const missing = finding.missing ?? [];

  return (
    <ReportCard className="flex flex-col gap-3 p-4 text-sm print:gap-2 print:p-3">
      <p className="flex items-baseline gap-2">
        <span className="shrink-0 font-semibold text-muted-foreground tabular-nums">{number}.</span>
        <span className="min-w-0 flex-1 font-medium text-pretty">“{finding.question}”</span>
        <span className="shrink-0 rounded-[3px] border px-1.5 text-[0.6875rem] font-medium text-muted-foreground uppercase">{finding.language}</span>
      </p>

      <div className="flex flex-col gap-1">
        <Label>{t("named", { rival: finding.rival.name })}</Label>
        {finding.sentence ? <Quote>{finding.sentence}</Quote> : <p className="text-muted-foreground">{t("noSentence")}</p>}
      </div>

      {finding.status !== "compared" ? (
        <p className="rounded-[3px] bg-muted px-3 py-2 text-pretty text-muted-foreground">{t(`status.${finding.status}`, { rival: finding.rival.name })}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Label>{t("theirPage", { rival: finding.rival.name })}</Label>
              {finding.page && <PageLink url={finding.page.url} title={finding.page.title} />}
              {finding.theirPassage && <Quote>{finding.theirPassage}</Quote>}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label>{t("yourPage")}</Label>
              {finding.clientUrl ? <PageLink url={finding.clientUrl} /> : <p className="text-pretty text-muted-foreground">{t("noYourPage")}</p>}
              {finding.clientPassage && <Quote>{finding.clientPassage}</Quote>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("has", { rival: finding.rival.name })}</Label>
            {missing.length === 0 ? (
              <p className="text-pretty text-muted-foreground">{t("noGap")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {missing.map((fact) => (
                  <li key={fact.quote} className="flex flex-col gap-0.5 border-l-2 border-[var(--rival-strong)] pl-2.5">
                    <span className="font-medium text-pretty">{fact.fact[language]}</span>
                    <span className="text-xs text-pretty text-muted-foreground italic">“{fact.quote}”</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {finding.fix && (
            <div className="flex flex-col gap-1">
              <Label>{t("fix")}</Label>
              <p className="rounded-[3px] border border-dashed bg-muted/40 px-3 py-2 text-pretty whitespace-pre-line">{finding.fix}</p>
              <p className="text-xs text-pretty text-muted-foreground">{t("fixNote")}</p>
            </div>
          )}
        </>
      )}
    </ReportCard>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>;
}

function Quote({ children }: { children: React.ReactNode }) {
  return <blockquote className="border-l-2 border-border pl-2.5 text-pretty italic">“{children}”</blockquote>;
}

function PageLink({ url, title }: { url: string; title?: string | null }) {
  const address = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 font-medium underline-offset-4 hover:underline">
      <span className="truncate">{title || address}</span>
      <ExternalLink aria-hidden className="size-3.5 shrink-0 print:hidden" />
      {/* On paper the address is what a reader can type */}
      {title && <span className="hidden truncate text-xs font-normal text-muted-foreground print:inline">{address}</span>}
    </a>
  );
}
