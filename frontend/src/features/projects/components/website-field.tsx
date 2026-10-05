"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { INPUT_CLASS } from "../constants";
import type { OnboardingErrors } from "../types";

/** Onboarding step 1: the website, from which the backend reads the brand profile. */
export function WebsiteField({
  id,
  website,
  fromCheck,
  onChange,
  errors,
}: {
  id: string;
  website: string;
  /** The free check's site, when the user came from it. */
  fromCheck: string | null;
  onChange: (website: string) => void;
  errors: OnboardingErrors;
}) {
  const t = useTranslations("Onboarding");

  return (
    <>
      <Field data-invalid={Boolean(errors.website)}>
        <FieldLabel htmlFor={`${id}-website`}>{t("website")}</FieldLabel>
        <FieldDescription id={`${id}-website-hint`}>{t("websiteHint")}</FieldDescription>
        <Input
          id={`${id}-website`}
          value={website}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("websitePlaceholder")}
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={INPUT_CLASS}
          aria-describedby={`${id}-website-hint`}
          aria-invalid={Boolean(errors.website)}
        />
        <FieldError>{errors.website && t(errors.website)}</FieldError>
      </Field>
      {fromCheck && (
        <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-pretty">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {t("fromCheck", { site: fromCheck })}
        </p>
      )}
    </>
  );
}
