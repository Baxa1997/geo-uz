// The mock session lives in the same httpOnly cookie the backend will set.
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/shared/constants";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Only works inside a server action (mocks/actions.ts). */
export async function writeSessionToken(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken() {
  (await cookies()).delete(SESSION_COOKIE);
}
