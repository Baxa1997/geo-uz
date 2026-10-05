"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { labelFor } from "@/shared/helpers/labels";
import type { Prompt, SuggestedPrompt } from "@/shared/types/api";

type Decision = { suggestion: SuggestedPrompt; accept: boolean };

/**
 * Questions buyers ask that the project doesn't track yet, each accepted or rejected in one click.
 * An accepted one joins the question list at once and is asked from the next weekly run.
 */
export function PromptSuggestions({ projectId, suggestions }: { projectId: string; suggestions: SuggestedPrompt[] }) {
  const t = useTranslations("PromptManager");
  const messages = useMessages();
  const queryClient = useQueryClient();
  const [announcement, setAnnouncement] = useState("");

  const decide = useMutation({
    mutationFn: async ({ suggestion, accept }: Decision): Promise<Prompt | null> =>
      accept
        ? api.acceptPromptSuggestion(projectId, suggestion.id)
        : api.rejectPromptSuggestion(projectId, suggestion.id).then(() => null),
    onSuccess: (prompt, { suggestion, accept }) => {
      queryClient.setQueryData<SuggestedPrompt[]>(queryKeys.promptSuggestions(projectId), (list) =>
        list?.filter((item) => item.id !== suggestion.id),
      );
      if (prompt) queryClient.setQueryData<Prompt[]>(queryKeys.prompts(projectId), (list) => [...(list ?? []), prompt]);
      setAnnouncement(t(accept ? "accepted" : "rejected", { text: suggestion.text }));
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-pretty text-muted-foreground">{t("suggestedIntro")}</p>
      {decide.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("suggestionFailed")}
        </p>
      )}
      {suggestions.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {t("suggestedEmpty")}
        </p>
      ) : (
        <ul className="-mx-4 divide-y border-y">
          {suggestions.map((suggestion) => {
            const busy = decide.isPending && decide.variables?.suggestion.id === suggestion.id;
            return (
              <li key={suggestion.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="text-sm text-pretty">
                    <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">
                      {suggestion.language}
                    </span>
                    <span lang={suggestion.language}>{suggestion.text}</span>
                  </p>
                  <span className="inline-flex w-fit rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap">
                    {labelFor(messages.Topics, suggestion.topic)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={t("rejectLabel", { text: suggestion.text })}
                    onClick={() => decide.mutate({ suggestion, accept: false })}
                  >
                    <X aria-hidden data-icon="inline-start" />
                    {t("reject")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    aria-label={t("acceptLabel", { text: suggestion.text })}
                    onClick={() => decide.mutate({ suggestion, accept: true })}
                  >
                    <Plus aria-hidden data-icon="inline-start" />
                    {t("accept")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
