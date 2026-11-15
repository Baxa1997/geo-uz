export const queryKeys = {
  projects: () => ["projects"] as const,
  prompts: (projectId: string) => ["projects", projectId, "prompts"] as const,
  promptSuggestions: (projectId: string) => ["projects", projectId, "prompt-suggestions"] as const,
  topics: (projectId: string) => ["projects", projectId, "topics"] as const,
  snapshot: (domain: string) => ["snapshot", domain] as const,
  runProgress: (runId: string) => ["runs", runId, "progress"] as const,
  firstRun: (runId: string) => ["first-runs", runId] as const,
  firstRunResult: (runId: string) => ["first-runs", runId, "result"] as const,
};
