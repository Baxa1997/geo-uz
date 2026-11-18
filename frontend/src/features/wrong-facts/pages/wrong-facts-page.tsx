import type { Metadata } from "next";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { FilteredEmpty } from "@/shared/components/filtered-empty";
import { NoData } from "@/shared/components/no-data";
import { Page } from "@/shared/components/page";
import { PageSection } from "@/shared/components/page-section";
import { ReportFilterBar } from "@/shared/components/report-filter-bar";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { Link } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { loadReport } from "@/shared/api/load-report";
import { hasFilters, withFilters } from "@/shared/helpers/report-filters";
import { AccuracySummary } from "../components/accuracy-summary";
import { StatementGroups } from "../components/statement-groups";
import { WrongFactCard } from "../components/wrong-fact-card";
import { knownBy, statementsOf } from "../helpers/statements";

type Props = PageProps<"/[locale]/projects/[id]/wrong-facts">;

const getProject = cache((id: string) => orNotFound(api.getProject(id)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, t] = await Promise.all([getProject(id), getTranslations({ locale, namespace: "Sidebar" })]);
  return { title: `${t("wrongFacts")} — ${project.brand.name}` };
}

/** Statements shown before "Show all": the ones to check open longer than the ones that are right. */
const UNVERIFIED_SHOWN = 8;
const CONFIRMED_SHOWN = 4;

/**
 * What AI says about the business and how much of it is true (the user, 17 Nov 2026: "wrong facts need to be
 * fixed too … this part must be analyzed carefully"; until then three numbers and a table of the wrong ones,
 * and "not checked yet" whenever the owner had typed no facts, though the brand answers had been checked
 * against the website). Now, from the latest check: the summary (everything the assistants said, as one bar by
 * how it stands against the website; whether each knows the business; what it was checked against), then the
 * wrong statements, each with the truth and its fix; then what AI says that the website doesn't (to check);
 * then what it gets right, folded. A statement said by several answers or assistants is shown once.
 */
export default async function WrongFactsPage({ params, searchParams }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [{ report, prompts, filters, topics }, actions, facts, t, tFacts] = await Promise.all([
    loadReport(id, await searchParams),
    orNotFound(api.getActions(id)),
    // Who hasn't typed any facts gets none, and the page says what it was checked against
    api.getFacts(id).catch(() => [] as string[]),
    getTranslations({ locale, namespace: "Sidebar" }),
    getTranslations({ locale, namespace: "WrongFactsPage" }),
  ]);
  const base = `/projects/${report.project.id}`;

  if (report.prompts.length === 0) {
    return (
      <Page title={t("wrongFacts")} engines={report.engines ?? true} toolbar={hasFilters(filters) && <ReportFilterBar topics={topics} />}>
        {hasFilters(filters) ? <FilteredEmpty resetHref={`${base}/wrong-facts`} /> : <NoData projectId={report.project.id} promptCount={prompts.length} />}
      </Page>
    );
  }

  const views = report.brandView ?? [];
  const statements = statementsOf(views, locale as "uz" | "ru" | "en");
  const unverified = statements.filter((statement) => statement.check === "unverified");
  const confirmed = statements.filter((statement) => statement.check === "confirmed");
  const wrong = report.wrongFacts;
  // Checked: the brand answers were read against the website, or the answers against the owner's facts
  const checked = views.length > 0 || report.factsChecked !== false;
  const factsHref = `${base}/settings/facts`;
  const fixOf = (claim: string) => actions.find((action) => action.kind === "fact" && action.claim === claim);
  const questionOf = (promptId: string) => report.prompts.find((result) => result.prompt.id === promptId)?.prompt.text ?? null;

  return (
    <Page title={t("wrongFacts")} engines={report.engines ?? true} tour="wrongFacts" toolbar={<ReportFilterBar topics={topics} />}>
      <div className="flex flex-col gap-8 sm:gap-10">
        {checked ? (
          <AccuracySummary
            brand={report.project.brand.name}
            counts={{ wrong: wrong.length, unverified: unverified.length, confirmed: confirmed.length }}
            known={knownBy(views)}
            facts={facts.length}
            factsHref={factsHref}
          />
        ) : (
          <section data-tour="summary" className="flex flex-col gap-3 rounded-xl border border-dashed p-4 text-sm text-pretty sm:p-5">
            <p>{tFacts("notChecked")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href={`${base}/settings/brand-questions`} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
                {tFacts("brandQuestionsLink")}
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
              <Link href={factsHref} className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
                {tFacts("summary.addFacts")}
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
          </section>
        )}

        {checked && (
          <PageSection tour="wrong" title={tFacts("wrong.title")} description={tFacts("wrong.text")}>
            {wrong.length === 0 ? (
              <p className="rounded-xl bg-card px-4 py-4 text-sm text-pretty ring-1 ring-foreground/10 sm:px-5">{tFacts("wrong.none")}</p>
            ) : (
              <ul className="@container flex flex-col gap-3">
                {wrong.map((fact) => {
                  const fix = fixOf(fact.claim);
                  return (
                    <WrongFactCard
                      key={`${fact.promptId}-${fact.claim}`}
                      fact={fact}
                      question={fact.promptId ? questionOf(fact.promptId) : null}
                      answersHref={fact.promptId ? withFilters(`${base}/answers`, filters, { prompt: fact.promptId }) : null}
                      fixHref={fix ? `${base}/actions?action=${encodeURIComponent(fix.id)}` : `${base}/actions`}
                    />
                  );
                })}
              </ul>
            )}
          </PageSection>
        )}

        {views.length > 0 ? (
          <>
            {unverified.length > 0 && (
              <PageSection
                tour="unverified"
                title={tFacts("unverified.title")}
                description={tFacts("unverified.text")}
                actions={
                  <Link href={factsHref} className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                    {tFacts("unverified.addFacts")}
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                }
              >
                <div className="@container">
                  <StatementGroups statements={unverified} kind="unverified" shown={UNVERIFIED_SHOWN} />
                </div>
              </PageSection>
            )}
            {confirmed.length > 0 && (
              <PageSection tour="confirmed" title={tFacts("confirmed.title")} description={tFacts("confirmed.text")}>
                <div className="@container">
                  <StatementGroups statements={confirmed} kind="confirmed" shown={CONFIRMED_SHOWN} />
                </div>
              </PageSection>
            )}
          </>
        ) : (
          checked && (
            <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-pretty text-muted-foreground">
              {tFacts("noBrandAnswers")}{" "}
              <Link href={`${base}/settings/brand-questions`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {tFacts("brandQuestionsLink")}
              </Link>
            </p>
          )
        )}

        <MethodLabel method={report.method} />
      </div>
    </Page>
  );
}
