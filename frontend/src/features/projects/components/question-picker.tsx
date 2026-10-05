"use client";

import { Plus } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { LanguageToggle } from "@/shared/components/language-toggle";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select";
import { MAX_PROMPTS, MIN_PROMPTS, PROMPT_TEXT_MAX_LENGTH, PROMPT_TEXT_MIN_LENGTH } from "@/shared/constants";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { PromptLanguage } from "@/shared/types/api";
import { ALL_TOPICS, INPUT_CLASS, OWN_QUESTION_TOPIC } from "../constants";
import { questionsInTopics } from "../helpers/onboarding";
import type { OnboardingErrors, QuestionDraft, TopicDraft } from "../types";

/**
 * Onboarding step 5: the questions in the ticked topics, all ticked, one topic at a time or all of
 * them, and the client's own. Lives inside the wizard's form, so it has no form of its own.
 */
export function QuestionPicker({
  questions,
  topics,
  shown,
  onShow,
  errors,
  onChange,
}: {
  questions: QuestionDraft[];
  topics: TopicDraft[];
  /** The topic on screen, or ALL_TOPICS. */
  shown: string;
  onShow: (topic: string) => void;
  errors: OnboardingErrors;
  onChange: (questions: QuestionDraft[]) => void;
}) {
  const t = useTranslations("Onboarding");
  const messages = useMessages();
  const id = useId();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<PromptLanguage>("uz");
  const [error, setError] = useState<string>();
  const inTopics = questionsInTopics(questions, topics);
  const selected = inTopics.filter((question) => question.selected).length;
  const visible = shown === ALL_TOPICS ? inTopics : inTopics.filter((question) => question.topic === shown);
  const ticked = topics.filter((topic) => topic.selected);
  const label = (topic: TopicDraft) => (topic.custom ? topic.topic : labelFor(messages.Topics, topic.topic));

  function add() {
    const value = text.trim().replace(/\s+/g, " ");
    if (value.length < PROMPT_TEXT_MIN_LENGTH) return setError(t("questionShort"));
    if (questions.some((question) => question.text.toLowerCase() === value.toLowerCase())) {
      return setError(t("questionDuplicate"));
    }
    if (selected >= MAX_PROMPTS) return setError(t("questionsMax", { max: MAX_PROMPTS }));
    // A question added while one topic is on screen goes into that topic
    const topic = shown === ALL_TOPICS ? OWN_QUESTION_TOPIC : shown;
    onChange([...questions, { key: `own-${questions.length}`, text: value, language, topic, selected: true }]);
    setText("");
    setError(undefined);
  }

  const toggle = (key: string, checked: boolean) =>
    onChange(questions.map((question) => (question.key === key ? { ...question, selected: checked } : question)));

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
          {t("questionsPick")}
          <span aria-live="polite" className="font-normal text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{selected}</span>/{MAX_PROMPTS}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{t("recommended", { min: MIN_PROMPTS, max: MAX_PROMPTS })}</p>
      </div>
      {errors.questions && (
        <p role="alert" className="text-sm text-destructive">
          {t(errors.questions)}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border">
        <label htmlFor={`${id}-topic`} className="sr-only">
          {t("topicFilter")}
        </label>
        <NativeSelect
          id={`${id}-topic`}
          value={shown}
          onChange={(e) => onShow(e.target.value)}
          className="w-full border-b [&_select]:h-11 [&_select]:rounded-none [&_select]:border-0 [&_select]:pl-3 [&_select]:text-base [&_select]:font-medium md:[&_select]:text-sm"
        >
          <NativeSelectOption value={ALL_TOPICS}>{t("allTopics", { count: inTopics.length })}</NativeSelectOption>
          {ticked.map((topic) => (
            <NativeSelectOption key={topic.topic} value={topic.topic}>
              {label(topic)} · {inTopics.filter((question) => question.topic === topic.topic).length}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {visible.length > 0 ? (
          <ul className="max-h-[26rem] overflow-y-auto bg-muted/30 py-1">
            {visible.map((question) => (
              <li key={question.key}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2 has-focus-visible:bg-muted">
                  <input
                    type="checkbox"
                    checked={question.selected}
                    onChange={(e) => toggle(question.key, e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-you"
                  />
                  <span className="mt-px shrink-0 rounded bg-background px-1.5 py-0.5 text-[0.65rem] leading-none font-semibold text-foreground/70 uppercase ring-1 ring-border">
                    {question.language}
                  </span>
                  <span
                    lang={question.language}
                    className={cn("text-sm text-pretty", !question.selected && "text-muted-foreground")}
                  >
                    {question.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bg-muted/30 px-3 py-3 text-sm text-muted-foreground">{t("noQuestions")}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-dashed p-3">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`${id}-question`}>{t("addQuestion")}</FieldLabel>
          <Input
            id={`${id}-question`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(undefined);
            }}
            onKeyDown={(e) => {
              // Enter adds the question instead of submitting the whole wizard
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={t("questionPlaceholder")}
            maxLength={PROMPT_TEXT_MAX_LENGTH}
            className={INPUT_CLASS}
            aria-invalid={Boolean(error)}
          />
          <FieldError>{error}</FieldError>
        </Field>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:flex-1">
            <LanguageToggle legend={t("language")} value={language} onChange={setLanguage} />
          </div>
          <Button type="button" variant="outline" size="lg" className="h-10" onClick={add}>
            <Plus aria-hidden data-icon="inline-start" />
            {t("add")}
          </Button>
        </div>
      </div>
    </>
  );
}
