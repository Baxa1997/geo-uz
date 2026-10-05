"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { PhoneInput } from "@/shared/components/phone-input";
import { api } from "@/shared/api/client";
import { PHONE_LOCAL_DIGITS, PHONE_PREFIX } from "@/shared/constants";
import { AUTH_INPUT } from "../constants";

/** Step 1 of phone login: the number, with +998 fixed in front. */
export function PhoneForm({
  digits,
  onDigitsChange,
  onSent,
}: {
  digits: string;
  onDigitsChange: (digits: string) => void;
  onSent: (resendIn: number) => void;
}) {
  const t = useTranslations("Login");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const send = useMutation({
    mutationFn: () => api.sendCode({ phone: `${PHONE_PREFIX}${digits}` }),
    onSuccess: ({ resendIn }) => onSent(resendIn),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (digits.length !== PHONE_LOCAL_DIGITS) {
      setError(t("phoneInvalid"));
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    send.mutate();
  }

  const message = error ?? (send.isError ? t("sendFailed") : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`${id}-phone`}>{t("phone")}</FieldLabel>
        <PhoneInput
          ref={inputRef}
          id={`${id}-phone`}
          digits={digits}
          onDigitsChange={(value) => {
            onDigitsChange(value);
            setError(undefined);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? `${id}-error` : undefined}
          className={`${AUTH_INPUT} pl-15`}
        />
        <FieldError id={`${id}-error`}>{message}</FieldError>
      </Field>
      <Button type="submit" size="lg" className="h-12 rounded-full text-base" disabled={send.isPending}>
        {send.isPending ? t("sending") : t("sendCode")}
      </Button>
    </form>
  );
}
