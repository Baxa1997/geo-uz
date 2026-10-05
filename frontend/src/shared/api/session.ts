import { getLocale } from "next-intl/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import type { User } from "@/shared/types/api";
import { ApiError, api } from "./client";

/** The logged-in user, or null. Asked once per request. Server only. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    return await api.getMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/**
 * For pages behind login. Visitors without a session cookie never get here (proxy.ts
 * sends them to /login?next=…); this catches sessions that expired.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  return user ?? redirect({ href: "/login", locale: await getLocale() });
}
