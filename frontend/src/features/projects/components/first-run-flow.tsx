"use client";

import { CircleNotchIcon as CircleNotch } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { FirstRun } from "@/shared/types/api";
import { PARTIAL_POLL_MS, RUN_POLL_MS } from "../constants";
import { FirstRunLive } from "./first-run-live";
import { FirstRunProgress } from "./first-run-progress";
import { FirstRunQueued } from "./first-run-queued";
import { FirstRunResultView } from "./first-run-result";
import { FirstRunScreen } from "./first-run-screen";
import { FirstRunSetup } from "./first-run-setup";

/** Nothing changes by itself in these: done and failed for good, `ready` until the owner confirms, `waiting` until
 * the team runs the queue (its report is emailed, so the page isn't asked every second for days). */
const isResting = (run: FirstRun) => run.status === "done" || run.status === "failed" || run.status === "ready" || run.status === "waiting";
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
  const running = run.status === "asking" || run.status === "reading_answers";
  // What the check has so far, once it is asking: the statistics fill in before the check ends
  const partial = useQuery({
    queryKey: queryKeys.firstRunPartial(run.id),
    queryFn: () => api.getFirstRunPartial(run.id),
    enabled: running,
    refetchInterval: running ? PARTIAL_POLL_MS : false,
  });
  const again = () => router.replace("/onboarding/first-run");
  // The check saved itself as the project when it ended (the user, 23 Nov 2026: "automatically save the project and
  // navigate to dashboard"): its dashboard opens in the place of the short statistics
  const saved = run.status === "done" ? run.projectId : null;
  useEffect(() => {
    if (saved) router.replace(`/projects/${saved}`);
  }, [saved, router]);

  if (BEFORE_CHECK.includes(run.status)) return <FirstRunSetup run={run} {...frame} />;

  if (saved) {
    return (
      <FirstRunScreen who={frame.who}>
        <section className="my-auto flex items-center gap-3 self-center text-muted-foreground" role="status">
          <CircleNotch aria-hidden className="size-5 animate-spin text-brand motion-reduce:animate-none" />
          {t("opening", { site: run.domain })}
        </section>
      </FirstRunScreen>
    );
  }

  if (run.status === "waiting") return <FirstRunQueued run={run} who={frame.who} />;

  if (result.data) return <FirstRunResultView result={result.data} runId={run.id} onAgain={again} who={frame.who} />;

  if (run.status === "failed" || result.isError) {
    return (
      <FirstRunScreen who={frame.who}>
        <section className="my-auto flex flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t("failedTitle", { site: run.domain })}</h1>
          <p role="alert" className="text-pretty text-muted-foreground">
            {t(run.error === "site_unreadable" ? "failedSite" : "failedText")}
          </p>
          <Button size="lg" className="h-11 px-5" onClick={again}>
            {t("tryAgain")}
          </Button>
        </section>
      </FirstRunScreen>
    );
  }

  if (partial.data && partial.data.answered > 0) return <FirstRunLive run={run} partial={partial.data} who={frame.who} />;

  return <FirstRunProgress run={run} stale={isError} who={frame.who} />;
}
