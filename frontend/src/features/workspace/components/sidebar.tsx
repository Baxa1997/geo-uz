"use client";

import { LayoutGrid, LifeBuoy, Menu, PanelLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { usePathname } from "@/i18n/navigation";
import { parseReportFilters, withFilters } from "@/shared/helpers/report-filters";
import { cn } from "@/shared/helpers/utils";
import type { Project, User } from "@/shared/types/api";
import { NAV_GROUPS, SETTINGS, type NavItem } from "../constants";
import { useProjects } from "../hooks/use-projects";
import { AccountBlock } from "./account-block";
import { NavLink } from "./nav-link";
import { ProjectSwitcher } from "./project-switcher";
import { StartChecklist } from "./start-checklist";

interface SidebarProps {
  projects: Project[];
  user: User;
  onHelp: () => void;
}

/** Logo, project card, the project's pages by section, then the start checklist, settings, help and the account. */
function SidebarContent({
  projects: initialProjects,
  user,
  onHelp,
  collapsed = false,
  onToggle,
  onNavigate,
}: SidebarProps & { collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const { projects, current } = useProjects(initialProjects);
  const base = current ? `/projects/${current.id}` : null;
  const section = base && pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const isActive = (path: string) => (path === "" ? section === "" : section === path || section.startsWith(`${path}/`));
  // The language and topic filters follow the user from one data page to the next
  const filters = parseReportFilters(Object.fromEntries(useSearchParams()));
  const link = (item: NavItem, projectBase: string) => (
    <NavLink
      key={item.key}
      href={item === SETTINGS ? `${projectBase}${item.path}` : withFilters(`${projectBase}${item.path}`, filters)}
      label={t(item.key)}
      icon={<item.icon aria-hidden />}
      active={isActive(item.path)}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className={cn("flex h-full flex-col gap-4 py-4", collapsed ? "px-2" : "px-3")}>
      <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between pl-1.5")}>
        <Logo compact={collapsed} />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t("expand") : t("collapse")}
            aria-expanded={!collapsed}
            className="flex size-8 items-center justify-center rounded-lg border bg-background text-foreground/70 shadow-xs transition-colors hover:text-foreground"
          >
            <PanelLeft aria-hidden className="size-4" />
          </button>
        )}
      </div>

      <ProjectSwitcher
        projects={projects}
        current={current}
        section={section}
        compact={collapsed}
        onNavigate={onNavigate}
      />

      <nav aria-label={t("label")} className="relative -mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {base ? (
          NAV_GROUPS.map((group, index) => (
            <div
              key={group.key}
              role={index > 0 && !collapsed ? "group" : undefined}
              aria-labelledby={index > 0 && !collapsed ? `nav-${group.key}` : undefined}
              className="flex flex-col gap-0.5"
            >
              {index > 0 &&
                (collapsed ? (
                  <hr aria-hidden className="mx-2 my-1.5 border-foreground/10" />
                ) : (
                  <p id={`nav-${group.key}`} className="px-2.5 pt-3 pb-1 text-xs font-medium text-foreground/50">
                    {t(`groups.${group.key}`)}
                  </p>
                ))}
              {group.items.map((item) => link(item, base))}
            </div>
          ))
        ) : (
          <NavLink
            href="/dashboard"
            label={t("allProjects")}
            icon={<LayoutGrid aria-hidden />}
            active={pathname === "/dashboard"}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        )}
      </nav>

      <div className="flex flex-col gap-2">
        {current && !collapsed && <StartChecklist projectId={current.id} base={`/projects/${current.id}`} onNavigate={onNavigate} />}
        <div className="flex flex-col gap-0.5">
          {/* Without an open project: the account's settings (interface language) */}
          {base ? (
            link(SETTINGS, base)
          ) : (
            <NavLink
              href={SETTINGS.path}
              label={t(SETTINGS.key)}
              icon={<SETTINGS.icon aria-hidden />}
              active={pathname === SETTINGS.path}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )}
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              onHelp();
            }}
            aria-label={collapsed ? t("help") : undefined}
            title={collapsed ? t("help") : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-foreground/70 transition-colors hover:bg-black/[0.04] hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <LifeBuoy aria-hidden className="size-[18px]" />
            {!collapsed && t("help")}
          </button>
        </div>
        <AccountBlock user={user} collapsed={collapsed} />
      </div>
    </div>
  );
}

/** Always visible from lg up; collapses to an icon rail. */
export function DesktopSidebar({
  collapsed,
  onToggle,
  ...props
}: SidebarProps & { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        "hidden h-svh shrink-0 transition-[width] duration-200 motion-reduce:transition-none lg:block",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarContent {...props} collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
}

/** Below lg: top bar with the menu drawer and the project's name. */
export function MobileTopBar(props: SidebarProps) {
  const t = useTranslations("Sidebar");
  const [open, setOpen] = useState(false);
  const { current } = useProjects(props.projects);

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-1 border-b bg-background px-2 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon-lg" aria-label={t("openMenu")} />}>
          <Menu aria-hidden />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
          <SidebarContent {...props} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <span className="min-w-0 flex-1 truncate pr-2 font-semibold">{current?.brand.name ?? "GEO"}</span>
    </header>
  );
}
