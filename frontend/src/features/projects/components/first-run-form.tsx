"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { EngineIcon } from "@/shared/components/engine-icon";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { api, ApiError } from "@/shared/api/client";
import { isValidDomain, normalizeDomain } from "@/shared/helpers/domain";
import type { FirstRun } from "@/shared/types/api";
import { CountrySelect } from "./country-select";

const POINTS = ["p1", "p2", "p3"] as const;

/** The one field a new account fills in: its website. Everything else is read from it. */
export function FirstRunForm({ onStarted, site = "" }: { onStarted: (run: FirstRun) => void; site?: string }) {
  const t = useTranslations("FirstRun");
  const engines = useTranslations("Engines");
  const id = useId();
  const [website, setWebsite] = useState(site);
  const [invalid, setInvalid] = useState(false);
  // Asked with the website (the user, 16 Nov 2026): the assistants are asked as a customer in this country
  const [country, setCountry] = useState("UZ");
  const start = useMutation({ mutationFn: (domain: string) => api.startFirstRun({ domain, country }), onSuccess: onStarted });

  function submit(event: FormEvent) {
    event.preventDefault();
    const domain = normalizeDomain(website);
    if (!isValidDomain(domain)) return setInvalid(true);
    start.mutate(domain);
  }

  const status = start.error instanceof ApiError ? start.error.status : null;
  const error = invalid || status === 422 ? t("websiteInvalid") : status === 409 ? t("domainTaken") : status === 429 ? t("limit") : start.isError ? t("startFailed") : undefined;
  const busy = start.isPending || start.isSuccess;

  return (
    <section className="my-auto flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{t("kicker")}</p>
        <h1 className="text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl">{t("title")}</h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("text")}</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border bg-background p-5 sm:p-6">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`${id}-site`}>{t("website")}</FieldLabel>
          <FieldDescription id={`${id}-hint`}>{t("websiteHint")}</FieldDescription>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${id}-site`}
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value);
                setInvalid(false);
                if (start.isError) start.reset();
              }}
              placeholder={t("websitePlaceholder")}
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              className="h-12 flex-1 rounded-xl px-3.5 text-base md:text-base"
              aria-describedby={error ? `${id}-error` : `${id}-hint`}
              aria-invalid={Boolean(error)}
            />
            <Button type="submit" variant="brand" size="lg" className="h-12 rounded-xl px-5 text-base font-semibold" disabled={busy}>
              {busy ? t("starting") : t("start")}
              {!busy && <ArrowRight aria-hidden data-icon="inline-end" />}
            </Button>
          </div>
          <FieldError id={`${id}-error`}>{error}</FieldError>
        </Field>
        <Field className="sm:max-w-xs">
          <FieldLabel htmlFor={`${id}-country`}>{t("country")}</FieldLabel>
          <FieldDescription>{t("countryHint")}</FieldDescription>
          <CountrySelect id={`${id}-country`} value={country} onChange={setCountry} />
        </Field>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {t("asks")}
          {(["chatgpt", "gemini"] as const).map((engine) => (
            <span key={engine} className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <EngineIcon engine={engine} />
              {engines(engine)}
            </span>
          ))}
        </p>
      </form>
      <ol className="grid gap-4 sm:grid-cols-3">
        {POINTS.map((point, index) => (
          <li key={point} className="flex flex-col gap-1.5 border-t pt-4">
            <span className="font-mono text-xs font-semibold text-brand">{String(index + 1).padStart(2, "0")}</span>
            <span className="font-semibold">{t(`points.${point}.title`)}</span>
            <span className="text-sm text-pretty text-muted-foreground">{t(`points.${point}.text`)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
