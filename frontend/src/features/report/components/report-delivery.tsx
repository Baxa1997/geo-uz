"use client";

import { useMutation } from "@tanstack/react-query";
import { Building2, Languages, Mail, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { FormSelect } from "@/shared/components/form-select";
import { Button } from "@/shared/components/ui/button";
import { api, ApiError } from "@/shared/api/client";
import { cn } from "@/shared/helpers/utils";
import type { Plan, ReportSettings, UpdateReportSettingsRequest } from "@/shared/types/api";

const FIELD = "h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted disabled:text-muted-foreground";

/**
 * Where the weekly report goes after each check, one row each: a Telegram chat through our bot, an email
 * address, the report's language, and on the agency plan the agency's name in place of ours. Each row
 * saves on its own.
 */
export function ReportDelivery({
  projectId,
  initial,
  plan,
  onSaved,
}: {
  projectId: string;
  initial: ReportSettings;
  plan: Plan;
  /** Tells the page the settings as saved (the banner above shows them). */
  onSaved?: (settings: ReportSettings) => void;
}) {
  const t = useTranslations("Reports.delivery");
  const locales = useTranslations("Locales");
  const id = useId();
  const [settings, setSettings] = useState(initial);
  const [email, setEmail] = useState(initial.email);
  const [agency, setAgency] = useState(initial.agencyName);
  const [saved, setSaved] = useState<keyof ReportSettings | "telegram" | null>(null);
  const agencyPlan = plan === "agency";

  const save = useMutation({
    mutationFn: (body: UpdateReportSettingsRequest) => api.updateReportSettings(projectId, body),
    onSuccess: (next, body) => {
      setSettings(next);
      onSaved?.(next);
      setSaved(body.telegram ? "telegram" : body.email !== undefined ? "email" : body.language ? "language" : "agencyName");
    },
  });
  const error = save.error instanceof ApiError && save.error.status === 422 ? t("email.invalid") : save.isError ? t("failed") : "";

  const row = (icon: React.ReactNode, title: string, text: string, control: React.ReactNode, key: keyof ReportSettings | "telegram") => (
    <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] sm:items-center sm:gap-6 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-[1.125rem]">
          {icon}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[0.9375rem] font-medium">
            {title}
            {saved === key && !save.isPending && <span className="ml-2 text-xs font-normal text-positive">{t("saved")}</span>}
          </p>
          <p className="text-sm text-pretty text-muted-foreground">{text}</p>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">{control}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {row(
          <Send />,
          t("telegram.title"),
          settings.telegramChat ? t("telegram.connected", { chat: settings.telegramChat }) : t("telegram.text"),
          settings.telegramChat ? (
            <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate({ telegram: "disconnect" })} className="ml-auto">
              {t("telegram.disconnect")}
            </Button>
          ) : (
            <Button disabled={save.isPending} onClick={() => save.mutate({ telegram: "connect" })} className="ml-auto bg-telegram text-white hover:bg-telegram-hover">
              <Send aria-hidden data-icon="inline-start" />
              {t("telegram.connect")}
            </Button>
          ),
          "telegram",
        )}
        {row(
          <Mail />,
          t("email.title"),
          settings.email ? t("email.to", { email: settings.email }) : t("email.text"),
          <form
            className="flex w-full gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate({ email: email.trim() });
            }}
          >
            <label htmlFor={`${id}-email`} className="sr-only">
              {t("email.title")}
            </label>
            <input id={`${id}-email`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("email.placeholder")} className={FIELD} />
            <Button type="submit" variant="outline" disabled={save.isPending || email.trim() === settings.email}>
              {t("save")}
            </Button>
          </form>,
          "email",
        )}
        {row(
          <Languages />,
          t("language.title"),
          t("language.text"),
          <div className="w-full">
            <label htmlFor={`${id}-language`} className="sr-only">
              {t("language.title")}
            </label>
            <FormSelect id={`${id}-language`} value={settings.language} onChange={(value) => save.mutate({ language: value as ReportSettings["language"] })}>
              {(["uz", "ru", "en"] as const).map((locale) => (
                <option key={locale} value={locale}>
                  {locales(locale)}
                </option>
              ))}
            </FormSelect>
          </div>,
          "language",
        )}
        {row(
          <Building2 />,
          t("agency.title"),
          agencyPlan ? t("agency.text") : t("agency.locked"),
          <form
            className="flex w-full gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate({ agencyName: agency.trim() });
            }}
          >
            <label htmlFor={`${id}-agency`} className="sr-only">
              {t("agency.title")}
            </label>
            <input
              id={`${id}-agency`}
              value={agency}
              maxLength={60}
              disabled={!agencyPlan}
              onChange={(event) => setAgency(event.target.value)}
              placeholder={t("agency.placeholder")}
              className={FIELD}
            />
            <Button type="submit" variant="outline" disabled={!agencyPlan || save.isPending || agency.trim() === settings.agencyName}>
              {t("save")}
            </Button>
          </form>,
          "agencyName",
        )}
      </div>
      <p role={error ? "alert" : undefined} className={cn("text-sm", error ? "text-destructive" : "sr-only")}>
        {error}
      </p>
    </div>
  );
}
