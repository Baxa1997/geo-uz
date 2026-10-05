"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Logo } from "@/shared/components/logo";
import { LogoutButton } from "@/shared/components/logout-button";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { normalizeDomain } from "@/shared/helpers/domain";
import { cn } from "@/shared/helpers/utils";
import type { CreateProjectRequest, SuggestCompetitorsRequest, SuggestPromptsRequest } from "@/shared/types/api";
import { ALL_TOPICS, MAX_COMPETITORS, ONBOARDING_STEPS } from "../constants";
import { isFilled } from "../helpers/brand-draft";
import {
  competitorChoice,
  onboardingRequest,
  questionDrafts,
  siteDraft,
  topicDrafts,
  validateChoice,
  validateQuestions,
  validateSite,
  validateTopics,
  validateWebsite,
} from "../helpers/onboarding";
import type { CompetitorChoice, OnboardingErrors, QuestionDraft, SiteDraft, TopicDraft } from "../types";
import { CompetitorPicker } from "./competitor-picker";
import { ProfileFields } from "./profile-fields";
import { QuestionPicker } from "./question-picker";
import { TopicPicker } from "./topic-picker";
import { WebsiteField } from "./website-field";
import { WizardPreview } from "./wizard-preview";

/** Suggestions with what they were asked for: asking again with the same inputs keeps the user's edits. */
type Fetched<T> = T & { inputs: string };

/** A failed call shows its own error message below the form; the step just stays. */
const attempt = <T, I>(mutation: UseMutationResult<T, Error, I>, input: I) =>
  mutation.mutateAsync(input).catch(() => undefined);

/**
 * First project in 5 steps, each pre-filled by the backend: the website, the brand profile read from it,
 * suggested competitors, the topics of the suggested questions, then the questions. The form is on the
 * left; on wide screens a faded picture of the app on the right shows where each answer will appear.
 * Ends on the first run's progress.
 */
