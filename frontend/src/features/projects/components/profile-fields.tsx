"use client";

import { useMessages, useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { INPUT_CLASS, MAX_ALIASES, MAX_DESCRIPTION_LENGTH, MAX_SERVICES } from "../constants";
import type { OnboardingErrors, SiteDraft } from "../types";
import { ChipInput } from "@/shared/components/chip-input";
import { DEFAULT_COUNTRY } from "@/shared/constants/countries";
import { CountrySelect } from "./country-select";
import { SuggestInput } from "./suggest-input";

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

      <Field data-invalid={Boolean(errors.description)}>
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
          aria-invalid={Boolean(errors.description)}
        />
        <FieldError>{errors.description && t(errors.description)}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.category)}>
        <FieldLabel htmlFor={`${id}-category`}>{t("category")}</FieldLabel>
        <FieldDescription id={`${id}-category-hint`}>{t("categoryHint")}</FieldDescription>
        <SuggestInput
          id={`${id}-category`}
          options={messages.Categories}
          value={site.category}
          onChange={(category) => onChange({ category })}
          placeholder={t("categoryPlaceholder")}
          invalid={Boolean(errors.category)}
          describedBy={`${id}-category-hint`}
        />
        <FieldError>{errors.category && t(errors.category)}</FieldError>
      </Field>

      <ChipInput
        id={`${id}-services`}
        label={t("services")}
        hint={t("servicesHint")}
        values={site.services}
        max={MAX_SERVICES}
        onChange={(services) => onChange({ services })}
      />
      {errors.services && (
        <p role="alert" tabIndex={-1} className="-mt-3 text-sm text-destructive">
          {t(errors.services)}
        </p>
      )}

      <Field>
        <FieldLabel htmlFor={`${id}-country`}>{t("country")}</FieldLabel>
        <FieldDescription>{t("countryHint")}</FieldDescription>
        <CountrySelect id={`${id}-country`} value={site.country} onChange={(country) => onChange({ country })} />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-city`}>
          {t("city")} <span className="font-normal text-muted-foreground">({t("optional")})</span>
        </FieldLabel>
        <FieldDescription id={`${id}-city-hint`}>{t("cityHint")}</FieldDescription>
        {/* Our own list of cities is Uzbekistan's; elsewhere the city is typed */}
        <SuggestInput
          id={`${id}-city`}
          options={site.country === DEFAULT_COUNTRY ? messages.Cities : {}}
          value={site.city}
          onChange={(city) => onChange({ city })}
          placeholder={t("cityPlaceholder")}
          describedBy={`${id}-city-hint`}
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
