"use client";

import { useMemo, useState } from "react";
import { AssistantProvider } from "@/shared/hooks/use-assistant";
import type { Project, User } from "@/shared/types/api";
import { SIDEBAR_COOKIE } from "../constants";
import { useProjects } from "../hooks/use-projects";
import { useRecordStartVisits } from "../hooks/use-start-progress";
import { AssistantPanel } from "./assistant-panel";
import { DesktopSidebar, MobileTopBar } from "./sidebar";
import { SupportSheet } from "./support-sheet";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Grey frame: sidebar, the page in a white panel, GEO AI on the right when a page opens it, help in a sheet. */
export function WorkspaceShell({
  projects,
  user,
  initialCollapsed,
  children,
}: {
  projects: Project[];
  user: User;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const { current } = useProjects(projects);
  useRecordStartVisits(current?.id);
  const [supportOpen, setSupportOpen] = useState(false);
  // `session` remounts the panel, so a question asked from a page starts a fresh chat
  const [assistant, setAssistant] = useState<{ open: boolean; question?: string; session: number }>({
    open: false,
    session: 0,
  });
  const controls = useMemo(
    () => ({
      openAssistant: (question?: string) =>
        setAssistant((current) => ({ open: true, question, session: current.session + 1 })),
    }),
    [],
  );

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
  }

  const sidebarProps = { projects, user, onHelp: () => setSupportOpen(true) };

  return (
    <AssistantProvider value={controls}>
      {/* Clips anything positioned inside, so only the panels scroll, never the page (see globals.css) */}
      <div data-workspace className="relative flex h-svh overflow-hidden bg-sidebar">
        <DesktopSidebar {...sidebarProps} collapsed={collapsed} onToggle={toggleSidebar} />
        <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
          <MobileTopBar {...sidebarProps} />
          <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-background lg:rounded-xl lg:border lg:shadow-xs">
            {children}
          </main>
        </div>
        {assistant.open && (
          <AssistantPanel
            key={assistant.session}
            initialQuestion={assistant.question}
            onClose={() => setAssistant((current) => ({ ...current, open: false }))}
          />
        )}
        <SupportSheet open={supportOpen} onOpenChange={setSupportOpen} />
      </div>
    </AssistantProvider>
  );
}
