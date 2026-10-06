import { cookies } from "next/headers";
import { connection } from "next/server";
import { api } from "@/shared/api/client";
import { requireUser } from "@/shared/api/session";
import { AppProviders } from "@/shared/components/app-providers";
import { WorkspaceShell } from "../components/workspace-shell";
import { SIDEBAR_COOKIE } from "../constants";

/** Workspace for logged-in users: sidebar, page panel, GEO AI and help. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Workspace data changes all the time: render per request, never at build time
  await connection();
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()]);
  const projects = await api.getProjects();

  return (
    <AppProviders>
      <WorkspaceShell
        projects={projects}
        user={user}
        initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
      >
        {children}
      </WorkspaceShell>
    </AppProviders>
  );
}
