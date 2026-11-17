import { cookies } from "next/headers";
import { connection } from "next/server";
import { ApiError, api } from "@/shared/api/client";
import { requireUser } from "@/shared/api/session";
import { AppProviders } from "@/shared/components/app-providers";
import { WorkspaceShell } from "../components/workspace-shell";
import { SIDEBAR_COOKIE } from "../constants";

/** Workspace for logged-in users: sidebar, page panel, GEO AI and help. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Workspace data changes all the time: render per request, never at build time
  await connection();
  // Asked together, not one after the other: each is a call to the backend. Without a session the project
  // list fails too, and requireUser has already sent the visitor to the login.
  const [user, cookieStore, projects] = await Promise.all([
    requireUser(),
    cookies(),
    api.getProjects().catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) return [];
      throw error;
    }),
  ]);

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
