"use client";

import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { Project } from "@/shared/types/api";

/** Project card at the top of the sidebar; switching keeps the section (/projects/a/sources → /projects/b/sources). */
export function ProjectSwitcher({
  projects,
  current,
  section,
  compact = false,
  onNavigate,
}: {
  projects: Project[];
  current: Project | undefined;
  section: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Sidebar");
  const messages = useMessages();
  const name = current?.brand.name ?? t("selectProject");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={compact ? name : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border bg-background p-2 text-left shadow-xs outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50",
          compact && "justify-center p-1.5",
        )}
      >
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold"
        >
          {(current?.brand.name ?? "?").charAt(0).toUpperCase()}
        </span>
        {!compact && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{name}</span>
              {current && (
                <span className="truncate text-xs text-muted-foreground">
                  {labelFor(messages.Categories, current.category)} · {labelFor(messages.Cities, current.city)}
                </span>
              )}
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("projects")}</DropdownMenuLabel>
          {projects.map((project) => (
            <DropdownMenuLinkItem
              key={project.id}
              closeOnClick
              onClick={onNavigate}
              render={<Link href={`/projects/${project.id}${section}`} />}
            >
              <span className="flex-1 truncate">{project.brand.name}</span>
              {project.id === current?.id && <Check aria-hidden />}
            </DropdownMenuLinkItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem closeOnClick onClick={onNavigate} render={<Link href="/dashboard" />}>
          <LayoutGrid aria-hidden />
          {t("allProjects")}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem closeOnClick onClick={onNavigate} render={<Link href="/projects/new" />}>
          <Plus aria-hidden />
          {t("newProject")}
        </DropdownMenuLinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
