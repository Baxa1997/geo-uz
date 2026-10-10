"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { formatPhone } from "@/shared/helpers/phone";
import type { User } from "@/shared/types/api";
import { FIELD, SettingsCard, SettingsRow } from "./settings-parts";

/**
 * The account, in the place of Peec's company settings: the name the reports and members see (saved on
 * its own), and how the account logs in (its phone number, its Telegram), which can't be changed here.
 */
export function AccountCard({ user }: { user: User }) {
  const t = useTranslations("Settings.account");
  const id = useId();
  const router = useRouter();
  const [saved, setSaved] = useState(user.name ?? "");
  const [name, setName] = useState(saved);
  const save = useMutation({
    mutationFn: () => api.updateMe({ name: name.trim() }),
    onSuccess: (next) => {
      setSaved(next.name ?? "");
      setName(next.name ?? "");
      // The account block at the sidebar's foot shows the name
      router.refresh();
    },
  });

  return (
    <SettingsCard title={t("title")} description={t("text")} tour="account">
      <SettingsRow label={t("name")} hint={t("nameHint")} htmlFor={`${id}-name`}>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <input id={`${id}-name`} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className={`${FIELD} max-w-md flex-1`} />
          <Button type="submit" disabled={!name.trim() || name.trim() === saved || save.isPending}>
            {t("save")}
          </Button>
          <span role="status" className={save.isError ? "text-sm text-destructive" : "text-sm text-positive"}>
            {save.isError ? t("failed") : save.isSuccess && name.trim() === saved ? t("saved") : ""}
          </span>
        </form>
      </SettingsRow>
      <SettingsRow label={t("phone")} hint={t("phoneHint")}>
        <p className="py-2 text-sm tabular-nums">{user.phone ? formatPhone(user.phone) : <span className="text-muted-foreground">{t("none")}</span>}</p>
      </SettingsRow>
      <SettingsRow label={t("telegram")} hint={t("telegramHint")}>
        <p className="py-2 text-sm">{user.telegramUsername ? `@${user.telegramUsername}` : <span className="text-muted-foreground">{t("none")}</span>}</p>
      </SettingsRow>
    </SettingsCard>
  );
}
