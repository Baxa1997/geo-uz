"use client";

import { ClockIcon as Clock } from "@phosphor-icons/react/dist/ssr/Clock";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import type { FirstRun } from "@/shared/types/api";
import { FirstRunScreen } from "./first-run-screen";

/**
 * A check confirmed past the day's free checks (the user, 22 Nov 2026: "Cap at 2 a day + queue"): it waits in the
 * queue with what the owner confirmed, the team runs the queue by hand (`python -m app.queue`), and the report is
 * emailed. Shown after the last step and whenever the account comes back before its check has run.
 */
export function FirstRunQueued({ run, who }: { run: FirstRun; who: string | null }) {
  const t = useTranslations("FirstRun.queued");
  return (
    <FirstRunScreen
      who={who}
      footer={
        <div className="flex justify-end">
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
            {t("home")}
          </Link>
        </div>
      }
    >
      <section className="my-auto flex flex-col items-start gap-5">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Clock aria-hidden className="size-6" weight="bold" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{t("title")}</h1>
          <p className="max-w-xl text-pretty text-muted-foreground">{t("text", { site: run.domain, email: run.email ?? t("yourEmail") })}</p>
        </div>
        {run.place && (
          <div className="flex flex-col gap-0.5 rounded-xl border px-4 py-3">
            <span className="text-sm text-muted-foreground">{t("place")}</span>
            <span className="text-3xl font-semibold tabular-nums">{run.place}</span>
          </div>
        )}
        <p className="max-w-xl text-sm text-pretty text-muted-foreground">{t("next")}</p>
      </section>
    </FirstRunScreen>
  );
}
