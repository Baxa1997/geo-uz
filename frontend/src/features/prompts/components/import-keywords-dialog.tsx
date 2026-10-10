"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { sameText } from "@/shared/helpers/prompts";
import type { SuggestedPrompt } from "@/shared/types/api";
import { FileDrop, type ListFile } from "./file-drop";
import { Modal } from "@/shared/components/modal";

/** Keywords sent at most: an SEO tool's export can hold thousands; the first are the ones that matter. */
const MAX_KEYWORDS = 50;
const SHOWN = 12;

/**
 * Peec's "Import keywords": a file from Google Search Console or another SEO tool, keywords in its first
 * column. The backend turns them into questions customers ask ChatGPT, which join the suggestions.
 */
export function ImportKeywordsDialog({
  projectId,
  open,
  onOpenChange,
  onImported,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (suggestions: SuggestedPrompt[]) => void;
}) {
  const t = useTranslations("PromptImport");
  const queryClient = useQueryClient();
  const [file, setFile] = useState<ListFile | null>(null);
  const keywords = file ? [...new Map(file.values.map((value) => [sameText(value), value])).values()].slice(0, MAX_KEYWORDS) : [];

  const send = useMutation({
    mutationFn: () => api.importKeywords(projectId, { keywords }),
    onSuccess: (created) => {
      queryClient.setQueryData<SuggestedPrompt[]>(queryKeys.promptSuggestions(projectId), (list = []) => [...created, ...list]);
      onImported(created);
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("keywordsTitle")}
      description={t("keywordsHint")}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button size="lg" disabled={keywords.length === 0 || send.isPending} onClick={() => send.mutate()}>
            <Sparkles aria-hidden data-icon="inline-start" />
            {send.isPending ? t("suggesting") : t("suggest")}
          </Button>
        </>
      }
    >
      <FileDrop file={file} onFile={setFile} />
      {file && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">
            {t("keywordsFound", { count: keywords.length })}
            {file.values.length > MAX_KEYWORDS && <span className="font-normal text-muted-foreground"> · {t("keywordsFirst", { max: MAX_KEYWORDS })}</span>}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {keywords.slice(0, SHOWN).map((keyword) => (
              <li key={keyword} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                {keyword}
              </li>
            ))}
            {keywords.length > SHOWN && <li className="px-1 py-0.5 text-xs text-muted-foreground">{t("keywordsMore", { count: keywords.length - SHOWN })}</li>}
          </ul>
        </div>
      )}
      {send.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}
    </Modal>
  );
}
