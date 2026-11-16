"use client";

import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { LanguageToggle } from "@/shared/components/language-toggle";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { MAX_BRAND_QUESTIONS, PROMPT_TEXT_MAX_LENGTH, PROMPT_TEXT_MIN_LENGTH } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { PromptLanguage } from "@/shared/types/api";
import { INPUT_CLASS } from "../constants";
import type { BrandQuestionDraft } from "../types";

/**
 * The setup's brand questions: the ones written for the business, all ticked, and the client's own.
 * They name the business, are asked beside the customers' questions and are kept out of the scores.
 * Lives inside the wizard's form, so it has no form of its own.
 */
export function BrandQuestionPicker({
  questions,
  brand,
  onChange,
}: {
  questions: BrandQuestionDraft[];
  brand: string;
  onChange: (questions: BrandQuestionDraft[]) => void;
}) {
  const t = useTranslations("Onboarding.brandQuestions");
  const id = useId();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<PromptLanguage>("uz");
  const [error, setError] = useState<string>();
  const selected = questions.filter((question) => question.selected).length;

  function add() {
    const value = text.trim().replace(/\s+/g, " ");
    if (value.length < PROMPT_TEXT_MIN_LENGTH) return setError(t("short"));
    if (questions.some((question) => question.text.toLowerCase() === value.toLowerCase())) return setError(t("duplicate"));
    if (selected >= MAX_BRAND_QUESTIONS) return setError(t("max", { max: MAX_BRAND_QUESTIONS }));
    onChange([...questions, { key: `own-${questions.length}`, text: value, language, selected: true }]);
    setText("");
    setError(undefined);
  }

  function toggle(key: string, checked: boolean) {
    if (checked && selected >= MAX_BRAND_QUESTIONS) return setError(t("max", { max: MAX_BRAND_QUESTIONS }));
    setError(undefined);
    onChange(questions.map((question) => (question.key === key ? { ...question, selected: checked } : question)));
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
          {t("title", { brand })}
          <span aria-live="polite" className="font-normal text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{selected}</span>/{MAX_BRAND_QUESTIONS}
          </span>
        </p>
        <p className="text-xs text-pretty text-muted-foreground">{t("text")}</p>
      </div>

      {questions.length > 0 ? (
        <ul className="overflow-hidden rounded-xl border bg-muted/30 py-1">
          {questions.map((question) => (
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
                <span lang={question.language} className={cn("text-sm text-pretty", !question.selected && "text-muted-foreground")}>
                  {question.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">{t("none")}</p>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-dashed p-3">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`${id}-brand-question`}>{t("add")}</FieldLabel>
          <Input
            id={`${id}-brand-question`}
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
            placeholder={t("placeholder", { brand })}
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
            {t("addButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
