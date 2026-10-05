"use client";

import { Plus } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { labelFor } from "@/shared/helpers/labels";
import { MAX_TOPICS } from "../constants";
import type { OnboardingErrors, QuestionDraft, TopicDraft } from "../types";

/**
 * Onboarding step 4: the topics the suggested questions cover, all ticked, with how many questions each
 * brings; the client can add a topic of their own. Unticked topics leave their questions out.
 */
export function TopicPicker({
  id,
  topics,
  questions,
  errors,
  onChange,
}: {
  id: string;
  topics: TopicDraft[];
  questions: QuestionDraft[];
  errors: OnboardingErrors;
  onChange: (topics: TopicDraft[]) => void;
}) {
  const t = useTranslations("Onboarding");
  const messages = useMessages();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const selected = topics.filter((topic) => topic.selected).length;
  const full = selected >= MAX_TOPICS;
  const count = (topic: string) => questions.filter((question) => question.topic === topic).length;
  const label = (topic: TopicDraft) => (topic.custom ? topic.topic : labelFor(messages.Topics, topic.topic));

  function add() {
    const value = text.trim().replace(/\s+/g, " ");
    if (!value) return setAdding(false);
    if (topics.some((topic) => label(topic).toLowerCase() === value.toLowerCase())) return setError(t("topicDuplicate"));
    onChange([...topics, { topic: value, selected: true, custom: true }]);
    setText("");
    setError(undefined);
    setAdding(false);
  }

  return (
    <>
      <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
        {t("topicsPick")}
        <span aria-live="polite" className="font-normal text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{selected}</span>/{MAX_TOPICS}
        </span>
      </p>
      {errors.topics && (
        <p role="alert" className="text-sm text-destructive">
          {t(errors.topics)}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {topics.map((topic) => (
          <li key={topic.topic}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-50">
              <input
                type="checkbox"
                checked={topic.selected}
                disabled={!topic.selected && full}
                onChange={(e) =>
                  onChange(topics.map((item) => (item.topic === topic.topic ? { ...item, selected: e.target.checked } : item)))
                }
                className="size-4 shrink-0 accent-you"
              />
              <span className="min-w-0 flex-1 text-sm font-medium text-pretty">{label(topic)}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {topic.custom ? t("topicOwn") : t("topicQuestions", { count: count(topic.topic) })}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="flex flex-col gap-1">
          <input
            // Opened by a click on "Add your own": the field is what the user asked for
            autoFocus
            id={`${id}-topic`}
            value={text}
            aria-label={t("addTopic")}
            aria-invalid={Boolean(error)}
            placeholder={t("topicPlaceholder")}
            onChange={(e) => {
              setText(e.target.value);
              setError(undefined);
            }}
            onBlur={add}
            onKeyDown={(e) => {
              // Enter adds the topic instead of submitting the whole wizard
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setText("");
                setError(undefined);
                setAdding(false);
              }
            }}
            className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={full}
          className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden className="size-4" />
          {t("addTopic")}
        </button>
      )}
    </>
  );
}
