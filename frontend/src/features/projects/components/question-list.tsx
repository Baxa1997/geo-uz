"use client";

import { PencilSimpleIcon as Pencil } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon as Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { PROMPT_TEXT_MAX_LENGTH, PROMPT_TEXT_MIN_LENGTH } from "@/shared/constants";
import { languageOfText } from "@/shared/helpers/prompts";
import type { PromptLanguage } from "@/shared/types/api";

export interface ListedQuestion {
  key: string;
  text: string;
  language: PromptLanguage;
}

const ICON_BUTTON =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * The first check's questions as a numbered list (the user's picture, 16 Nov 2026): each a card with its
 * number, its text, a pencil to rewrite it and a bin to remove it, and a dashed row to add one, with how
 * many of the most there are. A question being written is a field in its card, saved with Enter.
 */
export function QuestionList({ id, items, max, onChange, placeholder }: { id: string; items: ListedQuestion[]; max: number; onChange: (items: ListedQuestion[]) => void; placeholder: string }) {
  const t = useTranslations("FirstRun.setup.list");
  // The row being written, with its text so far; a new row is in the list already, empty
  const [editing, setEditing] = useState<{ key: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!editing) return;
    const text = editing.text.trim().replace(/\s+/g, " ");
    if (text.length < PROMPT_TEXT_MIN_LENGTH) return setError(t("short"));
    if (items.some((item) => item.key !== editing.key && item.text.toLowerCase() === text.toLowerCase())) return setError(t("duplicate"));
    onChange(items.map((item) => (item.key === editing.key ? { ...item, text, language: languageOfText(text) } : item)));
    setEditing(null);
    setError(null);
  }

  function cancel() {
    if (!editing) return;
    // A new row left empty was never a question
    onChange(items.filter((item) => item.key !== editing.key || item.text));
    setEditing(null);
    setError(null);
  }

  function add() {
    const key = `own-${Date.now()}`;
    onChange([...items, { key, text: "", language: items[0]?.language ?? "uz" }]);
    setEditing({ key, text: "" });
    setError(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-start gap-3 rounded-xl border bg-background px-3.5 py-3">
            <span aria-hidden className="pt-1.5 font-mono text-xs text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            {editing?.key === item.key ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Textarea
                  id={`${id}-${item.key}`}
                  autoFocus
                  rows={2}
                  value={editing.text}
                  maxLength={PROMPT_TEXT_MAX_LENGTH}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => {
                    setEditing({ key: item.key, text: event.target.value });
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      save();
                    }
                    if (event.key === "Escape") cancel();
                  }}
                  className="min-h-16 text-sm"
                />
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={save}>
                    {t("save")}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="min-w-0 flex-1 py-1 text-[0.9375rem]/6 text-pretty">
                  {item.text}
                  <span className="ml-2 rounded border px-1 py-0.5 align-middle text-[0.625rem] font-semibold text-muted-foreground uppercase">{item.language}</span>
                </p>
                <button type="button" className={ICON_BUTTON} aria-label={t("edit", { number: index + 1 })} onClick={() => (setEditing({ key: item.key, text: item.text }), setError(null))}>
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button type="button" className={ICON_BUTTON} aria-label={t("remove", { number: index + 1 })} onClick={() => onChange(items.filter((other) => other.key !== item.key))}>
                  <Trash aria-hidden className="size-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={add}
        disabled={items.length >= max || editing !== null}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus aria-hidden className="size-4" />
        {t("add")}
        <span className="font-normal text-muted-foreground tabular-nums">
          ({items.length}/{max})
        </span>
      </button>
    </div>
  );
}
