"use client";

import { useTranslations } from "next-intl";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { INPUT_CLASS } from "../constants";
import type { BrandDraft, DraftErrors, ProjectDraft } from "../types";

/** Up to 3 competitors: name, website and spellings; only the name is required. */
export function CompetitorFields({
  id,
  draft,
  errors,
  onChange,
}: {
  id: string;
  draft: ProjectDraft;
  errors: DraftErrors;
  onChange: (patch: Partial<ProjectDraft>) => void;
}) {
  const t = useTranslations("NewProject");
  const update = (index: number, patch: Partial<BrandDraft>) =>
    onChange({
      competitors: draft.competitors.map((competitor, i) => (i === index ? { ...competitor, ...patch } : competitor)),
    });

  return (
    <>
      {errors.competitors && (
        <p role="alert" className="text-sm text-destructive">
          {t(errors.competitors)}
        </p>
      )}
      {draft.competitors.map((competitor, index) => {
        const nameError = errors[`competitor-${index}-name`];
        const domainError = errors[`competitor-${index}-domain`];
        return (
          <FieldSet key={index} className="gap-3 border-t pt-4 first:border-t-0 first:pt-0">
            <FieldLegend variant="label">{t("competitor", { n: index + 1 })}</FieldLegend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(nameError)}>
                <FieldLabel htmlFor={`${id}-c${index}-name`} className="sr-only">
                  {t("name")}
                </FieldLabel>
                <Input
                  id={`${id}-c${index}-name`}
                  value={competitor.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder={t("competitorNamePlaceholder")}
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(nameError) || (index === 0 && Boolean(errors.competitors))}
                />
                <FieldError>{nameError && t(nameError)}</FieldError>
              </Field>
              <Field data-invalid={Boolean(domainError)}>
                <FieldLabel htmlFor={`${id}-c${index}-domain`} className="sr-only">
                  {t("domain")}
                </FieldLabel>
                <Input
                  id={`${id}-c${index}-domain`}
                  value={competitor.domain}
                  onChange={(e) => update(index, { domain: e.target.value })}
                  placeholder={`${t("domain")} (${t("optional")})`}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={INPUT_CLASS}
                  aria-invalid={Boolean(domainError)}
                />
                <FieldError>{domainError && t(domainError)}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-c${index}-aliases`} className="sr-only">
                {t("aliases")}
              </FieldLabel>
              <Input
                id={`${id}-c${index}-aliases`}
                value={competitor.aliases}
                onChange={(e) => update(index, { aliases: e.target.value })}
                placeholder={`${t("aliases")} (${t("optional")})`}
                className={INPUT_CLASS}
              />
            </Field>
          </FieldSet>
        );
      })}
    </>
  );
}
