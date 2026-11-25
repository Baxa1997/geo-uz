"use client";

import { ArrowSquareOutIcon as External } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { ListIcon as Menu } from "@phosphor-icons/react/dist/ssr/List";
import { SignOutIcon as SignOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import { Logo } from "@/shared/components/logo";
import { NavigationProgress } from "@/shared/components/navigation-progress";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { adminApi } from "@/shared/api/client";
import { cn } from "@/shared/helpers/utils";
import type { AdminMe } from "@/shared/types/api";
import { ADMIN_MENU } from "../constants";

/** The admin page's frame, as the workspace's: the menu on the left (a drawer on a phone), the page in a white panel. */
export function AdminShell({ me, children }: { me: AdminMe; children: React.ReactNode }) {
  const t = useTranslations("Admin.menu");
  const [open, setOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // A new page opens at its top: the panel scrolls, not the window
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div data-workspace className="relative flex h-svh overflow-hidden bg-sidebar">
      <aside className="hidden h-svh w-60 shrink-0 lg:block">
        <AdminMenu me={me} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-1 border-b bg-background px-2 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon-lg" aria-label={t("open")} />}>
              <Menu aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">{t("label")}</SheetTitle>
              <AdminMenu me={me} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="min-w-0 flex-1 truncate pr-2 font-semibold">{t("title")}</span>
        </header>
        <main ref={main} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-background lg:rounded-xl lg:border lg:shadow-xs">
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminMenu({ me, onNavigate }: { me: AdminMe; onNavigate?: () => void }) {
  const t = useTranslations("Admin.menu");
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function logOut() {
    setLeaving(true);
    await adminApi.logout().catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col gap-4 px-3 py-4">
      <div className="flex items-center gap-2 pl-1.5">
        <Logo />
        <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-background uppercase">{t("badge")}</span>
      </div>
      <nav aria-label={t("label")} className="flex flex-col gap-0.5">
        {ADMIN_MENU.map((item) => {
          const active = item.path === "/admin" ? pathname === "/admin" : pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.key}
              href={item.path}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors [&_svg]:size-[18px]",
                active ? "bg-black/[0.06] font-medium text-foreground" : "text-foreground/70 hover:bg-black/[0.04] hover:text-foreground",
              )}
            >
              <item.icon aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
              {item.key === "waiting" && me.waiting > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[0.7rem] font-semibold text-white tabular-nums">{me.waiting}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t pt-3">
        <Link href="/" prefetch={false} target="_blank" className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-foreground/70 transition-colors hover:bg-black/[0.04] hover:text-foreground [&_svg]:size-[18px]">
          <External aria-hidden />
          {t("site")}
        </Link>
        <div className="flex items-center gap-2 px-2.5 pt-1">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{me.username}</span>
          <Button variant="ghost" size="sm" onClick={logOut} disabled={leaving}>
            <SignOut aria-hidden data-icon="inline-start" />
            {t("logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
