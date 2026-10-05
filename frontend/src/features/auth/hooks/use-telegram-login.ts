"use client";

import { useMutation } from "@tanstack/react-query";
import { api, USE_MOCKS } from "@/shared/api/client";
import type { TelegramAuthRequest } from "@/shared/types/api";
import { TELEGRAM_MOCK_DELAY_MS } from "../constants";
import type { LoginTarget } from "../types";
import { useFinishLogin } from "./use-finish-login";

/** Asks Telegram who the visitor is. Mock mode answers with a test account. */
async function askTelegram(): Promise<TelegramAuthRequest> {
  // The real Telegram Login Widget needs the bot's username, which doesn't exist yet
  if (!USE_MOCKS) throw new Error("Telegram login is not set up");
  const { telegramTestAuth } = await import("@/mocks/accounts");
  await new Promise((resolve) => setTimeout(resolve, TELEGRAM_MOCK_DELAY_MS));
  return telegramTestAuth();
}

export function useTelegramLogin(target: LoginTarget) {
  const finish = useFinishLogin(target);
  return useMutation({
    mutationFn: async () => {
      await api.loginWithTelegram(await askTelegram());
      await finish();
    },
  });
}
