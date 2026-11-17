import type { ActionImpact, ActionKind, ActionStatus, PageType } from "@/shared/types/api";

/**
 * The four goals an action serves, as the list's filter. In the order of what
 * costs a business most: a wrong price or address first, then the sites, pages and settings it lacks.
 * Labels in messages/Actions.goals.
 */
export const GOALS: ActionKind[] = ["fact", "listing", "content", "technical"];

/** The page's tabs, in the order an action goes through them: to do, in progress, done; declined last. */
export const STATUS_TABS: ActionStatus[] = ["new", "in_progress", "done", "declined"];

/** How many of the actions to do are shown first, as cards. */
export const FIRST_SHOWN = 3;

/** The most effective first. */
export const IMPACT_ORDER: ActionImpact[] = ["high", "medium", "low"];

/** Every action's how-to has ACTION_STEP_COUNT steps, in messages/Actions.steps. */
export const STEPS = ["s1", "s2", "s3"] as const;

/** The kinds of page "Add content" takes, in messages/Actions.pageTypes. */
export const PAGE_TYPES: PageType[] = ["home", "service", "prices", "article", "about", "other"];

/** A brief's title and description should fit what search engines and AI show of them. */
export const META_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 155;
