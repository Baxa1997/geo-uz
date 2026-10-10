"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChipInput } from "@/shared/components/chip-input";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { cn } from "@/shared/helpers/utils";
import type { PromptLanguage, SuggestedPrompt } from "@/shared/types/api";

const MAX_CHIPS = 12;
const LANGUAGES: PromptLanguage[] = ["uz", "ru"];

/**
 * Peec's Discovery in two steps, on the right of the page. First "tell us about you": what the business
 * sells (the project's services, prefilled), who buys it (customer types), and anything the questions
 * should follow. Then the languages to ask in, the city being the project's. "Find questions" saves the
 * services and customer types to the project and makes new suggestions with new topics; the page then
 * opens the Suggested tab with them marked new.
 */
export function DiscoveryForm({
  projectId,
  services: initialServices,
  customers: initialCustomers,
  languages: initialLanguages,
  city,
  suggestedHref,
}: {
  projectId: string;
  services: string[];
  customers: string[];
  languages: PromptLanguage[];
  /** The project's city, as written. */
  city: string;
  /** The Suggested tab, without the count of new suggestions. */
  suggestedHref: string;
}) {
  const t = useTranslations("PromptDiscovery");
  const names = useTranslations("Locales");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [services, setServices] = useState(initialServices);
  const [customers, setCustomers] = useState(initialCustomers);
  const [context, setContext] = useState("");
  const [languages, setLanguages] = useState<PromptLanguage[]>(initialLanguages.length ? initialLanguages : LANGUAGES);
  const [error, setError] = useState("");

  const discover = useMutation({
    mutationFn: () => api.discoverPrompts(projectId, { services, customers, context: context.trim(), languages }),
    onSuccess: (created) => {
      if (created.length === 0) {
        setError(t("nothingNew"));
        return;
      }
      // The questions page may still hold the suggestions from before: the new ones go on top of them
      queryClient.setQueryData<SuggestedPrompt[]>(queryKeys.promptSuggestions(projectId), (list) => (list ? [...created, ...list] : list));
      router.push(`${suggestedHref}${suggestedHref.includes("?") ? "&" : "?"}new=${created.length}`);
    },
    onError: () => setError(t("failed")),
  });

  function next() {
    setError("");
    if (services.length + customers.length === 0) setError(t("needSomething"));
    else setStep(2);
  }

  return (
    <div className="flex min-h-full flex-col">
      <div data-tour="form" className="flex flex-1 flex-col gap-6 px-5 py-8 sm:px-10 sm:py-12">
        <p className="text-xs font-medium text-muted-foreground tabular-nums">{t("step", { step, steps: 2 })}</p>
        {step === 1 ? (
          <>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-semibold tracking-tight">{t("aboutTitle")}</h2>
              <p className="text-pretty text-muted-foreground">{t("aboutText")}</p>
            </div>
            <div className="flex flex-col gap-7 border-t pt-7">
              <ChipInput id="discovery-services" label={t("services")} hint={t("servicesHint")} values={services} max={MAX_CHIPS} onChange={setServices} />
              <div className="border-t" />
              <ChipInput id="discovery-customers" label={t("customers")} hint={t("customersHint")} values={customers} max={MAX_CHIPS} onChange={setCustomers} />
              <div className="border-t" />
              <div className="flex flex-col gap-1">
                <label htmlFor="discovery-context" className="text-sm font-medium">
                  {t("context")}
                </label>
                <p className="text-sm text-pretty text-muted-foreground">{t("contextHint")}</p>
                <textarea
                  id="discovery-context"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder={t("contextPlaceholder")}
                  rows={3}
                  maxLength={500}
                  className="mt-2 w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-semibold tracking-tight">{t("marketsTitle")}</h2>
              <p className="text-pretty text-muted-foreground">{t("marketsText", { city })}</p>
            </div>
            <fieldset className="flex flex-col gap-2 border-t pt-7">
              <legend className="sr-only">{t("languages")}</legend>
              <p className="mb-1 text-sm font-medium">{t("languages")}</p>
              {LANGUAGES.map((language) => {
                const on = languages.includes(language);
                return (
                  <button
                    key={language}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setLanguages(on ? languages.filter((item) => item !== language) : [...languages, language])}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      on ? "border-foreground/30 bg-muted/50" : "hover:bg-muted/30",
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{names(language)}</span>
                      <span className="text-muted-foreground">{t(`languageNote.${language}`)}</span>
                    </span>
                    <span aria-hidden className={cn("flex size-5 items-center justify-center rounded-md border", on && "border-foreground bg-foreground text-background")}>
                      {on && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })}
            </fieldset>
            <dl className="grid gap-1 rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("services")}</dt>
                <dd className="text-right">{services.length > 0 ? services.join(", ") : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("customers")}</dt>
                <dd className="text-right">{customers.length > 0 ? customers.join(", ") : "—"}</dd>
              </div>
            </dl>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-pretty text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* The step's buttons stay at the bottom, as on Peec */}
      <div data-tour="buttons" className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-background px-5 py-4 sm:px-10">
        {step === 2 ? (
          <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
            <ArrowLeft aria-hidden data-icon="inline-start" />
            {t("back")}
          </Button>
        ) : (
          <span />
        )}
        {step === 1 ? (
          <Button size="lg" onClick={next}>
            {t("next")}
          </Button>
        ) : (
          <Button size="lg" disabled={languages.length === 0 || discover.isPending} onClick={() => discover.mutate()}>
            <Sparkles aria-hidden data-icon="inline-start" className={cn(discover.isPending && "animate-pulse")} />
            {discover.isPending ? t("finding") : t("find")}
          </Button>
        )}
      </div>
    </div>
  );
}
