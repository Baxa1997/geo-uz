"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { ApiError, adminApi } from "@/shared/api/client";

/**
 * Approve a waiting check (the user's "Run now, rest automatic"): a second press says what it costs and starts it, past
 * the day's limit. The list is then asked again, and the check shows under "Running now".
 */
export function ApproveButton({ runId, usd }: { runId: string; usd: string }) {
  const t = useTranslations("Admin.waiting");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const approve = useMutation({
    mutationFn: () => adminApi.approve(runId),
    onSuccess: () => router.refresh(),
    // 409: the timer took it, or it was approved in another tab; the list is out of date
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) router.refresh();
    },
  });

  if (approve.isSuccess) {
    return (
      <span role="status" className="text-xs text-muted-foreground">
        {t("started")}
      </span>
    );
  }
  if (!confirming) {
    return (
      <Button size="sm" onClick={() => setConfirming(true)}>
        {t("approve")}
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={approve.isPending}
          onClick={() => {
            setConfirming(false);
            approve.reset();
          }}
        >
          {t("cancel")}
        </Button>
        <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate()}>
          {approve.isPending ? t("starting") : t("confirm", { usd })}
        </Button>
      </div>
      {approve.isError && (
        <p role="alert" className="text-xs text-negative">
          {t(approve.error instanceof ApiError && approve.error.status === 409 ? "taken" : "approveFailed")}
        </p>
      )}
    </div>
  );
}
