import type { LoginTarget } from "../types";

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) =>
  typeof value === "string" && value ? value : undefined;

/** Only paths on this site: "/projects/x", never "//evil.com" or "https://…". */
export const safeNext = (next: string | undefined) =>
  next && /^\/(?![/\\])/.test(next) ? next : undefined;

export function parseLoginTarget(params: SearchParams): LoginTarget {
  return { snapshot: single(params.snapshot), next: safeNext(single(params.next)) };
}

/** First login (no projects yet) goes to onboarding with the free check; later logins go back where they came from. */
export function afterLoginPath(hasProjects: boolean, { snapshot, next }: LoginTarget) {
  if (!hasProjects) {
    return snapshot ? `/onboarding?snapshot=${encodeURIComponent(snapshot)}` : "/onboarding";
  }
  return next ?? "/dashboard";
}
