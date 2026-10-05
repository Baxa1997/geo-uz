"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Circle, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { EngineIcon } from "@/shared/components/engine-icon";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { ENGINES } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { RunProgress, RunStatus } from "@/shared/types/api";
import { RUN_POLL_MS } from "../constants";

const STEPS = ["queued", "running", "analyzing"] as const;

const isOver = (status: RunStatus) => status === "done" || status === "failed";

/** The ring: its radius, and where each engine sits on it (degrees from the top, clockwise). */
const RADIUS = 104;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANGLES = [0, 120, 240];

/**
 * The first run, polled until it's done; then the project's Overview. The brand's initial in a ring of
 * the engines that fills as answers come in (only ChatGPT is asked for now), then the stage in words.
 */
export function RunProgressView({ initial, brand }: { initial: RunProgress; brand: string }) {
  const t = useTranslations("RunProgress");
  const engines = useTranslations("Engines");
  const router = useRouter();
  const { data: progress, isError } = useQuery({
    queryKey: queryKeys.runProgress(initial.id),
    queryFn: () => api.getRunProgress(initial.id),
    initialData: initial,
    refetchInterval: (query) => (query.state.data && isOver(query.state.data.status) ? false : RUN_POLL_MS),
  });
  const { status, answered, total, projectId } = progress;
  const overview = `/projects/${projectId}`;

  useEffect(() => {
    if (status === "done") router.replace(overview);
  }, [status, overview, router]);

  // Steps before the current one are done; "done" is past the last step
  const current = status === "done" ? STEPS.length : status === "failed" ? -1 : STEPS.indexOf(status);
  const share = status === "done" ? 1 : total > 0 ? answered / total : 0;
  const answeredText = t("answered", { answered, total });

  return (
    <section aria-labelledby="run-title" className="flex flex-col items-center gap-8 text-center">
      <div
        role="progressbar"
        aria-label={t("progressLabel")}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-valuetext={answeredText}
        className="relative size-60"
      >
        <svg viewBox="0 0 240 240" aria-hidden className="size-full -rotate-90">
          <circle cx="120" cy="120" r={RADIUS} fill="none" className="stroke-border" strokeWidth="2" />
          <circle
            cx="120"
            cy="120"
            r={RADIUS}
            fill="none"
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none",
              status === "failed" ? "stroke-negative" : "stroke-you",
            )}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - share)}
          />
        </svg>
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border bg-background text-2xl font-medium shadow-sm"
        >
          {brand.charAt(0).toUpperCase()}
        </span>
        {ENGINES.map(({ key, live }, index) => {
          const angle = (ANGLES[index] * Math.PI) / 180;
          return (
            <span
              key={key}
              title={live ? engines(key) : `${engines(key)} · ${engines("soon")}`}
              style={{ left: `${50 + (RADIUS / 240) * 100 * Math.sin(angle)}%`, top: `${50 - (RADIUS / 240) * 100 * Math.cos(angle)}%` }}
              className={cn(
                "absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm",
                !live && "opacity-40",
                live && !isOver(status) && "animate-pulse motion-reduce:animate-none",
              )}
            >
              <EngineIcon engine={key} className="size-5" />
              <span className="sr-only">{engines(key)}</span>
            </span>
          );
        })}
      </div>

      <div className="flex max-w-md flex-col gap-2">
        <p className="truncate text-sm text-muted-foreground">{brand}</p>
        <h1 id="run-title" className="text-2xl font-semibold tracking-tight text-balance">
          {status === "done" ? t("doneTitle") : status === "failed" ? t("failedTitle") : t("title")}
        </h1>
        <p className="text-sm text-pretty text-muted-foreground">
          {status === "failed" ? t("failedText") : t("description")}
        </p>
        {status !== "failed" && (
          <p className="text-sm font-medium tabular-nums">
            {answeredText} · {Math.round(share * 100)}%
          </p>
        )}
      </div>

      <ol className="flex flex-col gap-2 text-left sm:flex-row sm:gap-5">
        {STEPS.map((step, index) => {
          const state = index < current ? "done" : index === current ? "active" : "todo";
          return (
            <li
              key={step}
              aria-current={state === "active" ? "step" : undefined}
              className={cn("flex items-center gap-2 text-sm", state === "todo" && "text-muted-foreground")}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  state === "done" ? "bg-positive text-white" : state === "active" ? "bg-you-soft text-you" : "bg-muted",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3" />
                ) : state === "active" ? (
                  <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Circle className="size-1.5 fill-current" />
                )}
              </span>
              <span className={cn(state === "active" && "font-medium")}>{t(`steps.${step}`)}</span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col items-center gap-3">
        <Link href={overview} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
          {t("skip")}
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Link>
        <p className="max-w-sm text-xs text-pretty text-muted-foreground">
          {isError ? t("loadFailed") : status === "failed" ? null : t("note")}
        </p>
      </div>

      {/* Announces each new stage, not every answer */}
      <p aria-live="polite" className="sr-only">
        {t(`status.${status}`)}
      </p>
    </section>
  );
}
