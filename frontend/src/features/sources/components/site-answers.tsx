"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnswersList } from "@/shared/components/answers/answers-list";
import { ArrowLink } from "@/shared/components/arrow-link";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { PageSection } from "@/shared/components/page-section";
import { pathOf } from "@/shared/helpers/domain";
import { withFilters } from "@/shared/helpers/report-filters";
import type { Prompt, Report, ReportFilters, Source } from "@/shared/types/api";
import type { AnswerRow, SeriesBrand } from "@/shared/types/scores";
import { TableCard } from "./parts";

/**
 * The answers that cite a site, as the Chats tab of Peec's domain page: the section's heading, then the
 * card with a filter by the site's page, how many answers there are and a link to the Answers page (every
 * filter and the CSV are there), and the shared answers list. A row opens the answer like a chat, whose
 * bar links to the question's page. `initialPage` (`?page=`) starts with the answers citing that page.
 */
export function SiteAnswers({
  report,
  source,
  brands,
  filters,
  initialPage = "",
  answersHref,
}: {
  report: Report;
  source: Source;
  brands: SeriesBrand[];
  /** The page's language and topic filters, carried to the question's page a chat links to. */
  filters: ReportFilters;
  /** A page of the site (its address) to start with. */
  initialPage?: string;
  /** The Answers page with the answers citing this site. */
  answersHref: string;
}) {
  const t = useTranslations("SourcePage");
  const [page, setPage] = useState(() => (source.pages.some((candidate) => candidate.url === initialPage) ? initialPage : ""));
  const rows: AnswerRow[] = report.prompts.flatMap((result) =>
    result.answers.filter((answer) => answer.citations.some((citation) => citation.domain === source.domain)).map((answer) => ({ result, answer })),
  );
  const citing = (url: string) => rows.filter(({ answer }) => answer.citations.some((citation) => citation.url === url));
  const visible = page ? citing(page) : rows;
  const titleOf = (cited: { url: string; title: string | null }) => cited.title ?? (pathOf(cited.url) || source.domain);
  const questionHref = (prompt: Prompt) => withFilters(`/projects/${report.project.id}/prompts/${prompt.id}`, filters);

  return (
    <PageSection title={t("sections.answers.title")} description={t("sections.answers.description")}>
      <TableCard
        toolbar={
          <>
            {source.pages.length > 1 && (
              <FilterMenu
                icon={FileText}
                label={t("answers.pageFilter")}
                value={page}
                className="max-w-full"
                options={[
                  { value: "", label: t("answers.allPages"), count: rows.length },
                  ...source.pages.map((cited) => ({ value: cited.url, label: titleOf(cited), count: citing(cited.url).length })),
                ]}
                onChange={setPage}
              />
            )}
            <p aria-live="polite" className="px-1 text-sm text-muted-foreground tabular-nums">
              <Hint text={t("answers.countHint")}>{t("answersCount", { count: visible.length })}</Hint>
            </p>
            <span className="ml-auto px-1">
              <ArrowLink href={answersHref}>{t("answers.all")}</ArrowLink>
            </span>
          </>
        }
      >
        <AnswersList rows={visible} brands={brands} project={report.project} method={report.method} questionHref={questionHref} />
      </TableCard>
    </PageSection>
  );
}
