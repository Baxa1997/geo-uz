"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CircleNotchIcon as LoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { InfoIcon as Info } from "@phosphor-icons/react/dist/ssr/Info";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CountrySelect } from "@/shared/components/country-select";
import { EngineIcon } from "@/shared/components/engine-icon";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { LogoutButton } from "@/shared/components/logout-button";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { DEFAULT_COUNTRY } from "@/shared/constants/countries";
import { normalizeDomain } from "@/shared/helpers/domain";
import { cn } from "@/shared/helpers/utils";
import type { FirstRun, FirstRunConfirm, FirstRunDraft } from "@/shared/types/api";
import { ALL_TOPICS, FIRST_CHECK_STEPS, MAX_COMPETITORS } from "../constants";
import { isFilled } from "../helpers/brand-draft";
import { brandQuestionDrafts, onboardingRequest, questionDrafts, topicDrafts, validateChoice, validateFirstQuestions, validateSite, validateWebsite } from "../helpers/onboarding";
import type { BrandDraft, BrandQuestionDraft, CompetitorChoice, OnboardingErrors, QuestionDraft, SiteDraft, TopicDraft } from "../types";
import { BrandQuestionPicker } from "./brand-question-picker";
import { CompetitorRows } from "./competitor-rows";
import { ProfileFields } from "./profile-fields";
import { QuestionPicker } from "./question-picker";
import { WebsiteField } from "./website-field";
import { WizardPreview } from "./wizard-preview";

type Step = (typeof FIRST_CHECK_STEPS)[number];
type Frame = { who: string | null; year: number };

const READING = ["profile", "competitors", "questions"] as const;

/**
 * The first check's four steps, before anybody is asked (the user's correction, 16 Nov 2026: "I don't
 * understand the flow"): the website and country; then what we read from it, each to correct: the business,
 * its competitors, the questions. The last button starts the check on exactly what was confirmed.
 * `run` null is step 1; a run being read waits on step 2; a `ready` run opens its draft.
 */
export function FirstRunSetup({ run, site = "", ...frame }: Frame & { run: FirstRun | null; /** A website given on the landing page. */ site?: string }) {
  const t = useTranslations("FirstRun.setup");
  const router = useRouter();
  const draft = useQuery({
    queryKey: queryKeys.firstRunDraft(run?.id ?? ""),
    queryFn: () => api.getFirstRunDraft(run?.id ?? ""),
    enabled: run?.status === "ready",
    staleTime: Infinity,
  });
  const another = () => router.replace("/onboarding/first-run");

  if (!run) return <WebsiteStep site={site} {...frame} />;
  if (draft.data) return <DraftSteps key={draft.data.id} run={run} draft={draft.data} onAnother={another} {...frame} />;
  return (
    <Shell step="profile" title={t("reading.title")} description={t("reading.text", { site: run.domain })} website={run.domain} onBack={another} submit={t("next")} disabled {...frame}>
      {draft.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("draftFailed")}
        </p>
      ) : (
        <ul className="flex flex-col rounded-xl border">
          {READING.map((item) => (
            <li key={item} className="flex items-center gap-3 border-t px-4 py-3.5 text-sm first:border-t-0">
              <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-brand motion-reduce:animate-none" />
              {t(`reading.${item}`)}
            </li>
          ))}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {t("reading.title")}
      </p>
    </Shell>
  );
}

/** Step 1: the website and the country its customers are in. Starts the reading, which asks nobody. */
function WebsiteStep({ site, ...frame }: Frame & { site: string }) {
  const t = useTranslations("FirstRun");
  const engines = useTranslations("Engines");
  const router = useRouter();
  const id = useId();
  const [website, setWebsite] = useState(site);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const start = useMutation({
    mutationFn: (domain: string) => api.startFirstRun({ domain, country }),
    onSuccess: (run) => router.replace({ pathname: "/onboarding/first-run", query: { run: run.id } }),
  });
  const busy = start.isPending || start.isSuccess;
  const status = start.error instanceof ApiError ? start.error.status : null;
  const failure = status === 402 ? t("setup.freeUsed") : status === 422 ? t("websiteInvalid") : status === 409 ? t("domainTaken") : status === 429 ? t("limit") : start.isError ? t("startFailed") : null;

  function submit() {
    const found = validateWebsite(website);
    setErrors(found);
    if (Object.keys(found).length === 0) start.mutate(normalizeDomain(website));
  }

  return (
    <Shell step="website" title={t("setup.website.title")} description={t("setup.website.text")} website={website} onSubmit={submit} submit={busy ? t("setup.readingSite") : t("setup.next")} disabled={busy} {...frame}>
      <WebsiteField
        id={id}
        website={website}
        fromCheck={null}
        onChange={(value) => {
          setWebsite(value);
          setErrors({});
          if (start.isError) start.reset();
        }}
        errors={errors}
      />
      <Field>
        <FieldLabel htmlFor={`${id}-country`}>{t("setup.country")}</FieldLabel>
        <FieldDescription>{t("setup.countryHint")}</FieldDescription>
        <CountrySelect id={`${id}-country`} value={country} onChange={setCountry} />
      </Field>
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        {t("asks")}
        {(["chatgpt", "gemini"] as const).map((engine) => (
          <span key={engine} className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <EngineIcon engine={engine} />
            {engines(engine)}
          </span>
        ))}
        <span>· {t("setup.time")}</span>
      </p>
    </Shell>
  );
}

