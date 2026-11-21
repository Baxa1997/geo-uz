import type { Action } from "@/shared/types/api";

/** What is still to do, in the backend's order: the most effective first. */
export const openActions = (actions: Action[]) => actions.filter((action) => action.status === "new" || action.status === "in_progress");
