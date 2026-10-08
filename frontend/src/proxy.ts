import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./shared/constants";

const intl = createMiddleware(routing);

/** Pages behind login. The client report (/projects/{id}/report) stays public so it can be shared. */
const isPrivate = (path: string) =>
  /^\/(dashboard|onboarding|projects|settings)(\/|$)/.test(path) && !/^\/projects\/[^/]+\/report\/?$/.test(path);

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, locale, ...rest] = pathname.split("/");
  const path = `/${rest.join("/")}`;

  // Optimistic check: only whether the cookie exists. Pages ask the backend if it's still valid.
  if (hasLocale(routing.locales, locale) && isPrivate(path) && !request.cookies.has(SESSION_COOKIE)) {
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set("next", `${path}${search}`);
    return NextResponse.redirect(login);
  }
  return intl(request);
}

export const config = {
  matcher: [
    // Skip API routes, Next.js internals and files with an extension
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // A cited site's page has the site's domain in its address ("…/sources/2gis.uz"): a dot, but not a file
    "/:locale/projects/:id/sources/:domain",
  ],
};
