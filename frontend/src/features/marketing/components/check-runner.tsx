"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { cn } from "@/shared/helpers/utils";
import { CHECK_STEPS as STEPS, CHECK_STEP_MS as STEP_MS } from "../constants";
import { SnapshotPreview } from "./snapshot-preview";

/** Runs POST /snapshot behind a staged progress screen, then shows the free result. */
export function CheckRunner({ site }: { site: string }) {
  const t = useTranslations("Check");
  const queryClient = useQueryClient();
  const key = queryKeys.snapshot(site);
  // A snapshot calls ChatGPT 10 times: never refetch it on its own
  const snapshot = useQuery({
    queryKey: key,
    queryFn: () => api.createSnapshot({ domain: site }),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  // Steps advance on a timer; coming back to an already finished check skips them
  const [tick, setTick] = useState(() => (queryClient.getQueryData(key) ? STEPS.length : 0));

  useEffect(() => {
    if (tick >= STEPS.length) return;
    const timer = setTimeout(() => setTick((value) => value + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [tick]);

  if (snapshot.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{t("running", { site })}</h1>
          <p role="alert" className="text-sm text-destructive">
            {t("failed")}
          </p>
          <Button
            size="lg"
            onClick={() => {
              setTick(0);
              void snapshot.refetch();
            }}
          >
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (snapshot.data && tick >= STEPS.length) return <SnapshotPreview snapshot={snapshot.data} />;

  const current = Math.min(tick, STEPS.length - 1);
  const percent = 5 + Math.round((Math.min(tick, STEPS.length) / STEPS.length) * 90);

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold tracking-tight break-all">{t("running", { site })}</h1>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div
          role="progressbar"
          aria-label={t("running", { site })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-you transition-[width] duration-1000 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => {
            const state = index < current ? "done" : index === current ? "active" : "pending";
            const Icon = state === "done" ? CircleCheck : state === "active" ? LoaderCircle : Circle;
            return (
              <li
                key={step}
                className={cn("flex items-center gap-2.5 text-sm", state === "pending" && "text-muted-foreground")}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    state === "done" && "text-positive",
                    state === "active" && "animate-spin text-you motion-reduce:animate-none",
                    state === "pending" && "text-muted-foreground/50",
                  )}
                />
                <span className={cn(state === "active" && "font-medium")}>{t(step)}</span>
              </li>
            );
          })}
        </ol>
        <p aria-live="polite" className="sr-only">
          {t(STEPS[current])}
        </p>
      </CardContent>
    </Card>
  );
}
