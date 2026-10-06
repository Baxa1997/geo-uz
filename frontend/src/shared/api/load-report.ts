import { isTracked } from "@/shared/helpers/prompts";
import { parseReportFilters } from "@/shared/helpers/report-filters";
import { api } from "./client";
import { orNotFound } from "./errors";

/**
 * What a project's data pages share: the report under the filters in the URL, plus the questions the
 * project tracks (for the filter options and for questions that haven't run yet). `allPrompts` adds the
 * archived ones, for the page that manages them.
 */
export async function loadReport(projectId: string, searchParams: Record<string, string | string[] | undefined>) {
  const filters = parseReportFilters(searchParams);
  const [report, allPrompts] = await Promise.all([
    orNotFound(api.getReport(projectId, "week", filters)),
    orNotFound(api.getPrompts(projectId)),
  ]);
  const prompts = allPrompts.filter(isTracked);
  const topics = [...new Set(prompts.map((prompt) => prompt.topic))];
  return { report, prompts, allPrompts, filters, topics };
}
