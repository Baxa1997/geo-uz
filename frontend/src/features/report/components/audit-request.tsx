"use client";

import { CheckCircleIcon as CircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { api } from "@/shared/api/client";
import { PhoneInput } from "@/shared/components/phone-input";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { PHONE_LOCAL_DIGITS, PHONE_PREFIX } from "@/shared/constants";

/**
 * The Free Snapshot's call to action (spec §4.14, Phase 0 item 0.8): a name and a phone, sent to the team as
 * the landing page's demo request is (`POST /demo-requests`, emailed to them), saying it asks for the First
 * Audit of this brand. No price yet (the user, 21 Nov 2026: "Request button, no price").
 */
export function AuditRequest({ brand, firstRunId }: { brand: string; firstRunId: string }) {
  const t = useTranslations("Report.snapshot.request");
  const id = useId();
  const [name, setName] = useState("");
  const [digits, setDigits] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = { name: name.trim() ? undefined : t("nameRequired"), phone: digits.length === PHONE_LOCAL_DIGITS ? undefined : t("phoneInvalid") };
    setErrors(found);
    if (found.name || found.phone) return;
    setState("sending");
    try {
      await api.createDemoRequest({ name: name.trim(), phone: `${PHONE_PREFIX}${digits}`, sector: "other", about: `First Audit · ${brand} · snapshot ${firstRunId}` });
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-medium">
        <CircleCheck aria-hidden className="size-5 text-positive" />
        {t("sent", { name: name.trim() })}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor={`${id}-name`}>{t("name")}</FieldLabel>
        <Input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" aria-invalid={Boolean(errors.name)} />
        <FieldError>{errors.name}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors.phone)}>
        <FieldLabel htmlFor={`${id}-phone`}>{t("phone")}</FieldLabel>
        <PhoneInput id={`${id}-phone`} digits={digits} onDigitsChange={setDigits} aria-invalid={Boolean(errors.phone)} />
        <FieldError>{errors.phone}</FieldError>
      </Field>
      <Button type="submit" size="lg" disabled={state === "sending"} className="sm:mt-6">
        {t("send")}
      </Button>
      {state === "failed" && <p className="text-sm text-negative sm:col-span-3">{t("failed")}</p>}
    </form>
  );
}
