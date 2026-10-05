"use client";

import { useMessages, useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { INPUT_CLASS, MAX_ALIASES, MAX_DESCRIPTION_LENGTH, MAX_SERVICES } from "../constants";
import type { OnboardingErrors, SiteDraft } from "../types";
import { ChipInput } from "./chip-input";
import { CodeSelect } from "./code-select";

/** Onboarding step 2: the brand profile the backend read from the website, each field with what it's for. */
export function ProfileFields({
  id,
  site,
  onChange,
  errors,
}: {
  id: string;
  site: SiteDraft;
  onChange: (patch: Partial<SiteDraft>) => void;
  errors: OnboardingErrors;
}) {
  const t = useTranslations("Onboarding");
  const messages = useMessages();

  return (
    <>
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
        <FieldDescription id={`${id}-name-hint`}>{t("nameHint")}</FieldDescription>
        <Input
          id={`${id}-name`}
          value={site.name}
          onChange={(e) => onChange({ name: e.target.value })}
          autoComplete="organization"
          className={INPUT_CLASS}
          aria-describedby={`${id}-name-hint`}
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError>{errors.name && t(errors.name)}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-description`}>{t("description")}</FieldLabel>
        <FieldDescription id={`${id}-description-hint`}>{t("descriptionHint")}</FieldDescription>
        <Textarea
          id={`${id}-description`}
          value={site.description}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={3}
          className="min-h-24 text-sm"
          aria-describedby={`${id}-description-hint`}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-category`}>{t("category")}</FieldLabel>
        <FieldDescription>{t("categoryHint")}</FieldDescription>
        <CodeSelect
          id={`${id}-category`}
          options={messages.Categories}
          value={site.category}
          onChange={(category) => onChange({ category })}
        />
      </Field>

      <ChipInput
        id={`${id}-services`}
        label={t("services")}
        hint={t("servicesHint")}
        values={site.services}
        max={MAX_SERVICES}
        onChange={(services) => onChange({ services })}
      />

      <Field>
        <FieldLabel htmlFor={`${id}-city`}>{t("city")}</FieldLabel>
        <FieldDescription>{t("cityHint")}</FieldDescription>
        <CodeSelect
          id={`${id}-city`}
          options={messages.Cities}
          value={site.city}
          onChange={(city) => onChange({ city })}
        />
      </Field>

      <ChipInput
        id={`${id}-aliases`}
        label={t("aliases")}
        hint={t("aliasesHint")}
        values={site.aliases}
        max={MAX_ALIASES}
        onChange={(aliases) => onChange({ aliases })}
      />
    </>
  );
}
