"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLogout } from "@/shared/hooks/use-logout";
import { cn } from "@/shared/helpers/utils";
import type { User } from "@/shared/types/api";
import { displayName } from "../helpers/user";

/** Bottom of the sidebar: who is logged in, and log out. (The language is in Settings.) */
export function AccountBlock({ user, collapsed }: { user: User; collapsed: boolean }) {
  const t = useTranslations("Common");
  const logout = useLogout();
  const name = displayName(user);

  return (
    <div className={cn("flex items-center gap-2.5 border-t pt-3", collapsed ? "flex-col" : "pl-1")}>
      <span
        aria-hidden
        title={collapsed ? name : undefined}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
      >
        {name.replace(/^[+@]/, "").charAt(0).toUpperCase()}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate text-sm">{name}</span>}
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending || logout.isSuccess}
        aria-label={t("logout")}
        title={t("logout")}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-black/[0.05] hover:text-foreground disabled:opacity-50"
      >
        <LogOut aria-hidden className="size-4" />
      </button>
    </div>
  );
}