/** Steps 2 to 4 on a draft: every field starts as the website gave it and is the owner's to change. */
function DraftSteps({ run, draft, onAnother, ...frame }: Frame & { run: FirstRun; draft: FirstRunDraft; onAnother: () => void }) {
  const t = useTranslations("FirstRun.setup");
  const queryClient = useQueryClient();
  const id = useId();
  const [index, setIndex] = useState(1);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [site, setSite] = useState<SiteDraft>(() => ({
    domain: draft.domain,
    name: draft.name,
    aliases: draft.aliases,
    description: draft.description,
    category: draft.category,
    country: draft.country || DEFAULT_COUNTRY,
    city: draft.city,
    services: draft.services,
  }));
  // Every competitor we found is a row to correct or remove: five at most
  const [rivals, setRivals] = useState<BrandDraft[]>(() => draft.competitors.slice(0, MAX_COMPETITORS).map(({ name, aliases, domain }) => ({ name, aliases: aliases.join(", "), domain })));
  const [logos] = useState(() => Object.fromEntries(draft.competitors.flatMap(({ domain, logo }) => (domain && logo ? [[domain, logo]] : []))));
  const choice: CompetitorChoice = { suggestions: [], selected: [], manual: rivals };
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => questionDrafts(draft.questions));
  const [topics] = useState<TopicDraft[]>(() => topicDrafts(questionDrafts(draft.questions)));
  const [brandQuestions, setBrandQuestions] = useState<BrandQuestionDraft[]>(() => brandQuestionDrafts(draft.brandQuestions));
  const [shown, setShown] = useState(ALL_TOPICS);
  const confirm = useMutation({
    mutationFn: (body: FirstRunConfirm) => api.confirmFirstRun(run.id, body),
    // The flow above reads the run from the cache: with "asking" in it, the progress takes this screen's place
    onSuccess: (started) => queryClient.setQueryData(queryKeys.firstRun(run.id), started),
  });
  const busy = confirm.isPending || confirm.isSuccess;
  const step = FIRST_CHECK_STEPS[index];
  const max = draft.maxQuestions;

  function go(next: number) {
    setIndex(next);
    setErrors({});
  }

  function submit() {
    if (busy) return;
    const found = step === "profile" ? validateSite(site) : step === "competitors" ? validateChoice(choice) : validateFirstQuestions(questions, topics, max);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step !== "questions") return go(index + 1);
    confirm.mutate(onboardingRequest(site, choice, topics, questions, brandQuestions));
  }

  const status = confirm.error instanceof ApiError ? confirm.error.status : null;
  const chosen = rivals.filter(isFilled);

  return (
    <Shell
      step={step}
      title={t(`${step}.title`, { brand: site.name.trim() || draft.domain })}
      description={t(`${step}.text`, { max: step === "competitors" ? MAX_COMPETITORS : max })}
      website={draft.domain}
      onSubmit={submit}
      onBack={index === 1 ? onAnother : () => go(index - 1)}
      back={index === 1 ? t("anotherSite") : undefined}
      submit={busy ? t("starting") : step === "questions" ? t("startCheck") : t("next")}
      disabled={busy}
      preview={{ site, competitors: chosen, topics, questions, shown }}
      {...frame}
    >
      {draft.replayed && (
        <p className="flex items-start gap-2 rounded-lg border border-progress/40 bg-progress/10 px-3 py-2.5 text-sm text-pretty">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-progress" />
          {t("replayed", { site: draft.domain })}
        </p>
      )}
      {step === "profile" && (
        <ProfileFields
          id={id}
          site={site}
          onChange={(patch) => {
            setSite((current) => ({ ...current, ...patch }));
            setErrors({});
          }}
          errors={errors}
        />
      )}
      {step === "competitors" && (
        <CompetitorRows
          id={id}
          rows={rivals}
          logos={logos}
          errors={errors}
          onChange={(next) => {
            setRivals(next);
            setErrors({});
          }}
        />
      )}
      {step === "questions" && (
        <>
          <QuestionPicker
            questions={questions}
            topics={topics}
            shown={shown}
            onShow={setShown}
            errors={errors}
            max={max}
            first
            onChange={(next) => {
              setQuestions(next);
              setErrors({});
            }}
          />
          {brandQuestions.length > 0 && <BrandQuestionPicker questions={brandQuestions} brand={site.name.trim()} onChange={setBrandQuestions} />}
        </>
      )}
      {confirm.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t(status === 402 ? "freeUsed" : status === 429 ? "limit" : "confirmFailed")}
        </p>
      )}
    </Shell>
  );
}

