import { parseReportFilters } from "@/shared/helpers/report-filters";
import { api } from "./client";
import { orNotFound } from "./errors";

/**
 * What a project's data pages share: the report under the filters in the URL, plus all of the
 * project's prompts (for the filter options and for questions that haven't run yet).
 */
export async function loadReport(projectId: string, searchParams: Record<string, string | string[] | undefined>) {
  const filters = parseReportFilters(searchParams);
  const [report, prompts] = await Promise.all([
    orNotFound(api.getReport(projectId, "week", filters)),
    orNotFound(api.getPrompts(projectId)),
  ]);
  const topics = [...new Set(prompts.map((prompt) => prompt.topic))];
  return { report, prompts, filters, topics };
}
