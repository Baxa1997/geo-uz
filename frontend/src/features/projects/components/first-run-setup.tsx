"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CircleNotchIcon as LoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { InfoIcon as Info } from "@phosphor-icons/react/dist/ssr/Info";
import { useMessages, useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChipInput } from "@/shared/components/chip-input";
import { CountrySelect } from "@/shared/components/country-select";
import { EngineIcon } from "@/shared/components/engine-icon";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo, LogoMark, Wordmark } from "@/shared/components/logo";
import { LogoutButton } from "@/shared/components/logout-button";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { MAX_BRAND_QUESTIONS } from "@/shared/constants";
import { DEFAULT_COUNTRY } from "@/shared/constants/countries";
import { normalizeDomain } from "@/shared/helpers/domain";
import { cn } from "@/shared/helpers/utils";
import type { FirstRun, FirstRunConfirm, FirstRunDraft } from "@/shared/types/api";
import { useAnswerEngines } from "../hooks/use-answer-engines";
import { FIRST_CHECK_STEPS, INPUT_CLASS, MAX_ALIASES, MAX_COMPETITORS, MAX_DESCRIPTION_LENGTH, MAX_SERVICES, OWN_QUESTION_TOPIC } from "../constants";
import { onboardingRequest, questionDrafts, topicDrafts, validateChoice, validateFirstQuestions, validateSite, validateWebsite } from "../helpers/onboarding";
import type { BrandDraft, CompetitorChoice, OnboardingErrors, QuestionDraft, SiteDraft } from "../types";
import { CompetitorRows } from "./competitor-rows";
import { QuestionList, type ListedQuestion } from "./question-list";
import { SuggestInput } from "./suggest-input";
import { WebsiteField } from "./website-field";

type Step = (typeof FIRST_CHECK_STEPS)[number];
type Frame = { who: string | null; year: number };

const READING = ["profile", "competitors", "questions"] as const;
/** The countries whose customers type in Russian (`firstrun.RUSSIAN_SPEAKING` in the backend). */
const RUSSIAN_SPEAKING = ["KZ", "KG", "TJ", "TM", "RU", "BY"];
/** The languages the questions are written in, by country, as the backend decides it (`firstrun.languages_for`). */
const questionLanguages = (country: string) => (country === "UZ" ? (["uz", "ru"] as const) : RUSSIAN_SPEAKING.includes(country) ? (["ru"] as const) : (["en"] as const));

/**
 * The first check's four steps, before anybody is asked (the user's correction, 16 Nov 2026: "I don't
 * understand the flow"), laid out as the pictures they sent: our name on a navy panel at the left, and at
 * the right the step's title, the numbered steps, its fields, Previous and Next. 1 the company, its website
 * and country; then what we read from the site, each to correct: 2 the business, 3 its competitors, 4 the
 * questions. The last button starts the check on exactly what was confirmed.
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
    <Shell step="profile" title={t("reading.title")} description={t("reading.text", { site: run.domain })} onBack={another} submit={t("next")} disabled {...frame}>
      {draft.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("draftFailed")}
        </p>
      ) : (
        <ul className="flex flex-col rounded-xl border">
          {READING.map((item, index) => (
            <li key={item} className="flex animate-rise flex-col gap-3 border-t px-4 py-3.5 text-sm first:border-t-0" style={{ animationDelay: `${index * 120}ms` }}>
              <span className="flex items-center gap-3">
                <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-brand motion-reduce:animate-none" />
                {t(`reading.${item}`)}
              </span>
              {/* What is being prepared, in outline: the shape of the next steps, not a measure of progress */}
              <ReadingPreview item={item} />
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

/** The outline under a line of the website's reading: a profile, competitor rows, question cards. */
function ReadingPreview({ item }: { item: (typeof READING)[number] }) {
  if (item === "profile") {
    return (
      <span aria-hidden className="flex flex-col gap-2 pl-7">
        <span className="skeleton h-3 w-2/3" />
        <span className="skeleton h-3 w-1/2" />
      </span>
    );
  }
  if (item === "competitors") {
    return (
      <span aria-hidden className="flex flex-wrap gap-2 pl-7">
        {[28, 36, 24].map((width) => (
          <span key={width} className="flex items-center gap-1.5">
            <span className="skeleton size-5 rounded-full" />
            <span className="skeleton h-3" style={{ width: `${width * 3}px` }} />
          </span>
        ))}
      </span>
    );
  }
  return (
    <span aria-hidden className="flex flex-col gap-2 pl-7">
      {[0, 1].map((line) => (
        <span key={line} className="flex items-center gap-2 rounded-lg border px-2.5 py-2">
          <span className="skeleton size-4 shrink-0 rounded-sm" />
          <span className={cn("skeleton h-3", line ? "w-1/2" : "w-3/4")} />
        </span>
      ))}
    </span>
  );
}

