"use client";

import { CircleSlash, Search, SearchX, Sparkles, Users } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/shared/components/empty-state";
import { EngineIcon } from "@/shared/components/engine-icon";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Panel } from "@/shared/components/panel";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { Button } from "@/shared/components/ui/button";
import { useAssistant } from "@/shared/hooks/use-assistant";
import { TIME_ZONE } from "@/shared/constants";
import { answerExcerpt } from "@/shared/helpers/answer-excerpt";
import { formatShortDate } from "@/shared/helpers/dates";
import { withFilters } from "@/shared/helpers/report-filters";
import type { Report, ReportFilters } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { answerRows, matchesBrand, matchesQuery, matchesStatus, NO_BRAND, rowKey } from "../helpers/filters";
import type { AnswersFilter } from "../types";
import { ChatDialog } from "./chat-dialog";

const PAGE = 20;
const SOURCES_SHOWN = 3;
const STATUSES: AnswersFilter[] = ["all", "missing", "negative"];

/**
 * Every answer of the latest run as one row: the question and how the answer opens, the brands it names,
 * the sites it cites, the client's place and tone. Search and two filters narrow the list; a row opens
 * the answer like a chat. ?prompt= opens that question's first answer.
 */
export function AnswersTable({
  report,
  brands,
  initialPromptId,
  filters,
}: {
  report: Report;
  brands: SeriesBrand[];
  initialPromptId?: string;
  /** The page's language and topic filters, carried to the Questions page a chat links to. */
  filters: ReportFilters;
}) {
  const t = useTranslations("AnswersPage");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { openAssistant } = useAssistant();
  const youId = report.project.brand.id;
  const rows = answerRows(report);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState<AnswersFilter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(() => {
    const first = rows.findIndex((row) => row.result.prompt.id === initialPromptId);
    return first >= 0 ? first : null;
  });

  const visible = rows.filter(
    (row) => matchesQuery(row, query) && matchesBrand(row, brand) && matchesStatus(row, status, youId),
  );
  const byId = new Map(brands.map((item) => [item.id, item]));
  const date = formatShortDate(report.method.collectedAt, locale, timeZone);
  const reset = () => setLimit(PAGE);

  return (
    <Panel
      title={t("table.title")}
      hint={t("table.hint")}
      actions={
        <Button variant="outline" className="h-8" onClick={() => openAssistant(t("analyzeQuestion"))}>
          <Sparkles aria-hidden data-icon="inline-start" />
          {t("analyze")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="answers-search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="answers-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              reset();
            }}
            placeholder={t("search")}
            className="h-8 w-full rounded-lg border bg-background pr-2 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <FilterMenu
          icon={Users}
          label={t("table.brandFilter")}
          value={brand}
          options={[
            { value: "", label: t("table.allBrands"), count: rows.length },
            ...brands.map((item) => ({
              value: item.id,
              label: item.isYou ? t("table.you", { name: item.name }) : item.name,
              count: rows.filter((row) => matchesBrand(row, item.id)).length,
            })),
            { value: NO_BRAND, label: t("table.noBrand"), count: rows.filter((row) => matchesBrand(row, NO_BRAND)).length },
          ]}
          onChange={(value) => {
            setBrand(value);
            reset();
          }}
        />
        <FilterMenu
          icon={CircleSlash}
          label={t("table.statusFilter")}
          value={status}
          options={STATUSES.map((option) => ({
            value: option,
            label: t(`table.status.${option}`),
            count: rows.filter((row) => matchesStatus(row, option, youId)).length,
          }))}
          onChange={(value) => {
            setStatus(value);
            reset();
          }}
        />
        <p aria-live="polite" className="ml-auto text-sm text-muted-foreground tabular-nums">
          {t("table.count", { count: visible.length })}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={SearchX} title={t("emptyTitle")} text={t("emptyText")} />
        </div>
      ) : (
        <div className="@container">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">
                <th scope="col" className="px-4">
                  {t("table.columns.answer")}
                </th>
                <th scope="col" className="hidden w-36 px-3 @3xl:table-cell">
                  {t("table.columns.brands")}
                </th>
                <th scope="col" className="hidden w-28 px-3 @2xl:table-cell">
                  {t("table.columns.sources")}
                </th>
                <th scope="col" className="w-16 px-2 @md:w-20 @md:px-3">
                  {t("table.columns.position")}
                </th>
                <th scope="col" className="hidden w-16 px-3 @lg:table-cell">
                  {t("table.columns.tone")}
                </th>
                <th scope="col" className="hidden w-24 px-4 @xl:table-cell">
                  {t("table.columns.date")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.slice(0, limit).map((row, index) => {
                const { result, answer } = row;
                const own = answer.mentions.find((mention) => mention.brandId === youId);
                const named = [...answer.mentions].sort((a, b) => a.position - b.position).flatMap((mention) => byId.get(mention.brandId) ?? []);
                const domains = [...new Set(answer.citations.map((citation) => citation.domain))];
                return (
                  <tr key={rowKey(row)} className="align-top transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => setOpen(index)}
                        className="flex w-full min-w-0 items-start gap-2.5 text-left outline-none focus-visible:underline"
                      >
                        <EngineIcon engine="chatgpt" className="mt-0.5 text-muted-foreground" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span lang={result.prompt.language} className="font-medium text-pretty">
                            {result.prompt.text}
                          </span>
                          <span className="truncate text-muted-foreground">
                            <span className="text-foreground/60">{t("table.sample", { n: answer.sample })}</span> ·{" "}
                            {answerExcerpt(answer.text)}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="hidden px-3 py-3 @3xl:table-cell">
                      {named.length ? (
                        <ul className="flex flex-wrap gap-1">
                          {named.map((item) => (
                            <li
                              key={item.id}
                              title={item.name}
                              className="flex h-6 items-center gap-1 rounded-md bg-muted px-1.5 text-[0.7rem] font-semibold"
                            >
                              <span aria-hidden className="size-2 rounded-full" style={{ background: item.color }} />
                              <span aria-hidden>{item.name.charAt(0).toUpperCase()}</span>
                              <span className="sr-only">{item.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 @2xl:table-cell">
                      {domains.length ? (
                        <span className="flex items-center gap-1" title={domains.join(", ")}>
                          {domains.slice(0, SOURCES_SHOWN).map((domain) => (
                            <span
                              key={domain}
                              aria-hidden
                              className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground uppercase ring-2 ring-card"
                            >
                              {domain.charAt(0)}
                            </span>
                          ))}
                          {domains.length > SOURCES_SHOWN && (
                            <span aria-hidden className="pl-0.5 text-xs text-muted-foreground">
                              +{domains.length - SOURCES_SHOWN}
                            </span>
                          )}
                          <span className="sr-only">{domains.join(", ")}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 font-medium tabular-nums @md:px-3">
                      {own ? (
                        <>
                          <span aria-hidden className="font-normal text-muted-foreground">
                            #
                          </span>
                          {own.position}
                        </>
                      ) : (
                        <span className="font-normal text-muted-foreground">
                          <span aria-hidden>—</span>
                          <span className="sr-only">{t("table.notNamed")}</span>
                        </span>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 @lg:table-cell">
                      {own ? <ToneIcon tone={own.tone} className="size-4" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground @xl:table-cell">{date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length > limit && (
            <div className="border-t p-3 text-center">
              <Button variant="ghost" onClick={() => setLimit((current) => current + PAGE)}>
                {t("table.more", { count: Math.min(PAGE, visible.length - limit) })}
              </Button>
            </div>
          )}
        </div>
      )}

      <ChatDialog
        rows={visible}
        index={open !== null && open < visible.length ? open : null}
        project={report.project}
        collectedAt={report.method.collectedAt}
        questionHref={(topic) => withFilters(`/projects/${report.project.id}/prompts`, { ...filters, topic })}
        onIndex={(index) => {
          setOpen(index);
          // The row being read stays in the list, even past the ones shown
          if (index >= limit) setLimit(index + 1);
        }}
        onClose={() => setOpen(null)}
      />
    </Panel>
  );
}
