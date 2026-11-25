"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { ApiError, adminApi } from "@/shared/api/client";

/** The admin page's login: its name and password; wrong ones are counted on the server, which shuts the login for an hour. */
export function AdminLoginForm() {
  const t = useTranslations("Admin.login");
  const router = useRouter();
  const id = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => adminApi.login({ username: username.trim(), password }),
    // Only the move, as the accounts' login does: a refresh beside it kept the page on "Logging in…" (25 Nov 2026, the
    // live site). /admin is another page, so it is asked for afresh with the cookie just set
    onSuccess: () => router.replace("/admin"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (username.trim() && password) login.mutate();
  }

  const status = login.error instanceof ApiError ? login.error.status : 0;
  const message = login.isError ? t(status === 401 ? "wrong" : status === 429 ? "locked" : status === 404 ? "off" : "failed") : undefined;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-username`}>{t("username")}</FieldLabel>
        <Input
          id={`${id}-username`}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="h-11"
        />
      </Field>
      <Field data-invalid={Boolean(message)}>
        <FieldLabel htmlFor={`${id}-password`}>{t("password")}</FieldLabel>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${id}-error` : undefined}
          className="h-11"
        />
        <FieldError id={`${id}-error`}>{message}</FieldError>
      </Field>
      <Button type="submit" size="lg" className="h-11" disabled={login.isPending || login.isSuccess || !username.trim() || !password}>
        {login.isPending || login.isSuccess ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
