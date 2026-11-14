"use client";

import { SignOutIcon as LogOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { useLogout } from "@/shared/hooks/use-logout";

export function LogoutButton() {
  const t = useTranslations("Common");
  const logout = useLogout();

  return (
    <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending || logout.isSuccess}>
      <LogOut aria-hidden data-icon="inline-start" />
      {t("logout")}
    </Button>
  );
}