/** Step 1: the company's name, its website, and the country its customers are in. Starts the reading, which asks nobody. */
function WebsiteStep({ site, ...frame }: Frame & { site: string }) {
  const t = useTranslations("FirstRun");
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(site);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const start = useMutation({
    mutationFn: (domain: string) => api.startFirstRun({ domain, country, ...(name.trim() ? { name: name.trim() } : {}) }),
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
    <Shell step="website" title={t("setup.website.title")} description={t("setup.website.text")} onSubmit={submit} submit={busy ? t("setup.readingSite") : t("setup.next")} disabled={busy} {...frame}>
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>
          {t("setup.company")} <span className="font-normal text-muted-foreground">({t("setup.optional")})</span>
        </FieldLabel>
        <Input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("setup.companyPlaceholder")} autoComplete="organization" maxLength={120} className={INPUT_CLASS} />
      </Field>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-country`}>{t("setup.country")}</FieldLabel>
          <CountrySelect id={`${id}-country`} value={country} onChange={setCountry} />
        </Field>
        <Field>
          <FieldLabel>{t("setup.language")}</FieldLabel>
          {/* Not a choice: the questions are written in the country's languages */}
          <p className="flex h-10 items-center rounded-lg border bg-muted/50 px-3 text-sm">{questionLanguages(country).map((language) => t(`setup.languages.${language}`)).join(" + ")}</p>
        </Field>
      </div>
      <p className="-mt-2 text-sm text-pretty text-muted-foreground">{t("setup.countryHint")}</p>
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
    </Shell>
  );
}

/** "Asked on: ChatGPT · about N minutes", under the questions: the assistants the backend asks now. */
function AskedOn() {
  const t = useTranslations("FirstRun");
  const engines = useTranslations("Engines");
  const asked = useAnswerEngines();
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-xl border bg-muted/40 px-4 py-3.5 text-sm text-muted-foreground">
      {t("asks")}
      {asked.map((engine) => (
        <span key={engine} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 font-medium text-foreground">
          <EngineIcon engine={engine} />
          {engines(engine)}
        </span>
      ))}
      <span>· {t("setup.time")}</span>
    </p>
  );
}

/** Steps 2 to 4 on a draft: every field starts as the website gave it and is the owner's to change. */
function DraftSteps({ run, draft, onAnother, ...frame }: Frame & { run: FirstRun; draft: FirstRunDraft; onAnother: () => void }) {
  const t = useTranslations("FirstRun.setup");
  const o = useTranslations("Onboarding");
  const messages = useMessages();
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
  const [brandQuestions, setBrandQuestions] = useState<ListedQuestion[]>(() => draft.brandQuestions.slice(0, MAX_BRAND_QUESTIONS).map((question, i) => ({ ...question, key: `brand-${i}` })));
  const confirm = useMutation({
    mutationFn: (body: FirstRunConfirm) => api.confirmFirstRun(run.id, body),
    // The flow above reads the run from the cache: with "asking" in it, the progress takes this screen's place
    onSuccess: (started) => queryClient.setQueryData(queryKeys.firstRun(run.id), started),
  });
  const busy = confirm.isPending || confirm.isSuccess;
  const step = FIRST_CHECK_STEPS[index];
  const max = draft.maxQuestions;
  const patch = (change: Partial<SiteDraft>) => {
    setSite((current) => ({ ...current, ...change }));
    setErrors({});
  };

  function go(next: number) {
    setIndex(next);
    setErrors({});
  }

  function submit() {
    if (busy) return;
    // A row still being written is not a question yet
    const written = questions.filter((question) => question.text);
    const topics = topicDrafts(written);
    const found = step === "profile" ? validateSite(site) : step === "competitors" ? validateChoice(choice) : validateFirstQuestions(written, topics, max);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step !== "questions") return go(index + 1);
    confirm.mutate(onboardingRequest(site, choice, topics, written, brandQuestions.filter((question) => question.text).map((question) => ({ ...question, selected: true }))));
  }

  const status = confirm.error instanceof ApiError ? confirm.error.status : null;
  const more = Boolean(errors.services);

  return (
    <Shell
      step={step}
      title={t(`${step}.title`, { brand: site.name.trim() || draft.domain })}
      description={t(`${step}.text`, { max: step === "competitors" ? MAX_COMPETITORS : max })}
      onSubmit={submit}
      onBack={index === 1 ? onAnother : () => go(index - 1)}
      back={index === 1 ? t("anotherSite") : undefined}
      submit={busy ? t("starting") : step === "questions" ? t("startCheck") : t("next")}
      disabled={busy}
      {...frame}
    >
      {draft.replayed && (
        <p className="flex items-start gap-2 rounded-lg border border-progress/40 bg-progress/10 px-3 py-2.5 text-sm text-pretty">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-progress" />
          {t("replayed", { site: draft.domain })}
        </p>
      )}
      {step === "profile" && (
        <>
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor={`${id}-name`}>{t("company")}</FieldLabel>
            <Input id={`${id}-name`} value={site.name} onChange={(event) => patch({ name: event.target.value })} autoComplete="organization" className={INPUT_CLASS} aria-invalid={Boolean(errors.name)} />
            <FieldError>{errors.name && o(errors.name)}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor={`${id}-description`}>{t("whatYouDo")}</FieldLabel>
            <Textarea
              id={`${id}-description`}
              value={site.description}
              onChange={(event) => patch({ description: event.target.value })}
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={4}
              className="min-h-28 text-sm"
              aria-invalid={Boolean(errors.description)}
            />
            <FieldError>{errors.description && o(errors.description)}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.category)}>
            <FieldLabel htmlFor={`${id}-category`}>{t("sector")}</FieldLabel>
            <SuggestInput id={`${id}-category`} options={messages.Categories} value={site.category} onChange={(category) => patch({ category })} placeholder={o("categoryPlaceholder")} invalid={Boolean(errors.category)} />
            <FieldError>{errors.category && o(errors.category)}</FieldError>
          </Field>
          {/* The rest is read from the site too and rarely needs a hand: folded, opened by itself when something in it is missing */}
          <details open={more || undefined} className="group rounded-xl border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {t("more")}
              <span className="ml-2 font-normal text-muted-foreground">{t("moreNote", { services: site.services.length })}</span>
            </summary>
            <div className="flex flex-col gap-5 pt-4 pb-1">
              <ChipInput id={`${id}-services`} label={o("services")} hint={o("servicesHint")} values={site.services} max={MAX_SERVICES} onChange={(services) => patch({ services })} />
              {errors.services && (
                <p role="alert" tabIndex={-1} className="-mt-3 text-sm text-destructive">
                  {o(errors.services)}
                </p>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-country`}>{o("country")}</FieldLabel>
                  <CountrySelect id={`${id}-country`} value={site.country} onChange={(country) => patch({ country })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-city`}>
                    {o("city")} <span className="font-normal text-muted-foreground">({o("optional")})</span>
                  </FieldLabel>
                  <SuggestInput id={`${id}-city`} options={site.country === DEFAULT_COUNTRY ? messages.Cities : {}} value={site.city} onChange={(city) => patch({ city })} placeholder={o("cityPlaceholder")} />
                </Field>
              </div>
              <ChipInput id={`${id}-aliases`} label={o("aliases")} hint={o("aliasesHint")} values={site.aliases} max={MAX_ALIASES} onChange={(aliases) => patch({ aliases })} />
            </div>
          </details>
        </>
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
          {errors.questions && (
            <p role="alert" className="text-sm text-destructive">
              {o(errors.questions, { max })}
            </p>
          )}
          <QuestionList
            id={`${id}-q`}
            items={questions}
            max={max}
            placeholder={t("list.placeholder")}
            onChange={(list) => {
              // A kept question keeps its topic; a new one has none of ours
              setQuestions(list.map((item) => ({ ...item, topic: questions.find((question) => question.key === item.key)?.topic ?? OWN_QUESTION_TOPIC, selected: true })));
              setErrors({});
            }}
          />
          <div className="flex flex-col gap-1 pt-3">
            <h2 className="font-semibold">{t("brandTitle", { brand: site.name.trim() || draft.domain })}</h2>
            <p className="text-sm text-pretty text-muted-foreground">{t("brandText")}</p>
          </div>
          <QuestionList id={`${id}-b`} items={brandQuestions} max={MAX_BRAND_QUESTIONS} placeholder={t("list.brandPlaceholder", { brand: site.name.trim() || draft.domain })} onChange={setBrandQuestions} />
          <AskedOn />
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

/** The numbered steps across the page: done ones ticked, the current one ringed, a line between them. */
function Stepper({ current }: { current: number }) {
  const t = useTranslations("FirstRun.setup");
  return (
    <ol className="flex items-start">
      {FIRST_CHECK_STEPS.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={step} aria-current={state === "active" ? "step" : undefined} className={cn("flex flex-col gap-2", index > 0 && "flex-1")}>
            <span className="flex items-center">
              {index > 0 && <span aria-hidden className={cn("mx-2.5 h-[3px] flex-1 rounded-full", state === "todo" ? "bg-muted" : "bg-brand")} />}
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold",
                  state === "todo" ? "bg-muted text-muted-foreground" : "bg-brand text-brand-foreground shadow-[0_6px_14px_-6px_var(--brand)]",
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
 * A step's frame, as the user's pictures: from `lg` our name on a navy panel fills the left, and the step
 * stands at the right under the account's line: its title, a sentence, the numbered steps, the fields,
 * Previous at the left and Next at the right. Exactly the window's height (the user, 18 Nov 2026: "full page
 * not scrolling … buttons must be always visible"): the title and the steps stay at the top, the fields scroll
 * between them and the bar of buttons at the foot, and the page itself never scrolls.
 */
function Shell({
  step,
  title,
  description,
  onSubmit,
  onBack,
  back,
  submit,
  disabled = false,
  who,
  year,
  children,
}: Frame & {
  step: Step;
  title: string;
  description: string;
  onSubmit?: () => void;
  onBack?: () => void;
  /** The back button's words when it does more than step back. */
  back?: string;
  submit: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("Onboarding");
  const panel = useTranslations("FirstRun.setup.panel");
  const formRef = useRef<HTMLFormElement>(null);

  function handle(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
    // An error just shown: move to the first field to fix
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus());
  }

  return (
    <div data-screen className="flex h-dvh overflow-hidden">
      {/* A painted gradient, nothing blurred or moving */}
      <aside className="hidden h-full w-[42%] max-w-[46rem] shrink-0 flex-col justify-between bg-[linear-gradient(155deg,#0b1335_0%,#1c2e6e_52%,#3f63c8_100%)] p-12 text-white lg:flex">
        <span />
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="flex items-center gap-3.5">
            <LogoMark className="size-12 text-white" />
            <Wordmark tone="dark" className="text-5xl" />
          </span>
          <p className="max-w-sm text-lg text-pretty text-white/75">{panel("tagline")}</p>
        </div>
        <p className="text-sm text-white/55">{t("copyright", { year })}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 sm:px-10">
          <Logo className="lg:invisible" />
          <div className="flex min-w-0 items-center gap-1 rounded-full border py-1 pr-1 pl-4">
            {who && <span className="hidden truncate pr-1 text-sm text-muted-foreground sm:block">{t("loggedInAs", { who })}</span>}
            <LocaleSwitcher />
            <LogoutButton />
          </div>
        </header>

        <form ref={formRef} onSubmit={handle} noValidate className="flex min-h-0 flex-1 flex-col">
          {/* Where the owner is: the step's title and the numbered steps, always in view */}
          <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-5 px-5 pt-3 pb-5 sm:gap-7 sm:px-10 sm:pt-8 sm:pb-6">
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <h1 className="text-2xl font-bold tracking-[-0.03em] text-balance sm:text-[2.125rem]">{title}</h1>
              <p className="text-sm text-pretty text-muted-foreground sm:text-base">{description}</p>
            </div>
            <Stepper current={FIRST_CHECK_STEPS.indexOf(step)} />
          </div>
          {/* The fields: the one part that scrolls. A new step starts at its top */}
          <div key={step} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 pt-1 pb-6 sm:px-10">{children}</div>
          </div>
          {/* Previous and Next, never out of view */}
          <div className="shrink-0 border-t bg-background">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3 sm:px-10 sm:py-4">
              {onBack ? (
                <Button type="button" variant="outline" size="lg" className="h-11 px-5" onClick={onBack} disabled={disabled && Boolean(onSubmit)}>
                  {back ?? t("back")}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" disabled={disabled} className="h-11 px-6">
                {submit}
                <ArrowRight aria-hidden data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