/** The numbered steps across the top: done ones ticked, the current one filled, a line between them. */
function Stepper({ current }: { current: number }) {
  const t = useTranslations("FirstRun.setup");
  return (
    <ol className="flex items-start">
      {FIRST_CHECK_STEPS.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={step} aria-current={state === "active" ? "step" : undefined} className={cn("flex flex-col gap-1.5", index > 0 && "flex-1")}>
            <span className="flex items-center">
              {index > 0 && <span aria-hidden className={cn("mx-2 h-0.5 flex-1 rounded-full", state === "todo" ? "bg-border" : "bg-brand")} />}
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold",
                  state === "todo" ? "bg-muted text-muted-foreground" : "bg-brand text-brand-foreground",
                  state === "active" && "ring-4 ring-brand/15",
                )}
              >
                {state === "done" ? <Check aria-hidden className="size-4" /> : index + 1}
              </span>
            </span>
            <span className={cn("text-xs", index > 0 && "text-right", state === "active" ? "font-semibold" : "text-muted-foreground")}>{t(`stepper.${step}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A step's frame: the header, the numbered steps, the step's title and fields, Back and Next at the foot;
 * from `lg` a faded picture of the app beside it shows where the answers will appear.
 */
function Shell({
  step,
  title,
  description,
  website,
  onSubmit,
  onBack,
  back,
  submit,
  disabled = false,
  preview,
  who,
  year,
  children,
}: Frame & {
  step: Step;
  title: string;
  description: string;
  website: string;
  onSubmit?: () => void;
  onBack?: () => void;
  /** The back button's words when it does more than step back. */
  back?: string;
  submit: string;
  disabled?: boolean;
  preview?: { site: SiteDraft; competitors: { name: string; domain: string }[]; topics: TopicDraft[]; questions: QuestionDraft[]; shown: string };
  children: ReactNode;
}) {
  const t = useTranslations("Onboarding");
  const formRef = useRef<HTMLFormElement>(null);

  function handle(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
    // An error just shown: move to the first field to fix
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus());
  }

  return (
    <div className="flex min-h-svh lg:h-svh lg:overflow-hidden">
      <div className="flex w-full min-w-0 flex-col bg-background lg:w-[36rem] lg:shrink-0 xl:w-[40rem]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 sm:px-10">
          <Logo />
          <div className="flex min-w-0 items-center gap-1">
            {who && <span className="hidden truncate text-sm text-muted-foreground sm:block">{t("loggedInAs", { who })}</span>}
            <LogoutButton />
          </div>
        </header>

        <form ref={formRef} onSubmit={handle} noValidate className="flex min-h-0 flex-1 flex-col">
          {/* A new step starts at its top. Nothing shrinks: a card that hides its overflow would fold to a line in a full column */}
          <div key={step} className="flex flex-1 flex-col gap-5 px-5 pt-4 pb-8 sm:px-10 sm:pt-6 lg:overflow-y-auto [&>*]:shrink-0">
            <Stepper current={FIRST_CHECK_STEPS.indexOf(step)} />
            <div className="flex flex-col gap-1.5 pt-2">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
              <p className="text-sm text-pretty text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>

          <div className="sticky bottom-0 z-10 grid shrink-0 grid-cols-2 gap-3 border-t bg-background px-5 py-4 sm:px-10">
            {onBack && (
              <Button type="button" variant="outline" size="lg" className="h-auto min-h-11 px-4 py-2 whitespace-normal" onClick={onBack} disabled={disabled && Boolean(onSubmit)}>
                {back ?? t("back")}
              </Button>
            )}
            <Button type="submit" size="lg" disabled={disabled} className={cn("h-auto min-h-11 px-4 py-2 whitespace-normal", !onBack && "col-span-2")}>
              {submit}
            </Button>
          </div>
        </form>

        <footer className="flex shrink-0 items-center justify-between gap-3 px-5 pb-5 text-sm text-muted-foreground sm:px-10">
          <span>{t("copyright", { year })}</span>
          <LocaleSwitcher up />
        </footer>
      </div>

      <div className="relative hidden min-w-0 flex-1 overflow-hidden border-l bg-sidebar lg:block">
        <WizardPreview
          step={step}
          website={website}
          site={preview?.site ?? null}
          competitors={preview?.competitors ?? []}
          topics={preview?.topics ?? []}
          questions={preview?.questions ?? []}
          shown={preview?.shown ?? ALL_TOPICS}
        />
      </div>
    </div>
  );
}
