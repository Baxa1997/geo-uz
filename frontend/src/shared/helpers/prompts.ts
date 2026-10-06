import type { Prompt } from "@/shared/types/api";

/** A question the weekly check asks; an archived one isn't asked and doesn't count toward the plan's limit. */
export const isTracked = (prompt: Prompt) => prompt.archivedAt === null;
