"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { PhoneInput } from "@/shared/components/phone-input";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { api } from "@/shared/api/client";
import { PHONE_LOCAL_DIGITS, PHONE_PREFIX } from "@/shared/constants";
import { cn } from "@/shared/helpers/utils";
import type { DemoRequest, DemoSector } from "@/shared/types/api";
import { DEMO_SECTORS } from "../../constants";

type Errors = Partial<Record<"name" | "phone" | "sector", string>>;

export function DemoForm() {
  const t = useTranslations("Landing.demo");
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [digits, setDigits] = useState("");
  const [sector, setSector] = useState<DemoSector | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const mutation = useMutation({ mutationFn: (body: DemoRequest) => api.createDemoRequest(body) });

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (!name.trim()) found.name = t("nameRequired");
    if (digits.length !== PHONE_LOCAL_DIGITS) found.phone = t("phoneInvalid");
    if (!sector) found.sector = t("sectorRequired");
    setErrors(found);
    if (!sector || Object.keys(found).length > 0) {
      // First invalid field; for the sector chips, their first option
      requestAnimationFrame(() => {
        const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        (target?.getAttribute("role") === "radiogroup" ? target.querySelector("input") : target)?.focus();
      });
      return;
    }
    mutation.mutate({ name: name.trim(), phone: `${PHONE_PREFIX}${digits}`, sector });
  }

  if (mutation.isSuccess) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border bg-background p-8 text-center shadow-sm">
        <CircleCheck aria-hidden className="size-10 text-positive" />
        <p className="text-lg font-semibold">{t("successTitle", { name: name.trim() })}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{t("successText")}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border bg-background p-5 shadow-sm sm:p-6"
    >
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          className="h-12 bg-background px-3.5 text-base md:text-base"
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError>{errors.name}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.phone)}>
        <FieldLabel htmlFor={`${id}-phone`}>{t("phone")}</FieldLabel>
        <PhoneInput id={`${id}-phone`} digits={digits} onDigitsChange={setDigits} aria-invalid={Boolean(errors.phone)} />
        <FieldError>{errors.phone}</FieldError>
      </Field>

      <div className="flex flex-col gap-2.5">
        <p id={`${id}-sector`} className="text-sm font-medium">
          {t("sector")}
        </p>
        <div
          role="radiogroup"
          aria-labelledby={`${id}-sector`}
          aria-invalid={Boolean(errors.sector)}
          aria-describedby={errors.sector ? `${id}-sector-error` : undefined}
          className="flex flex-wrap gap-2"
        >
          {DEMO_SECTORS.map((option) => (
            <label
              key={option}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                sector === option ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={`${id}-sector`}
                value={option}
                checked={sector === option}
                onChange={() => setSector(option)}
                className="sr-only"
              />
              {t(`sectors.${option}`)}
            </label>
          ))}
        </div>
        <FieldError id={`${id}-sector-error`}>{errors.sector}</FieldError>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}
      <Button type="submit" variant="brand" size="lg" className="h-12 text-base" disabled={mutation.isPending}>
        {mutation.isPending ? t("sending") : t("submit")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("note")}</p>
    </form>
  );
}
