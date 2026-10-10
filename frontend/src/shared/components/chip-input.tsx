"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** A chip's text as saved: single spaces, no repeats (case aside). */
export function addChip(values: string[], value: string): string[] {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || values.some((existing) => existing.toLowerCase() === text.toLowerCase())) return values;
  return [...values, text];
}

/**
 * A list of short values as chips: each with its own remove button, and a dashed "Add" chip that turns
 * into a field. Enter or leaving the field adds what was typed; Escape cancels. The onboarding's brand
 * profile and the questions' Discovery use it. `bare` leaves the name and the hint to the screen reader,
 * for a form that writes them beside the chips (Sozlamalar).
 */
export function ChipInput({
  id,
  label,
  hint,
  values,
  max,
  bare = false,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  values: string[];
  max: number;
  bare?: boolean;
  onChange: (values: string[]) => void;
}) {
  const t = useTranslations("Common");
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  function commit() {
    onChange(addChip(values, text));
    setText("");
    setAdding(false);
  }

  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} className="flex flex-col gap-1">
      <p id={`${id}-label`} className={bare ? "sr-only" : "text-sm font-medium"}>
        {label}
      </p>
      <p id={`${id}-hint`} className={bare ? "sr-only" : "text-sm text-pretty text-muted-foreground"}>
        {hint}
      </p>
      <ul className={bare ? "flex flex-wrap gap-2" : "mt-2 flex flex-wrap gap-2"}>
        {values.map((value) => (
          <li key={value} className="flex h-8 items-center rounded-md border bg-muted/40 text-sm">
            <span className="px-2.5">{value}</span>
            <button
              type="button"
              aria-label={t("removeChip", { value })}
              onClick={() => onChange(values.filter((existing) => existing !== value))}
              className="flex h-full items-center border-l px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </li>
        ))}
        {values.length < max && (
          <li>
            {adding ? (
              <input
                // Opened by a click on "Add": the field is what the user asked for
                autoFocus
                value={text}
                aria-label={label}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  // Enter adds the chip instead of submitting the whole wizard
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setText("");
                    setAdding(false);
                  }
                }}
                className="h-8 w-44 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {t("addChip")}
                <Plus aria-hidden className="size-3.5" />
              </button>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
