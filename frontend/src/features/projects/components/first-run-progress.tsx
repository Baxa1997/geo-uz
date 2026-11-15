"use client";

import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CircleNotchIcon as LoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";
import type { FirstRun } from "@/shared/types/api";
import { FIRST_RUN_STEPS as STEPS } from "../constants";

/**
 * A first run under way: its three stages with the one being done marked, and the answers counted as
 * they come in. The numbers are the backend's, not a timer's.
 */
export function FirstRunProgress({ run, stale }: { run: FirstRun; stale: boolean }) {
  const t = useTranslations("FirstRun");
  // "queued" is before the first stage
  const current = Math.max(0, STEPS.indexOf(run.status as (typeof STEPS)[number]));
  // The site is a tenth of the way, the answers most of it, reading them the rest
  const share = run.status === "reading_answers" ? 0.92 : run.status === "asking" && run.total > 0 ? 0.1 + 0.8 * (run.answered / run.total) : 0.04;
  const counted = run.total > 0 ? t("answered", { answered: run.answered, total: run.total }) : null;

  return (
    <section aria-labelledby="first-run-title" className="my-auto flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{run.domain}</p>
        <h1 id="first-run-title" className="text-3xl font-bold tracking-[-0.03em] text-balance">
          {t("runningTitle")}
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">{t("runningText")}</p>
      </div>
      <div className="flex flex-col gap-5 rounded-xl border bg-background p-5 sm:p-6">
        <div
          role="progressbar"
          aria-label={t("runningTitle")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          aria-valuetext={counted ?? t(`steps.${STEPS[current]}.title`)}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${share * 100}%` }} />
        </div>
        <ol className="flex flex-col">
          {STEPS.map((step, index) => {
            const state = index < current ? "done" : index === current ? "active" : "todo";
            return (
              <li key={step} aria-current={state === "active" ? "step" : undefined} className={cn("flex items-start gap-3 border-t py-3.5 first:border-t-0 first:pt-0 last:pb-0", state === "todo" && "text-muted-foreground")}>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                    state === "done" ? "bg-positive text-white" : state === "active" ? "bg-brand text-brand-foreground" : "bg-muted",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : state === "active" ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /> : index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn(state === "active" && "font-semibold")}>{t(`steps.${step}.title`)}</span>
                  {state === "active" && <span className="text-sm text-pretty text-muted-foreground">{t(`steps.${step}.text`)}</span>}
                </span>
                {step === "asking" && state !== "todo" && counted && <span className="shrink-0 text-sm font-medium tabular-nums">{counted}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-sm text-pretty text-muted-foreground">{stale ? t("loadFailed") : t("note")}</p>
      {/* Announces each new stage, not every answer */}
      <p aria-live="polite" className="sr-only">
        {t(`steps.${STEPS[current]}.title`)}
      </p>
    </section>
  );
}
