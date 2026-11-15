"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import type { FirstRun } from "@/shared/types/api";
import { RUN_POLL_MS } from "../constants";
import { FirstRunForm } from "./first-run-form";
import { FirstRunProgress } from "./first-run-progress";
import { FirstRunResultView } from "./first-run-result";

const isOver = (run: FirstRun) => run.status === "done" || run.status === "failed";

/** Website → the run's progress, asked for every second → the first statistics. */
export function FirstRunFlow({ initial }: { initial: FirstRun | null }) {
  const router = useRouter();
  if (!initial) return <FirstRunForm onStarted={(run) => router.replace({ pathname: "/onboarding/first-run", query: { run: run.id } })} />;
  return <FirstRunStarted initial={initial} />;
}

function FirstRunStarted({ initial }: { initial: FirstRun }) {
  const t = useTranslations("FirstRun");
  const router = useRouter();
  const { data: run, isError } = useQuery({
    queryKey: queryKeys.firstRun(initial.id),
    queryFn: () => api.getFirstRun(initial.id),
    initialData: initial,
    refetchInterval: (query) => (query.state.data && isOver(query.state.data) ? false : RUN_POLL_MS),
  });
  // The statistics never change once the run is done
  const result = useQuery({
    queryKey: queryKeys.firstRunResult(run.id),
    queryFn: () => api.getFirstRunResult(run.id),
    enabled: run.status === "done",
    staleTime: Infinity,
  });
  const again = () => router.replace("/onboarding/first-run");

  if (result.data) return <FirstRunResultView result={result.data} runId={run.id} onAgain={again} />;

  if (run.status === "failed" || result.isError) {
    return (
      <section className="my-auto flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("failedTitle", { site: run.domain })}</h1>
        <p role="alert" className="text-pretty text-muted-foreground">
          {t(run.error === "site_unreadable" ? "failedSite" : "failedText")}
        </p>
        <Button size="lg" className="h-11 px-5" onClick={again}>
          {t("tryAgain")}
        </Button>
      </section>
    );
  }

  return <FirstRunProgress run={run} stale={isError} />;
}
