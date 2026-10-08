"use client";

import { FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AnswersList } from "@/shared/components/answers/answers-list";
import { ArrowLink } from "@/shared/components/arrow-link";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { pathOf } from "@/shared/helpers/domain";
import { formatPercent } from "@/shared/helpers/numbers";
import { withFilters } from "@/shared/helpers/report-filters";
import { cn } from "@/shared/helpers/utils";
import { percentIn } from "@/shared/helpers/sources";
import type { Prompt, Report, ReportFilters, Source } from "@/shared/types/api";
import type { AnswerRow, SeriesBrand } from "@/shared/types/scores";
import { ChangeMark } from "./change-mark";
import { PageCell } from "./page-cell";
import { BrandChips, Heading, Mark, Table } from "./parts";

type Tab = "pages" | "answers";
const TABS: Tab[] = ["pages", "answers"];

/**
 * A cited site's pages and the answers that cite it, as the two tabs of Peec's domain page (URLs, Chats).
 * Pages: each cited page with the brands it names, the share of answers that cite it with its change, and
 * whether it names the client; a click on a row lists the answers citing that page. Answers: the shared
 * answers list over the answers that cite the site, narrowed to one page if asked; a row opens the answer
 * like a chat, whose bar links to the question's page. `?tab=answers&page=` opens it that way.
 */
export function SourceTabs({
  report,
  source,
  brands,
  filters,
  initialTab = "pages",
  initialPage = "",
  answersHref,
}: {
  report: Report;
  source: Source;
  brands: SeriesBrand[];
  /** The page's language and topic filters, carried to the question's page a chat links to. */
  filters: ReportFilters;
  initialTab?: Tab;
  /** A page of the site (its address) to start the answers with. */
  initialPage?: string;
  /** The Answers page with the answers citing this site: every filter and the CSV are there. */
  answersHref: string;
}) {
  const t = useTranslations("SourcePage");
  const sources = useTranslations("SourcesPage");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [page, setPage] = useState(() => (source.pages.some((candidate) => candidate.url === initialPage) ? initialPage : ""));

  const youId = report.project.brand.id;
  const brandSite = source.type === "own" || source.type === "competitor";
  const rows: AnswerRow[] = report.prompts.flatMap((result) =>
    result.answers.filter((answer) => answer.citations.some((citation) => citation.domain === source.domain)).map((answer) => ({ result, answer })),
  );
  const visible = page ? rows.filter(({ answer }) => answer.citations.some((citation) => citation.url === page)) : rows;
  const counts: Record<Tab, number> = { pages: source.pages.length, answers: rows.length };
  const latest = report.sourceHistory.at(-1);
  const previous = report.sourceHistory.at(-2);
  const namedOn = (mentions: string[] | null) => brands.filter((brand) => mentions?.includes(brand.id));
  const titleOf = (cited: { url: string; title: string | null }) => cited.title ?? (pathOf(cited.url) || source.domain);
  const questionHref = (prompt: Prompt) => withFilters(`/projects/${report.project.id}/prompts/${prompt.id}`, filters);

  function open(next: Tab, url = "") {
    setTab(next);
    setPage(url);
  }

  return (
    <section aria-label={t("tabsLabel")} className="@container overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div role="group" aria-label={t("tabsLabel")} className="flex gap-5 overflow-x-auto border-b px-4">
        {TABS.map((option) => (
          <Hint key={option} text={t(`tabHints.${option}`)} side="bottom" className="shrink-0">
            {(describedBy) => (
              <button
                type="button"
                aria-pressed={tab === option}
                aria-describedby={describedBy}
                onClick={() => open(option)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 py-3.5 text-sm transition-colors",
                  tab === option ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tabs.${option}`)}
                <span className="text-xs tabular-nums opacity-70">{counts[option]}</span>
              </button>
            )}
          </Hint>
        ))}
      </div>

      {tab === "pages" && (
        <Table
          empty={null}
          head={
            <>
              <Heading label={sources("columns.page")} hint={t("pages.hint")} className="pl-4" />
              <Heading label={sources("columns.named")} hint={sources("hints.named")} className="hidden w-44 px-3 @2xl:table-cell" />
              <Heading label={sources("columns.used")} hint={t("pages.usedHint")} className="w-28 px-3" />
              <Heading label={sources("columns.you")} hint={sources("hints.you")} className="hidden w-32 pr-4 pl-3 @lg:table-cell" />
            </>
          }
        >
          {source.pages.map((cited) => (
            <tr
              key={cited.url}
              // The whole row lists the answers citing the page; the title's button is the way in for the keyboard
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button")) return;
                open("answers", cited.url);
              }}
              className="cursor-pointer transition-colors hover:bg-muted/40"
            >
              <th scope="row" className="py-2.5 pl-4 text-left font-medium">
                <PageCell page={cited} domain={source.domain} onOpen={() => open("answers", cited.url)} />
              </th>
              <td className="hidden px-3 py-2.5 @2xl:table-cell">
                <BrandChips brands={brandSite ? [] : namedOn(cited.mentions)} />
              </td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium tabular-nums">
                  {formatPercent(latest && latest.answers > 0 ? cited.count / latest.answers : 0, locale)}
                  {previous && <ChangeMark now={percentIn(latest, source.domain, cited.url)} before={percentIn(previous, source.domain, cited.url)} />}
                </span>
              </td>
              <td className="hidden py-2.5 pr-4 pl-3 @lg:table-cell">
                {source.type === "competitor" ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <Mark
                    value={cited.mentions === null ? null : cited.mentions.includes(youId)}
                    yes={sources("pageYou")}
                    no={sources("pageNotYou")}
                    unknown={sources("pageUnknown")}
                  />
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "answers" && (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b p-3">
            {source.pages.length > 1 && (
              <FilterMenu
                icon={FileText}
                label={t("answers.pageFilter")}
                value={page}
                className="max-w-full"
                options={[
                  { value: "", label: t("answers.allPages"), count: rows.length },
                  ...source.pages.map((cited) => ({
                    value: cited.url,
                    label: titleOf(cited),
                    count: rows.filter(({ answer }) => answer.citations.some((citation) => citation.url === cited.url)).length,
                  })),
                ]}
                onChange={setPage}
              />
            )}
            <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
              <Hint text={t("answers.countHint")}>{t("answersCount", { count: visible.length })}</Hint>
            </p>
            <span className="ml-auto">
              <ArrowLink href={answersHref}>{t("answers.all")}</ArrowLink>
            </span>
          </div>
          <AnswersList rows={visible} brands={brands} project={report.project} method={report.method} questionHref={questionHref} />
        </>
      )}
    </section>
  );
}
