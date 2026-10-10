"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { FormSelect } from "@/shared/components/form-select";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { PROMPT_TEXT_MAX_LENGTH, PROMPT_TEXT_MIN_LENGTH } from "@/shared/constants";
import { languageOfText, sameText } from "@/shared/helpers/prompts";
import { cn } from "@/shared/helpers/utils";
import type { Prompt, PromptLanguage } from "@/shared/types/api";
import { FileDrop, type ListFile } from "./file-drop";
import { Modal } from "@/shared/components/modal";

type Mode = "write" | "file";
type LanguageChoice = PromptLanguage | "auto";

/** The topic list's last choice: a topic the window makes as it adds the questions. */
const NEW_TOPIC = "\u0000new";
/** How many of a file's questions the window lists before "and N more". */
const PREVIEW = 5;

export interface TopicOption {
  value: string;
  label: string;
}

/** The questions a text holds, one per line, tidied, without empty lines or repeats. */
function linesOf(text: string): string[] {
  const lines = text.split("\n").map((line) => line.trim().replace(/\s+/g, " ")).filter(Boolean);
  return [...new Map(lines.map((line) => [sameText(line), line])).values()];
}

/**
 * Adds questions, laid out like Peec's "Add prompt" window, or edits one (`prompt`). Two ways to add,
 * switched at the top: written, one question per line (Peec: "Every line will be a separate prompt"),
 * or from a file (Peec's "Bulk upload": a CSV's first column or a text file's lines). Then the topic (one
 * of the project's, or a new one), where the questions are asked from (the project's city unless another
 * is picked, as Peec's location) and the language, guessed from each question's letters unless chosen.
 * Tags are added in the table, as on Peec.
 *
 * Written questions are added only if every one is fine; a file's questions that are too short, too
 * long or asked already are skipped and counted. Neither may pass the plan's room (`room`).
 */
