"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { api, ApiError } from "@/shared/api/client";
import { formatPhone } from "@/shared/helpers/phone";
import { AUTH_INPUT, CODE_LENGTH } from "../constants";
import { formatCountdown } from "../helpers/countdown";
import { useFinishLogin } from "../hooks/use-finish-login";
import type { LoginTarget } from "../types";

/** Step 2 of phone login: the SMS code, sent as soon as all 6 digits are in. */
export function CodeForm({
  phone,
  resendIn,
  target,
  onChangeNumber,
}: {
  phone: string;
  resendIn: number;
  target: LoginTarget;
  onChangeNumber: () => void;
}) {
  const t = useTranslations("Login");
  const id = useId();
  const [code, setCode] = useState("");
  const [tooShort, setTooShort] = useState(false);
  const [wait, setWait] = useState(resendIn);
  const finish = useFinishLogin(target);

  const verify = useMutation({
    mutationFn: async (value: string) => {
      await api.verifyCode({ phone, code: value });
      await finish();
    },
  });
  const resend = useMutation({
    mutationFn: () => api.sendCode({ phone }),
    onSuccess: ({ resendIn: seconds }) => {
      setWait(seconds);
      setCode("");
      verify.reset();
    },
  });

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const busy = verify.isPending || verify.isSuccess;

  function change(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setTooShort(false);
    if (verify.isError) verify.reset();
    // SMS autofill and paste bring the whole code at once: no extra tap needed
    if (digits.length === CODE_LENGTH && !busy) verify.mutate(digits);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) return setTooShort(true);
    verify.mutate(code);
  }

  const wrongCode = verify.error instanceof ApiError && verify.error.status < 500;
  const error = tooShort
    ? t("codeInvalid")
    : verify.isError
      ? wrongCode
        ? t("codeWrong")
        : t("verifyFailed")
      : resend.isError
        ? t("sendFailed")
        : undefined;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <p className="text-sm text-pretty">
        {t.rich("codeSent", {
          phone: formatPhone(phone),
          b: (chunks) => <span className="font-medium whitespace-nowrap">{chunks}</span>,
        })}
      </p>
      <Field data-invalid={Boolean(error)}>
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={`${id}-code`}>{t("code")}</FieldLabel>
          <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={onChangeNumber} disabled={busy}>
            {t("changeNumber")}
          </Button>
        </div>
        <Input
          id={`${id}-code`}
          value={code}
          onChange={(e) => change(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="••••••"
          className={`${AUTH_INPUT} text-center font-mono text-xl tracking-[0.4em] tabular-nums md:text-xl`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </Field>
      <Button type="submit" size="lg" className="h-12 rounded-full text-base" disabled={busy}>
        {busy ? t("verifying") : t("verify")}
      </Button>
      <div className="flex justify-center text-sm">
        {wait > 0 ? (
          <span className="text-muted-foreground tabular-nums">{t("resendIn", { time: formatCountdown(wait) })}</span>
        ) : (
          <Button
            type="button"
            variant="link"
            className="h-9 px-0"
            onClick={() => resend.mutate()}
            disabled={resend.isPending || busy}
          >
            {t("resend")}
          </Button>
        )}
      </div>
    </form>
  );
}
