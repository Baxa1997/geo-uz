"use client";

import { useMutation } from "@tanstack/react-query";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { XIcon as X } from "@phosphor-icons/react/dist/ssr/X";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { MAX_BRAND_QUESTIONS, PROMPT_TEXT_MAX_LENGTH, PROMPT_TEXT_MIN_LENGTH } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { BrandQuestion, PromptLanguage } from "@/shared/types/api";
import { FIELD, SaveBar, SettingsCard } from "./settings-parts";

const clean = (text: string) => text.trim().replace(/\s+/g, " ");
const LANGUAGES: PromptLanguage[] = ["uz", "ru"];

/**
 * The brand questions: the ones that name the business, asked to every assistant at every check and kept
 * out of the scores. One a row, each with its language, editable and removable; a new one is typed under
 * the list. Six at most: each is one more answer per assistant per check. Nothing is saved until "Save".
 */
export function BrandQuestionsEditor({ projectId, brand, initial, overviewHref }: { projectId: string; brand: string; initial: BrandQuestion[]; overviewHref: string }) {
  const t = useTranslations("Settings.brandQuestions");
  const id = useId();
  const [saved, setSaved] = useState(initial);
  const [questions, setQuestions] = useState(initial);
  const [draft, setDraft] = useState("");
  const [language, setLanguage] = useState<PromptLanguage>("uz");
  const kept = questions.map((question) => ({ ...question, text: clean(question.text) })).filter((question) => question.text);
  const dirty = JSON.stringify(kept) !== JSON.stringify(saved);
  const full = questions.length >= MAX_BRAND_QUESTIONS;
  const short = kept.some((question) => question.text.length < PROMPT_TEXT_MIN_LENGTH);
  const repeated = new Set(kept.map((question) => question.text.toLowerCase())).size < kept.length;

  const save = useMutation({
    mutationFn: () => api.updateProject(projectId, { brandQuestions: kept }),
    onSuccess: (project) => {
      setSaved(project.brandQuestions ?? []);
      setQuestions(project.brandQuestions ?? []);
    },
  });
  const error = short ? t("short") : repeated ? t("repeated") : save.isError ? t("failed") : undefined;
  const change = (index: number, patch: Partial<BrandQuestion>) => {
    setQuestions((current) => current.map((question, at) => (at === index ? { ...question, ...patch } : question)));
    save.reset();
  };

  function add() {
    const text = clean(draft);
    if (!text || full) return;
    setQuestions((current) => [...current, { text, language }]);
    setDraft("");
    save.reset();
  }

  const languagePicker = (value: PromptLanguage, onChange: (language: PromptLanguage) => void, label: string) => (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as PromptLanguage)} className={cn(FIELD, "h-9 w-16 shrink-0 px-2 font-medium uppercase")}>
      {LANGUAGES.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <SettingsCard
        title={t("title", { brand })}
        description={t.rich("text", { link: (chunks) => <Link href={overviewHref} className="underline underline-offset-4">{chunks}</Link> })}
        actions={<span className={cn("text-sm tabular-nums", full ? "font-medium text-foreground" : "text-muted-foreground")}>{t("count", { count: questions.length, max: MAX_BRAND_QUESTIONS })}</span>}
      >
        {questions.length === 0 && <p className="px-4 py-4 text-sm text-pretty text-muted-foreground sm:px-5">{t("empty")}</p>}
        {questions.length > 0 && (
          <ol className="flex flex-col divide-y">
            {questions.map((question, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                <span aria-hidden className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                  {index + 1}.
                </span>
                {languagePicker(question.language, (next) => change(index, { language: next }), t("languageLabel", { number: index + 1 }))}
                <label htmlFor={`${id}-${index}`} className="sr-only">
                  {t("questionLabel", { number: index + 1 })}
                </label>
                <input
                  id={`${id}-${index}`}
                  value={question.text}
                  lang={question.language}
                  maxLength={PROMPT_TEXT_MAX_LENGTH}
                  onChange={(event) => change(index, { text: event.target.value })}
                  aria-invalid={(clean(question.text).length > 0 && clean(question.text).length < PROMPT_TEXT_MIN_LENGTH) || undefined}
                  className={cn(FIELD, "h-9 border-transparent bg-transparent px-2 hover:border-border focus-visible:border-border focus-visible:bg-background")}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("remove", { number: index + 1 })}
                  onClick={() => {
                    setQuestions((current) => current.filter((_, at) => at !== index));
                    save.reset();
                  }}
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        )}
        {full ? (
          <p className="bg-muted/50 px-4 py-3 text-sm text-pretty sm:px-5">{t("full", { max: MAX_BRAND_QUESTIONS })}</p>
        ) : (
          <form
            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <span aria-hidden className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
              {questions.length + 1}.
            </span>
            {languagePicker(language, setLanguage, t("newLanguageLabel"))}
            <label htmlFor={`${id}-new`} className="sr-only">
              {t("newLabel")}
            </label>
            <input id={`${id}-new`} value={draft} lang={language} maxLength={PROMPT_TEXT_MAX_LENGTH} placeholder={t("placeholder", { brand })} onChange={(event) => setDraft(event.target.value)} className={cn(FIELD, "h-9 min-w-40 flex-1")} />
            <Button type="submit" variant="outline" className="bg-background" disabled={clean(draft).length < PROMPT_TEXT_MIN_LENGTH}>
              <Plus aria-hidden data-icon="inline-start" />
              {t("add")}
            </Button>
          </form>
        )}
      </SettingsCard>

      <SaveBar
        note={t("saveNote")}
        dirty={dirty}
        saving={save.isPending}
        saved={save.isSuccess}
        error={error}
        onCancel={() => {
          setQuestions(saved);
          save.reset();
        }}
        onSave={() => {
          if (!short && !repeated) save.mutate();
        }}
      />
    </>
  );
}
