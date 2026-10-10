"use client";

import { CircleSlash, Globe, Search, SearchX, Sparkles, Users } from "lucide-react";
import { useMessages, useTimeZone, useTranslations } from "next-intl";
import { useState } from "react";
import { AnswersList } from "@/shared/components/answers/answers-list";
import { CsvButton } from "@/shared/components/csv-button";
import { EmptyState } from "@/shared/components/empty-state";
import { FilterMenu } from "@/shared/components/filter-menu";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { Button } from "@/shared/components/ui/button";
import { useAssistant } from "@/shared/hooks/use-assistant";
import { TIME_ZONE } from "@/shared/constants";
import { formatIsoDay } from "@/shared/helpers/dates";
import { labelFor } from "@/shared/helpers/labels";
import { withFilters } from "@/shared/helpers/report-filters";
import type { Prompt, Report, ReportFilters } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { answerRows, citedSites, matchesBrand, matchesQuery, matchesSource, matchesStatus, NO_BRAND } from "../helpers/filters";
import type { AnswersFilter } from "../types";

const STATUSES: AnswersFilter[] = ["all", "missing", "negative"];

/**
 * Every answer of the latest run, as the shared answers list (one row each, grouped under their question,
 * a row opening the answer like a chat). Search and three filters (a brand named, a site cited, the client
 * missing or spoken of badly) narrow the list; the rows shown export as CSV with their full text. The date
 * of the check is the same for every row: the method line under the table says it.
 * ?prompt= opens that question's first answer; ?source= starts with the answers citing that site.
 */
export function AnswersTable({
  report,
  brands,
  initialPromptId,
  initialSource = "",
  filters,
}: {
  report: Report;
  brands: SeriesBrand[];
  initialPromptId?: string;
  /** A cited site (its domain) to start the list with: other pages link to "the answers that cite it". */
  initialSource?: string;
  /** The page's language and topic filters, carried to the question's page a chat links to. */
  filters: ReportFilters;
}) {
  const t = useTranslations("AnswersPage");
  const tones = useTranslations("Tone");
  const messages = useMessages();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const { openAssistant } = useAssistant();
  const youId = report.project.brand.id;
  const rows = answerRows(report);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const sites = citedSites(rows);
  // A link may name a site the answers no longer cite: then the list starts unfiltered
  const [source, setSource] = useState(() => (sites.some((site) => site.domain === initialSource) ? initialSource : ""));
  const [status, setStatus] = useState<AnswersFilter>("all");

  const visible = rows.filter(
    (row) => matchesQuery(row, query) && matchesBrand(row, brand) && matchesSource(row, source) && matchesStatus(row, status, youId),
  );
  const questionHref = (prompt: Prompt) => withFilters(`/projects/${report.project.id}/prompts/${prompt.id}`, filters);
  const names = new Map(brands.map((item) => [item.id, item.name]));
  /** The answers shown, one per line, each with everything the table and the chat window say about it. */
  const csvRows = () => [
    [
      t("table.csvHeaders.question"),
      t("table.csvHeaders.language"),
      t("table.csvHeaders.topic"),
      t("table.csvHeaders.sample"),
      t("table.csvHeaders.date"),
      t("table.csvHeaders.brands"),
      t("table.csvHeaders.position"),
      t("table.csvHeaders.tone"),
      t("table.csvHeaders.sites"),
      t("table.csvHeaders.pages"),
      t("table.csvHeaders.searches"),
      t("table.csvHeaders.text"),
    ],
    ...visible.map(({ result, answer }) => {
      const own = answer.mentions.find((mention) => mention.brandId === youId);
      const inOrder = [...answer.mentions].sort((a, b) => a.position - b.position);
      return [
        result.prompt.text,
        result.prompt.language.toUpperCase(),
        labelFor(messages.Topics, result.prompt.topic),
        answer.sample,
        formatIsoDay(report.method.collectedAt, timeZone),
        inOrder.flatMap((mention) => names.get(mention.brandId) ?? []).join(", "),
        own?.position ?? null,
        own ? tones(own.tone) : null,
        [...new Set(answer.citations.map((citation) => citation.domain))].join(", "),
        [...new Set(answer.citations.map((citation) => citation.url))].join(" "),
        answer.searches.join("; "),
        answer.text,
      ];
    }),
  ];

  return (
    <Panel
      title={t("table.title")}
      hint={t("table.hint")}
      actions={
        <Button data-tour="analyze" variant="outline" className="h-8" onClick={() => openAssistant(t("analyzeQuestion"))}>
          <Sparkles aria-hidden data-icon="inline-start" />
          {t("analyze")}
        </Button>
      }
    >
      <div data-tour="tools" className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="answers-search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="answers-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
          onChange={setBrand}
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
          onChange={setStatus}
        />
        <FilterMenu
          icon={Globe}
          label={t("table.sourceFilter")}
          value={source}
          options={[{ value: "", label: t("table.allSources"), count: rows.length }, ...sites.map((site) => ({ value: site.domain, label: site.domain, count: site.answers }))]}
          onChange={setSource}
        />
        <div className="ml-auto flex items-center gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            <Hint text={t("table.hints.count")}>{t("table.count", { count: visible.length })}</Hint>
          </p>
          {visible.length > 0 && (
            <CsvButton
              filename={`${report.project.brand.domain}-answers-${report.method.collectedAt.slice(0, 10)}`}
              label={t("table.csv")}
              hint={t("table.csvHint")}
              rows={csvRows}
            />
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={SearchX} title={t("emptyTitle")} text={t("emptyText")} />
        </div>
      ) : (
        <AnswersList
          rows={visible}
          brands={brands}
          project={report.project}
          method={report.method}
          questionHref={questionHref}
          initialPromptId={initialPromptId}
        />
      )}
    </Panel>
  );
}
