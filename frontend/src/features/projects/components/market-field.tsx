"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CountrySelect } from "@/shared/components/country-select";
import { Button } from "@/shared/components/ui/button";
import { FieldLabel } from "@/shared/components/ui/field";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { countryName } from "@/shared/helpers/labels";
import type { FirstRun, FirstRunDraft } from "@/shared/types/api";
import { questionLanguages } from "../helpers/market";

/**
 * Where the customers are, at the top of step 2 (25 Nov 2026, the user: "if it was in Uzbekistan even in USA it must
 * measure"): the market the check will be asked in and its questions' languages, read from the website unless the
 * owner picked it, a warning when the website points elsewhere, and a word to check it when the website said too little.
 * Another market writes the draft again: the website is read anew for customers there, about a minute.
 */
export function MarketField({ run, draft }: { run: FirstRun; draft: FirstRunDraft }) {
  const t = useTranslations("FirstRun.setup.market");
  const s = useTranslations("FirstRun.setup");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const id = useId();
  // A country picked in the list, waiting for the owner to confirm the rewrite
  const [asked, setAsked] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: (country: string) => api.changeFirstRunMarket(run.id, country),
    onSuccess: (changed) => {
      // The run first, so the old draft's query stops (it runs only on `ready`); then the old draft goes, and the
      // reading screen stands until the new one is written
      queryClient.setQueryData(queryKeys.firstRun(run.id), changed);
      queryClient.removeQueries({ queryKey: queryKeys.firstRunDraft(run.id) });
    },
  });
  const name = (code: string) => countryName(locale, code);
  const languages = questionLanguages(draft.country)
    .map((language) => s(`languages.${language}`))
    .join(" + ");
  const elsewhere = draft.countryFrom === "owner" && draft.siteCountry && draft.siteCountry !== draft.country ? draft.siteCountry : null;
  const unsure = draft.thin || draft.countryFrom === "default";
  const status = change.error instanceof ApiError ? change.error.status : null;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border px-4 py-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <FieldLabel htmlFor={`${id}-market`} className="shrink-0">
          {t("title")}
        </FieldLabel>
        <div className="sm:w-64">
          <CountrySelect id={`${id}-market`} value={asked ?? draft.country} onChange={(country) => setAsked(country === draft.country ? null : country)} />
        </div>
      </div>
      <p className="text-sm text-pretty text-muted-foreground">
        {t("line", { country: name(draft.country), languages })}
        {draft.countryFrom === "site" && !unsure && ` ${t("fromSite")}`}
      </p>
      {unsure && !asked && <p className="text-sm font-medium text-pretty">{t("unsure")}</p>}
      {elsewhere && !asked && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-progress/40 bg-progress/10 px-3 py-2.5 text-sm text-pretty">
          {t("elsewhere", { site: name(elsewhere), country: name(draft.country) })}
          <Button type="button" size="sm" disabled={change.isPending} onClick={() => change.mutate(elsewhere)}>
            {change.isPending ? t("starting") : t("useSite", { site: name(elsewhere) })}
          </Button>
        </div>
      )}
      {asked && (
        <div className="flex flex-col items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-pretty">
          {t("confirm", { country: name(asked) })}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={change.isPending} onClick={() => change.mutate(asked)}>
              {change.isPending ? t("starting") : t("rewrite", { country: name(asked) })}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={change.isPending} onClick={() => setAsked(null)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
      {change.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t(status === 429 ? "limit" : "failed")}
        </p>
      )}
    </div>
  );
}
