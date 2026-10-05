"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMessages, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { LanguageToggle } from "@/shared/components/language-toggle";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { api } from "@/shared/api/client";
import { labelFor } from "@/shared/helpers/labels";
import { queryKeys } from "@/shared/api/query-keys";
import type { CreatePromptRequest, Prompt, PromptLanguage } from "@/shared/types/api";
import { PROMPT_TEXT_MAX_LENGTH, PROMPT_TEXT_MIN_LENGTH } from "@/shared/constants";

/** Adds a prompt, or edits `prompt` when given. */
export function PromptForm({
  projectId,
  prompt,
  defaultLanguage,
  existing,
  onDone,
}: {
  projectId: string;
  prompt?: Prompt;
  defaultLanguage: PromptLanguage;
  existing: Prompt[];
  onDone: () => void;
}) {
  const t = useTranslations("PromptForm");
  const messages = useMessages();
  const id = useId();
  const queryClient = useQueryClient();
  const [text, setText] = useState(prompt?.text ?? "");
  const [language, setLanguage] = useState<PromptLanguage>(prompt?.language ?? defaultLanguage);
  const [topic, setTopic] = useState(prompt?.topic ?? "");
  const [errors, setErrors] = useState<{ text?: string; topic?: string }>({});

  const key = queryKeys.prompts(projectId);
  const mutation = useMutation({
    mutationFn: (body: CreatePromptRequest) =>
      prompt ? api.updatePrompt(projectId, prompt.id, body) : api.createPrompt(projectId, body),
    onSuccess: (saved) => {
      queryClient.setQueryData<Prompt[]>(key, (old = []) =>
        prompt ? old.map((p) => (p.id === saved.id ? saved : p)) : [...old, saved],
      );
      void queryClient.invalidateQueries({ queryKey: key });
      onDone();
    },
  });

  const topics = [...new Set(existing.map((p) => p.topic))];

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { text: text.trim().replace(/\s+/g, " "), language, topic: topic.trim() };
    const next: typeof errors = {};
    if (body.text.length < PROMPT_TEXT_MIN_LENGTH) {
      next.text = t("textShort");
    } else if (
      existing.some((p) => p.id !== prompt?.id && p.text.toLowerCase() === body.text.toLowerCase())
    ) {
      next.text = t("textDuplicate");
    }
    if (!body.topic) next.topic = t("topicRequired");
    setErrors(next);
    if (!next.text && !next.topic) mutation.mutate(body);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-lg border bg-card p-3">
      <p className="text-sm font-medium">{prompt ? t("editTitle") : t("addTitle")}</p>

      <Field data-invalid={Boolean(errors.text)}>
        <FieldLabel htmlFor={`${id}-text`}>{t("text")}</FieldLabel>
        <Textarea
          id={`${id}-text`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("textPlaceholder")}
          rows={2}
          maxLength={PROMPT_TEXT_MAX_LENGTH}
          autoFocus
          aria-invalid={Boolean(errors.text)}
        />
        <FieldError>{errors.text}</FieldError>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <LanguageToggle legend={t("language")} value={language} onChange={setLanguage} />

        <Field data-invalid={Boolean(errors.topic)}>
          <FieldLabel htmlFor={`${id}-topic`}>{t("topic")}</FieldLabel>
          <Input
            id={`${id}-topic`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("topicPlaceholder")}
            list={`${id}-topics`}
            className="h-10"
            aria-invalid={Boolean(errors.topic)}
          />
          <datalist id={`${id}-topics`}>
            {topics.map((value) => (
              <option key={value} value={value} label={labelFor(messages.Topics, value)} />
            ))}
          </datalist>
          <FieldError>{errors.topic}</FieldError>
        </Field>
      </div>

      {prompt && <p className="text-xs text-muted-foreground">{t("editHint")}</p>}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("saveFailed")}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
