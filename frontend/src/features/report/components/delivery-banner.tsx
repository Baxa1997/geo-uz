"use client";

import { useMutation } from "@tanstack/react-query";
import { Send, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Modal } from "@/shared/components/modal";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/api/client";
import type { Plan, ReportSettings } from "@/shared/types/api";
import { ReportDelivery } from "./report-delivery";

/**
 * Where the weekly report goes, as one line under the reports: the way to get it in Telegram every Monday
 * (one click) or where it goes already, and "Settings" for the rest (email, language, the agency's name)
 * in a window, so the page stays about the reports.
 */
export function DeliveryBanner({ projectId, initial, plan }: { projectId: string; initial: ReportSettings; plan: Plan }) {
  const t = useTranslations("Reports.delivery");
  const locales = useTranslations("Locales");
  const [settings, setSettings] = useState(initial);
  const [open, setOpen] = useState(false);
  const connect = useMutation({ mutationFn: () => api.updateReportSettings(projectId, { telegram: "connect" }), onSuccess: setSettings });

  const where = [
    settings.telegramChat ? t("banner.telegramTo", { chat: settings.telegramChat }) : t("banner.telegramNone"),
    settings.email ? t("banner.emailTo", { email: settings.email }) : t("banner.emailNone"),
    t("banner.language", { language: locales(settings.language) }),
  ].join(" · ");

  return (
    <>
      <div data-tour="delivery" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:px-5">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-telegram text-white">
          <Send className="size-[1.125rem]" />
        </span>
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
          <p className="text-[0.9375rem] font-medium text-pretty">{settings.telegramChat ? t("banner.on") : t("banner.off")}</p>
          <p className="text-sm text-pretty text-muted-foreground">{where}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!settings.telegramChat && (
            <Button disabled={connect.isPending} onClick={() => connect.mutate()} className="bg-telegram text-white hover:bg-telegram-hover">
              <Send aria-hidden data-icon="inline-start" />
              {t("telegram.connect")}
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(true)} className="bg-background">
            <Settings2 aria-hidden data-icon="inline-start" />
            {t("banner.settings")}
          </Button>
        </div>
      </div>
      <Modal open={open} onOpenChange={setOpen} title={t("title")} description={t("description")} closeButton className="sm:w-[min(46rem,94vw)]">
        <ReportDelivery projectId={projectId} initial={settings} plan={plan} onSaved={setSettings} />
      </Modal>
    </>
  );
}
