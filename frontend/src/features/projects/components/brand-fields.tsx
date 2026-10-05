"use client";

import { useMessages, useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { INPUT_CLASS } from "../constants";
import type { BrandDraft, DraftErrors, ProjectDraft } from "../types";
import { CodeSelect } from "./code-select";

/** Brand name, spellings, website, category and city. */
export function BrandFields({
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
  const messages = useMessages();
  const { brand } = draft;
  const setBrand = (patch: Partial<BrandDraft>) => onChange({ brand: { ...brand, ...patch } });

  return (
    <>
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
        <Input
          id={`${id}-name`}
          value={brand.name}
          onChange={(e) => setBrand({ name: e.target.value })}
          placeholder={t("namePlaceholder")}
          autoComplete="organization"
          className={INPUT_CLASS}
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError>{errors.name && t(errors.name)}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-aliases`}>{t("aliases")}</FieldLabel>
        <Input
          id={`${id}-aliases`}
          value={brand.aliases}
          onChange={(e) => setBrand({ aliases: e.target.value })}
          placeholder={t("aliasesPlaceholder")}
          className={INPUT_CLASS}
          aria-describedby={`${id}-aliases-hint`}
        />
        <FieldDescription id={`${id}-aliases-hint`}>{t("aliasesHint")}</FieldDescription>
      </Field>

      <Field data-invalid={Boolean(errors.domain)}>
        <FieldLabel htmlFor={`${id}-domain`}>{t("domain")}</FieldLabel>
        <Input
          id={`${id}-domain`}
          value={brand.domain}
          onChange={(e) => setBrand({ domain: e.target.value })}
          placeholder={t("domainPlaceholder")}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          className={INPUT_CLASS}
          aria-invalid={Boolean(errors.domain)}
        />
        <FieldError>{errors.domain && t(errors.domain)}</FieldError>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-category`}>{t("category")}</FieldLabel>
          <CodeSelect
            id={`${id}-category`}
            options={messages.Categories}
            value={draft.category}
            onChange={(category) => onChange({ category })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-city`}>{t("city")}</FieldLabel>
          <CodeSelect
            id={`${id}-city`}
            options={messages.Cities}
            value={draft.city}
            onChange={(city) => onChange({ city })}
          />
        </Field>
      </div>
    </>
  );
}
