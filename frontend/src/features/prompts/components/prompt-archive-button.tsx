"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { isTracked } from "@/shared/helpers/prompts";
import type { Prompt } from "@/shared/types/api";

/**
 * On a question's page: archives the question (it isn't asked any more, its results stay) or, for an
 * archived one, tracks it again from the next weekly check, while the plan has room.
 */
export function PromptArchiveButton({ projectId, prompt, full }: { projectId: string; prompt: Prompt; full: boolean }) {
  const t = useTranslations("PromptManager");
  const router = useRouter();
  const queryClient = useQueryClient();
  const tracked = isTracked(prompt);
  const mutation = useMutation({
    mutationFn: () => api.archivePrompt(projectId, prompt.id, { archived: tracked }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts(projectId) });
      // The page is rendered on the server from the question's status
      router.refresh();
    },
  });
  const blocked = !tracked && full;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        variant="outline"
        disabled={mutation.isPending || blocked}
        title={blocked ? t("limitReached") : tracked ? t("archiveHint") : undefined}
        onClick={() => mutation.mutate()}
      >
        {tracked ? <Archive aria-hidden data-icon="inline-start" /> : <ArchiveRestore aria-hidden data-icon="inline-start" />}
        {tracked ? t("archive") : t("restore")}
      </Button>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("saveFailed")}
        </p>
      )}
    </div>
  );
}
