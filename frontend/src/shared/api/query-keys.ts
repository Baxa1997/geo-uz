export const queryKeys = {
  projects: () => ["projects"] as const,
  prompts: (projectId: string) => ["projects", projectId, "prompts"] as const,
  promptSuggestions: (projectId: string) => ["projects", projectId, "prompt-suggestions"] as const,
  snapshot: (domain: string) => ["snapshot", domain] as const,
  runProgress: (runId: string) => ["runs", runId, "progress"] as const,
};
