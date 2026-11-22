import type { ProjectBilling } from "@/shared/types/api";

/** Paid up: checked on its plan's days. Sample data has no status, and is. */
export const isPaid = (billing: ProjectBilling) => billing.status === undefined || billing.status === "active";

/** Whole days left of the trial, at least 1 while it runs; 0 when it has ended or has no end. */
export function trialDaysLeft(billing: ProjectBilling, at: number = Date.now()): number {
  if (billing.status !== "trial" || !billing.trialEndsAt) return 0;
  return Math.max(1, Math.ceil((Date.parse(billing.trialEndsAt) - at) / 86_400_000));
}
