"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { EMPTY_BRAND, INPUT_CLASS, MAX_COMPETITORS } from "../constants";
import { chosenCount } from "../helpers/onboarding";
import type { BrandDraft, CompetitorChoice, OnboardingErrors } from "../types";

/** Onboarding step 3: suggested competitors as ticked rows (up to 5), plus one typed in by hand. */
export function CompetitorPicker({
  id,
  choice,
  errors,
  onChange,
}: {
  id: string;
  choice: CompetitorChoice;
  errors: OnboardingErrors;
  onChange: (choice: CompetitorChoice) => void;
}) {
  const t = useTranslations("Onboarding");
  const count = chosenCount(choice);
  const full = count >= MAX_COMPETITORS;
  const { manual } = choice;
  const setManual = (patch: Partial<BrandDraft>) => manual && onChange({ ...choice, manual: { ...manual, ...patch } });

  function openManual() {
    onChange({ ...choice, manual: EMPTY_BRAND });
    requestAnimationFrame(() => document.getElementById(`${id}-manual-name`)?.focus());
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
          {t("competitorsPick")}
          <span aria-live="polite" className="font-normal text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{count}</span>/{MAX_COMPETITORS}
          </span>
        </p>
        {full && <p className="text-xs text-muted-foreground">{t("competitorsFull", { max: MAX_COMPETITORS })}</p>}
      </div>
      {errors.competitors && (
        <p role="alert" className="text-sm text-destructive">
          {t(errors.competitors, { max: MAX_COMPETITORS })}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {choice.suggestions.map((suggestion, index) => {
          const checked = choice.selected[index] ?? false;
          return (
            <li key={suggestion.domain || suggestion.name}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:bg-transparent">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && full}
                  onChange={(e) =>
                    onChange({ ...choice, selected: choice.selected.map((s, i) => (i === index ? e.target.checked : s)) })
                  }
                  className="size-4 shrink-0 accent-you"
                />
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold"
                >
                  {suggestion.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{suggestion.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{suggestion.domain}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {manual ? (
        <div role="group" aria-labelledby={`${id}-manual-title`} className="flex flex-col gap-3 rounded-xl border border-dashed p-3">
          <div className="flex items-center justify-between gap-3">
            <p id={`${id}-manual-title`} className="text-sm font-medium">
              {t("manualTitle")}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...choice, manual: null })}>
              <X aria-hidden data-icon="inline-start" />
              {t("removeManual")}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.manualName)}>
              <FieldLabel htmlFor={`${id}-manual-name`}>{t("manualName")}</FieldLabel>
              <Input
                id={`${id}-manual-name`}
                value={manual.name}
                onChange={(e) => setManual({ name: e.target.value })}
                className={INPUT_CLASS}
                aria-invalid={Boolean(errors.manualName)}
              />
              <FieldError>{errors.manualName && t(errors.manualName)}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.manualDomain)}>
              <FieldLabel htmlFor={`${id}-manual-domain`}>{t("manualDomain")}</FieldLabel>
              <Input
                id={`${id}-manual-domain`}
                value={manual.domain}
                onChange={(e) => setManual({ domain: e.target.value })}
                placeholder={t("websitePlaceholder")}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={INPUT_CLASS}
                aria-invalid={Boolean(errors.manualDomain)}
              />
              <FieldError>{errors.manualDomain && t(errors.manualDomain)}</FieldError>
            </Field>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openManual}
          disabled={full}
          className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden className="size-4" />
          {t("addManually")}
        </button>
      )}
    </>
  );
}