export function OnboardingWizard({
  initialWebsite,
  fromCheck,
  who,
  firstName,
  year,
}: {
  initialWebsite: string;
  /** The free check's site, when the user came from it. */
  fromCheck: string | null;
  /** Who is logged in, as shown at the top: name, phone or Telegram username. */
  who: string | null;
  /** For the greeting on the first step. */
  firstName: string | null;
  year: number;
}) {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [index, setIndex] = useState(0);
  const [website, setWebsite] = useState(initialWebsite);
  const [site, setSite] = useState<SiteDraft | null>(null);
  const [choice, setChoice] = useState<Fetched<CompetitorChoice> | null>(null);
  const [suggested, setSuggested] = useState<Fetched<{ questions: QuestionDraft[]; topics: TopicDraft[] }> | null>(null);
  const [shown, setShown] = useState(ALL_TOPICS);
  const [errors, setErrors] = useState<OnboardingErrors>({});

  const analyze = useMutation({ mutationFn: (domain: string) => api.analyzeSite({ domain }) });
  const findCompetitors = useMutation({
    mutationFn: (body: SuggestCompetitorsRequest) => api.suggestCompetitors(body),
  });
  const findQuestions = useMutation({ mutationFn: (body: SuggestPromptsRequest) => api.suggestPrompts(body) });
  const create = useMutation({
    mutationFn: (body: CreateProjectRequest) => api.createProject(body),
    onSuccess: async ({ project, runId }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      // Replace: going back must not land on the wizard and create the project twice
      router.replace(runId ? `/onboarding/runs/${runId}` : `/projects/${project.id}`);
    },
  });
  const busy =
    analyze.isPending || findCompetitors.isPending || findQuestions.isPending || create.isPending || create.isSuccess;

  const step = ONBOARDING_STEPS[index];
  const last = index === ONBOARDING_STEPS.length - 1;

  function goTo(next: number) {
    setIndex(next);
    setErrors({});
    // New step: start reading (and scrolling) from its heading
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  /** Shows the errors (until the next edit) and moves focus to the first field to fix; true if there were any. */
  function failed(found: OnboardingErrors) {
    setErrors(found);
    if (Object.keys(found).length === 0) return false;
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus(),
    );
    return true;
  }

  async function nextFromWebsite() {
    if (failed(validateWebsite(website))) return;
    const domain = normalizeDomain(website);
    // The profile describes the analyzed site: a different address needs a new analysis
    if (site?.domain !== domain) {
      const analysis = await attempt(analyze, domain);
      if (!analysis) return;
      setSite(siteDraft(analysis));
    }
    goTo(1);
  }

  async function nextFromProfile() {
    if (!site || failed(validateSite(site))) return;
    const body = { domain: site.domain, name: site.name.trim(), category: site.category, city: site.city };
    const inputs = JSON.stringify([body.domain, body.category, body.city]);
    if (choice?.inputs !== inputs) {
      const suggestions = await attempt(findCompetitors, body);
      if (!suggestions) return;
      setChoice({ ...competitorChoice(suggestions), inputs });
    }
    goTo(2);
  }

  async function nextFromCompetitors() {
    if (!site || !choice || failed(validateChoice(choice))) return;
    const body = { name: site.name.trim(), category: site.category, city: site.city, services: site.services };
    const inputs = JSON.stringify([body.category, body.city, body.services]);
    if (suggested?.inputs !== inputs) {
      const suggestions = await attempt(findQuestions, body);
      if (!suggestions) return;
      const questions = questionDrafts(suggestions);
      setSuggested({ questions, topics: topicDrafts(questions), inputs });
      setShown(ALL_TOPICS);
    }
    goTo(3);
  }

  function nextFromTopics() {
    if (!suggested || failed(validateTopics(suggested.topics))) return;
    // The topic last on screen may have been unticked since
    if (!suggested.topics.some((topic) => topic.selected && topic.topic === shown)) setShown(ALL_TOPICS);
    goTo(4);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (step === "website") return void nextFromWebsite();
    if (step === "profile") return void nextFromProfile();
    if (step === "competitors") return void nextFromCompetitors();
    if (step === "topics") return nextFromTopics();
    if (!site || !choice || !suggested || failed(validateQuestions(suggested.questions, suggested.topics))) return;
    create.mutate(onboardingRequest(site, choice, suggested.topics, suggested.questions));
  }

  const pending = analyze.isPending
    ? t("analyzing")
    : findCompetitors.isPending
      ? t("loadingCompetitors")
      : findQuestions.isPending
        ? t("loadingQuestions")
        : create.isPending || create.isSuccess
          ? t("creating")
          : null;
  const callError =
    (step === "website" && analyze.isError && t("analyzeFailed")) ||
    (step === "profile" && findCompetitors.isError && t("competitorsFailed")) ||
    (step === "competitors" && findQuestions.isError && t("questionsFailed")) ||
    (step === "questions" && create.isError && t("saveFailed"));
  const chosen = choice
    ? [
        ...choice.suggestions.filter((_, i) => choice.selected[i]),
        ...(choice.manual && isFilled(choice.manual) ? [choice.manual] : []),
      ]
    : [];

  return (
    <div className="flex min-h-svh lg:h-svh lg:overflow-hidden">
      <div className="flex w-full min-w-0 flex-col bg-background lg:w-[34rem] lg:shrink-0 xl:w-[38rem]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 sm:px-10">
          <Logo />
          <div className="flex min-w-0 items-center gap-1">
            {who && <span className="hidden truncate text-sm text-muted-foreground sm:block">{t("loggedInAs", { who })}</span>}
            <LogoutButton />
          </div>
        </header>

        <form ref={formRef} onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-8 sm:px-10 sm:pt-10 lg:overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase tabular-nums">
                {t("stepLabel")} <span className="text-foreground">{index + 1}</span>/{ONBOARDING_STEPS.length}
              </p>
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-balance outline-none">
                {t(`steps.${step}.title`)}
              </h1>
              <p className="text-sm text-pretty text-muted-foreground">
                {step === "website" && firstName
                  ? t("steps.website.greeting", { name: firstName })
                  : t(`steps.${step}.description`, { max: MAX_COMPETITORS })}
              </p>
            </div>

            {step === "website" && (
              <WebsiteField
                id={id}
                website={website}
                fromCheck={fromCheck}
                onChange={(value) => {
                  setWebsite(value);
                  setErrors({});
                }}
                errors={errors}
              />
            )}
            {step === "profile" && site && (
              <ProfileFields
                id={id}
                site={site}
                onChange={(patch) => {
                  setSite((current) => current && { ...current, ...patch });
                  setErrors({});
                }}
                errors={errors}
              />
            )}
            {step === "competitors" && choice && (
              <CompetitorPicker
                id={id}
                choice={choice}
                errors={errors}
                onChange={(next) => {
                  setChoice({ ...choice, ...next });
                  setErrors({});
                }}
              />
            )}
            {step === "topics" && suggested && (
              <TopicPicker
                id={id}
                topics={suggested.topics}
                questions={suggested.questions}
                errors={errors}
                onChange={(topics) => {
                  setSuggested({ ...suggested, topics });
                  setErrors({});
                }}
              />
            )}
            {step === "questions" && suggested && (
              <>
                <QuestionPicker
                  questions={suggested.questions}
                  topics={suggested.topics}
                  shown={shown}
                  onShow={setShown}
                  errors={errors}
                  onChange={(questions) => {
                    setSuggested({ ...suggested, questions });
                    setErrors({});
                  }}
                />
                {/* Said before the start: no tool can show the weeks before tracking began */}
                <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-pretty">
                  <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {t("historyNote")}
                </p>
              </>
            )}

            {callError && (
              <p role="alert" className="text-sm text-destructive">
                {callError}
              </p>
            )}
            {/* Says what the busy button is waiting for */}
            <p aria-live="polite" className="sr-only">
              {pending}
            </p>
          </div>

          {/* The form fades out under the buttons, so it's clear there's more above them */}
          <div className="sticky bottom-0 z-10 grid shrink-0 grid-cols-2 gap-3 border-t bg-background px-5 py-4 before:pointer-events-none before:absolute before:inset-x-0 before:-top-10 before:hidden before:h-10 before:bg-gradient-to-t before:from-background before:to-transparent sm:px-10 lg:border-t-0 lg:before:block">
            {index > 0 && (
              <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => goTo(index - 1)} disabled={busy}>
                {t("back")}
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className={cn("h-auto min-h-11 px-4 py-2 whitespace-normal", index === 0 && "col-span-2")}
            >
              {pending ?? (last ? t("finish") : t("next"))}
            </Button>
          </div>
        </form>

        <footer className="flex shrink-0 items-center justify-between gap-3 px-5 pb-5 text-sm text-muted-foreground sm:px-10">
          <span>{t("copyright", { year })}</span>
          <LocaleSwitcher />
        </footer>
      </div>

      <div className="relative hidden min-w-0 flex-1 overflow-hidden border-l bg-sidebar lg:block">
        <WizardPreview
          step={step}
          website={website}
          site={site}
          competitors={chosen}
          topics={suggested?.topics ?? []}
          questions={suggested?.questions ?? []}
          shown={shown}
        />
      </div>
    </div>
  );
}
