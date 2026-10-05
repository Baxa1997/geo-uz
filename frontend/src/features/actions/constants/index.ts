import type { ActionKind, ActionStatus } from "@/shared/types/api";

/**
 * The four goals an action serves, as tiles above the list and groups inside it. In the order of what
 * costs a business most: a wrong price or address first, then the sites, pages and settings it lacks.
 * Labels in messages/Actions.goals.
 */
export const GOALS: ActionKind[] = ["fact", "listing", "content", "technical"];

/** The list's groups, what's being worked on first. Done and declined start folded. */
export const STATUS_GROUPS: ActionStatus[] = ["in_progress", "new", "done", "declined"];
export const OPEN_GROUPS: ActionStatus[] = ["in_progress", "new"];

/** Still to do: what the goal tiles count. */
export const OPEN_STATUSES: ActionStatus[] = ["in_progress", "new"];

/** Rows shown per goal inside a group; "Show all" opens the rest. */
export const SHOWN_ROWS = 5;

/** Every action's how-to has ACTION_STEP_COUNT steps, in messages/Actions.steps. */
export const STEPS = ["s1", "s2", "s3"] as const;
