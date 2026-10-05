"use client";

import { LogOut } from "lucide-react";
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
