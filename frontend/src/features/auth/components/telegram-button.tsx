"use client";

import { CircleNotchIcon as LoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { PaperPlaneTiltIcon as Send } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { useTelegramLogin } from "../hooks/use-telegram-login";
import type { LoginTarget } from "../types";

/** The second way in, under the "or" line: an outlined pill with Telegram's blue icon. */
export function TelegramButton({ target }: { target: LoginTarget }) {
  const t = useTranslations("Login");
  const login = useTelegramLogin(target);
  const busy = login.isPending || login.isSuccess;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="lg"
        onClick={() => login.mutate()}
        disabled={busy}
        className="h-12 rounded-full text-base shadow-xs"
      >
        {busy ? (
          <LoaderCircle aria-hidden data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />
        ) : (
          <Send aria-hidden data-icon="inline-start" className="text-telegram" />
        )}
        {busy ? t("telegramPending") : t("telegram")}
      </Button>
      {login.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("telegramFailed")}
        </p>
      )}
    </div>
  );
}
