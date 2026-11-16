"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { FirstRun } from "@/shared/types/api";
import { RUN_POLL_MS } from "../constants";
import { FirstRunProgress } from "./first-run-progress";
import { FirstRunResultView } from "./first-run-result";
import { FirstRunSetup } from "./first-run-setup";
import { OnboardingHeader } from "./onboarding-header";

/** Nothing changes by itself in these: done and failed for good, `ready` until the owner confirms. */
const isResting = (run: FirstRun) => run.status === "done" || run.status === "failed" || run.status === "ready";
const BEFORE_CHECK = ["queued", "reading_site", "ready"];

type Frame = { who: string | null; year: number };

/**
 * The first check, confirm first and check after: the website → what we read from it, corrected in steps
 * (FirstRunSetup) → the check's progress, asked for every second → the first statistics.
 */
export function FirstRunFlow({ initial, site = "", ...frame }: Frame & { initial: FirstRun | null; /** A website given on the landing page, filled into the form. */ site?: string }) {
  if (!initial) return <FirstRunSetup run={null} site={site} {...frame} />;
  return <FirstRunStarted initial={initial} {...frame} />;
}

function FirstRunStarted({ initial, ...frame }: Frame & { initial: FirstRun }) {
  const t = useTranslations("FirstRun");
  const router = useRouter();
  const { data: run, isError } = useQuery({
    queryKey: queryKeys.firstRun(initial.id),
    queryFn: () => api.getFirstRun(initial.id),
    initialData: initial,
    refetchInterval: (query) => (query.state.data && isResting(query.state.data) ? false : RUN_POLL_MS),
  });
  // The statistics never change once the run is done
  const result = useQuery({
    queryKey: queryKeys.firstRunResult(run.id),
    queryFn: () => api.getFirstRunResult(run.id),
    enabled: run.status === "done",
    staleTime: Infinity,
  });
  const again = () => router.replace("/onboarding/first-run");

  if (BEFORE_CHECK.includes(run.status)) return <FirstRunSetup run={run} {...frame} />;

  if (result.data) {
    return (
      <Centered who={frame.who}>
        <FirstRunResultView result={result.data} runId={run.id} onAgain={again} />
      </Centered>
    );
  }

  if (run.status === "failed" || result.isError) {
    return (
      <Centered who={frame.who}>
        <section className="my-auto flex flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t("failedTitle", { site: run.domain })}</h1>
          <p role="alert" className="text-pretty text-muted-foreground">
            {t(run.error === "site_unreadable" ? "failedSite" : "failedText")}
          </p>
          <Button size="lg" className="h-11 px-5" onClick={again}>
            {t("tryAgain")}
          </Button>
        </section>
      </Centered>
    );
  }

  return (
    <Centered who={frame.who}>
      <FirstRunProgress run={run} stale={isError} />
    </Centered>
  );
}

/** The check and its statistics: one column in the middle, under the header. */
function Centered({ who, children }: { who: string | null; children: ReactNode }) {
  return (
    <>
      <OnboardingHeader who={who} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:py-14">{children}</main>
    </>
  );
}
