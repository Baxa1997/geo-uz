import { getLocale } from "next-intl/server";
import { connection } from "next/server";
import { redirect } from "@/i18n/navigation";
import { ApiError, adminApi } from "@/shared/api/client";
import { AppProviders } from "@/shared/components/app-providers";
import { AdminShell } from "../components/admin-shell";

/**
 * The team's admin page (25 Nov 2026): behind its own login, apart from the accounts'. proxy.ts sends a visitor without
 * its cookie to /admin/login; this catches one that has ended, or a backend with no admin login set.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const me = await adminApi.me().catch((error: unknown) => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return null;
    throw error;
  });
  if (!me) return redirect({ href: "/admin/login", locale: await getLocale() });

  return (
    <AppProviders>
      <AdminShell me={me}>{children}</AdminShell>
    </AppProviders>
  );
}
