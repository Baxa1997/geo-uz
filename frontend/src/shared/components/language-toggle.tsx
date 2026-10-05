"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { PROMPT_LANGUAGES } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { PromptLanguage } from "@/shared/types/api";

/** Uzbek / Russian switch for the language of a question. */
export function LanguageToggle({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: PromptLanguage;
  onChange: (language: PromptLanguage) => void;
}) {
  const locales = useTranslations("Locales");
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex rounded-lg bg-muted p-0.5">
        {PROMPT_LANGUAGES.map((option) => (
          <label
            key={option}
            className={cn(
              "flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              value === option ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {locales(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