export function AddPromptDialog({
  projectId,
  open,
  onOpenChange,
  prompt,
  topics,
  defaultTopic,
  defaultLocation,
  existing,
  room,
  onSaved,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The question to edit; without it the window adds. */
  prompt?: Prompt;
  topics: TopicOption[];
  defaultTopic: string;
  /** Where a new question is asked from: the project's city. */
  defaultLocation: string;
  /** Every question of the project, archived ones too: none may be added twice. */
  existing: Prompt[];
  /** How many more questions the plan takes. */
  room: number;
  onSaved: (prompts: Prompt[]) => void;
}) {
  const t = useTranslations("PromptForm");
  const languages = useTranslations("Locales");
  const messages = useMessages();
  const id = useId();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("write");
  const [text, setText] = useState(prompt?.text ?? "");
  const [language, setLanguage] = useState<LanguageChoice>(prompt?.language ?? "auto");
  const [topic, setTopic] = useState(prompt?.topic ?? (defaultTopic || topics[0]?.value || NEW_TOPIC));
  const [newTopic, setNewTopic] = useState("");
  const [location, setLocation] = useState(prompt?.location ?? defaultLocation);
  const [file, setFile] = useState<ListFile | null>(null);
  const [error, setError] = useState("");

  const others = new Set(existing.filter((candidate) => candidate.id !== prompt?.id).map((candidate) => sameText(candidate.text)));
  const fits = (line: string) => line.length >= PROMPT_TEXT_MIN_LENGTH && line.length <= PROMPT_TEXT_MAX_LENGTH && !others.has(sameText(line));
  const written = linesOf(text);
  const fromFile = file ? [...new Map(file.values.map((value) => [sameText(value), value.replace(/\s+/g, " ")])).values()] : [];
  const usable = fromFile.filter(fits);
  const count = prompt ? 1 : mode === "write" ? written.length : usable.length;
  const chosenTopic = topic === NEW_TOPIC ? newTopic.trim().replace(/\s+/g, " ") : topic;

  const save = useMutation({
    mutationFn: async (lines: string[]): Promise<Prompt[]> => {
      const languageOf = (line: string) => (language === "auto" ? languageOfText(line) : language);
      if (prompt) {
        const [line = ""] = lines;
        return [await api.updatePrompt(projectId, prompt.id, { text: line, language: languageOf(line), topic: chosenTopic, location })];
      }
      return api.createPrompts(projectId, { prompts: lines.map((line) => ({ text: line, language: languageOf(line), topic: chosenTopic, location })) });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<Prompt[]>(queryKeys.prompts(projectId), (list = []) =>
        prompt ? list.map((candidate) => saved.find((item) => item.id === candidate.id) ?? candidate) : [...list, ...saved],
      );
      // A new topic joins the topics column
      void queryClient.invalidateQueries({ queryKey: queryKeys.topics(projectId) });
      onSaved(saved);
    },
    onError: () => setError(t("saveFailed")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const lines = mode === "write" || prompt ? written : usable;
    const wrong = mode === "write" || prompt ? lines.find((line) => !fits(line)) : undefined;
    if (lines.length === 0) setError(t(mode === "file" && !prompt ? (file ? "fileNothing" : "fileMissing") : "textShort"));
    else if (prompt && lines.length > 1) setError(t("editOne"));
    else if (wrong !== undefined)
      setError(
        others.has(sameText(wrong))
          ? t("textDuplicate", { text: wrong })
          : wrong.length < PROMPT_TEXT_MIN_LENGTH
            ? t("textShortLine", { text: wrong })
            : t("textLong", { max: PROMPT_TEXT_MAX_LENGTH }),
      );
    else if (!chosenTopic) setError(t("topicRequired"));
    else if (!prompt && lines.length > room) setError(t("noRoom", { count: lines.length, room }));
    else save.mutate(lines);
  }

  const topicField = (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-topic`} className="text-sm text-muted-foreground">
        {t("topic")}
      </label>
      <FormSelect id={`${id}-topic`} value={topic} onChange={setTopic}>
        {topics.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={NEW_TOPIC}>{t("newTopicOption")}</option>
      </FormSelect>
      {topic === NEW_TOPIC && (
        <input
          aria-label={t("newTopic")}
          value={newTopic}
          onChange={(event) => setNewTopic(event.target.value)}
          placeholder={t("newTopicPlaceholder")}
          maxLength={60}
          className="h-11 rounded-xl border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      )}
    </div>
  );

  // Where the questions are asked from, as Peec's location: a city of the country, the project's by default
  const locationField = (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-location`} className="text-sm text-muted-foreground">
        {t("location")}
      </label>
      <FormSelect id={`${id}-location`} value={location} onChange={setLocation}>
        {Object.entries(messages.Cities).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={prompt ? t("editTitle") : mode === "write" ? t("addTitle") : t("fileTitle")}
      description={prompt ? t("editHint") : mode === "write" ? t("addHint") : t("fileHint")}
      top={
        !prompt && (
          // Peec's switch between writing and a file
          <div role="group" aria-label={t("modeLabel")} className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["write", "file"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => {
                  setMode(option);
                  setError("");
                }}
                className={cn(
                  "h-9 rounded-lg text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  mode === option ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`modes.${option}`)}
              </button>
            ))}
          </div>
        )
      }
      footer={
        <>
          <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form={`${id}-form`} size="lg" disabled={save.isPending}>
            {!prompt && <Plus aria-hidden data-icon="inline-start" />}
            {save.isPending ? t("saving") : prompt ? t("save") : count > 1 ? t("addMany", { count }) : t("add")}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} onSubmit={submit} noValidate className="flex flex-col gap-5">
        {mode === "write" || prompt ? (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <label htmlFor={`${id}-text`} className="text-muted-foreground">
                  {t("text")}
                </label>
                {!prompt && <span className="text-xs text-muted-foreground tabular-nums">{t("counter", { count: written.length, room })}</span>}
              </div>
              <textarea
                id={`${id}-text`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t(prompt ? "editPlaceholder" : "textPlaceholder")}
                rows={prompt ? 2 : 4}
                autoFocus
                aria-invalid={Boolean(error)}
                className="min-h-24 w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
              />
            </div>
            {topicField}
            {/* Location and language side by side, as in Peec's window */}
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
              {locationField}
              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-language`} className="text-sm text-muted-foreground">
                  {t("language")}
                </label>
                <FormSelect id={`${id}-language`} value={language} onChange={(value) => setLanguage(value as LanguageChoice)}>
                  {!prompt && <option value="auto">{t("languageAuto")}</option>}
                  <option value="uz">{languages("uz")}</option>
                  <option value="ru">{languages("ru")}</option>
                </FormSelect>
              </div>
            </div>
          </>
        ) : (
          <>
            <FileDrop
              file={file}
              onFile={(next) => {
                setFile(next);
                setError("");
              }}
            />
            {file && (
              <div className="flex flex-col gap-2 rounded-xl bg-muted/60 px-3.5 py-3 text-sm">
                <p className="font-medium">
                  {t("fileFound", { count: usable.length })}
                  {fromFile.length > usable.length && (
                    <span className="font-normal text-muted-foreground"> · {t("fileSkipped", { count: fromFile.length - usable.length })}</span>
                  )}
                </p>
                <ul className="flex flex-col gap-1 text-muted-foreground">
                  {usable.slice(0, PREVIEW).map((value) => (
                    <li key={value} lang={languageOfText(value)} className="truncate">
                      {value}
                    </li>
                  ))}
                </ul>
                {usable.length > PREVIEW && <p className="text-xs text-muted-foreground">{t("fileMore", { count: usable.length - PREVIEW })}</p>}
              </div>
            )}
            {topicField}
            {locationField}
            <p className="text-xs text-pretty text-muted-foreground">{t("fileLanguage")}</p>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-pretty text-destructive">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
