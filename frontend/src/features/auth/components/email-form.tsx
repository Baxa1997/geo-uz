"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { AUTH_INPUT, EMAIL_PATTERN } from "../constants";

const LEGAL_LINK = "underline underline-offset-2 transition-colors hover:text-foreground";

/** Step 1 of login: the email address the code goes to. */
export function EmailForm({
  email,
  onEmailChange,
  onSent,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onSent: (resendIn: number) => void;
}) {
  const t = useTranslations("Login");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const send = useMutation({
    mutationFn: () => api.sendCode({ email: email.trim() }),
    onSuccess: ({ resendIn }) => onSent(resendIn),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t("emailInvalid"));
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    send.mutate();
  }

  // 429: too many codes from this connection, or from everyone today (the backend's limits against abuse)
  const message = error ?? (send.isError ? t(send.error instanceof ApiError && send.error.status === 429 ? "tooManyCodes" : "sendFailed") : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`${id}-email`}>{t("email")}</FieldLabel>
        <Input
          ref={inputRef}
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(event) => {
            onEmailChange(event.target.value);
            setError(undefined);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? `${id}-error` : undefined}
          className={AUTH_INPUT}
        />
        <FieldError id={`${id}-error`}>{message}</FieldError>
      </Field>
      <Button type="submit" size="lg" className="h-12 rounded-full text-base" disabled={send.isPending}>
        {send.isPending ? t("sending") : t("sendCode")}
      </Button>
      {/* Signing up accepts the Terms and the Privacy policy (24 Nov 2026); they open beside the form, which keeps the email */}
      <p className="-mt-1 text-center text-xs/relaxed text-pretty text-muted-foreground">
        {t.rich("agree", {
          terms: (chunks) => (
            <Link href="/terms" target="_blank" className={LEGAL_LINK}>
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" target="_blank" className={LEGAL_LINK}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
