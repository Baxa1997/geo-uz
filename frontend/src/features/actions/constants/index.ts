import type { ActionKind, ActionStatus, PageType } from "@/shared/types/api";

/**
 * The four goals an action serves, as tiles above the list and groups inside it. In the order of what
 * costs a business most: a wrong price or address first, then the sites, pages and settings it lacks.
 * Labels in messages/Actions.goals.
 */
export const GOALS: ActionKind[] = ["fact", "listing", "content", "technical"];

/** The list's groups, in Peec's order: new first, then what's being worked on, done, declined. */
export const STATUS_GROUPS: ActionStatus[] = ["new", "in_progress", "done", "declined"];
/** Open at first; done and declined start folded. */
export const OPEN_GROUPS: ActionStatus[] = ["new", "in_progress"];

/** Still to do: what the goal tiles count. */
export const OPEN_STATUSES: ActionStatus[] = ["in_progress", "new"];

/** Rows shown per group; "Show all" opens the rest. */
export const SHOWN_ROWS = 5;

/** Every action's how-to has ACTION_STEP_COUNT steps, in messages/Actions.steps. */
export const STEPS = ["s1", "s2", "s3"] as const;

/** The kinds of page "Add content" takes, in messages/Actions.pageTypes. */
export const PAGE_TYPES: PageType[] = ["home", "service", "prices", "article", "about", "other"];

/** A brief's title and description should fit what search engines and AI show of them. */
export const META_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 155;
