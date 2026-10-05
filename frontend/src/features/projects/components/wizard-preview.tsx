import {
  ChevronsUpDown,
  CircleAlert,
  FileText,
  Globe,
  LayoutDashboard,
  ListChecks,
  MessageCircleQuestion,
  MessagesSquare,
  Plus,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import { ALL_TOPICS, type OnboardingStep } from "../constants";
import { questionsInTopics } from "../helpers/onboarding";
import type { QuestionDraft, SiteDraft, TopicDraft } from "../types";

type NavKey = "overview" | "prompts" | "answers" | "competitors" | "sources" | "wrongFacts" | "actions" | "reports";

/** The app's sidebar as the preview draws it (features/workspace keeps the real one). */
const NAV: { key: NavKey; icon: LucideIcon; heading?: boolean }[] = [
  { key: "overview", icon: LayoutDashboard },
  { key: "prompts", icon: MessageCircleQuestion, heading: true },
  { key: "answers", icon: MessagesSquare },
  { key: "competitors", icon: Users },
  { key: "sources", icon: Globe },
  { key: "wrongFacts", icon: CircleAlert, heading: true },
  { key: "actions", icon: ListChecks },
  { key: "reports", icon: FileText, heading: true },
];

/** Where in the app each step's answers end up. */
const PLACE: Record<OnboardingStep, NavKey | "project" | "settings"> = {
  website: "project",
  profile: "settings",
  competitors: "competitors",
  topics: "prompts",
  questions: "prompts",
};

/** The blue outline around the part of the app a step fills in. */
const HIGHLIGHT = "ring-2 ring-you/70 ring-offset-2 ring-offset-background";

const Bar = ({ className }: { className?: string }) => <span className={cn("block h-2.5 rounded-full bg-muted", className)} />;

/**
 * Beside each onboarding step: a faded picture of the app with the page that step fills in outlined,
 * redrawn as the user types and ticks. Decoration only: the form says everything to screen readers.
 */
export function WizardPreview({
  step,
  website,
  site,
  competitors,
  topics,
  questions,
  shown,
}: {
  step: OnboardingStep;
  website: string;
  site: SiteDraft | null;
  competitors: { name: string; domain: string }[];
  topics: TopicDraft[];
  questions: QuestionDraft[];
  shown: string;
}) {
  const t = useTranslations("Onboarding.preview");
  const sidebar = useTranslations("Sidebar");
  const messages = useMessages();
  const place = PLACE[step];
  const name = site?.name.trim() || website.trim() || t("yourBrand");
  const initial = name.charAt(0).toUpperCase();
  const subline = site
    ? `${labelFor(messages.Categories, site.category)} · ${labelFor(messages.Cities, site.city)}`
    : website.trim() || t("site");

  return (
    <div aria-hidden inert className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute top-28 left-12 w-[64rem] overflow-hidden rounded-2xl border bg-background shadow-[0_30px_80px_-30px_rgb(0_0_0/0.25)] xl:left-16">
        <div className="grid h-[46rem] grid-cols-[15rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 border-r bg-sidebar p-3">
            <div className={cn("flex items-center gap-2.5 rounded-xl border bg-background p-2 shadow-xs", place === "project" && HIGHLIGHT)}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                {initial}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{subline}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              {NAV.map(({ key, icon: Icon, heading }, index) => (
                <div key={key} className="flex flex-col gap-1">
                  {heading && <Bar className="mx-2.5 mt-3 mb-1 h-2 w-14 bg-foreground/10" />}
                  {place === key ? (
                    <span className={cn("flex h-9 items-center gap-3 rounded-lg bg-background px-2.5 text-sm font-medium shadow-xs", HIGHLIGHT)}>
                      <Icon className="size-[18px]" />
                      {sidebar(key)}
                    </span>
                  ) : (
                    <span className="flex h-9 items-center gap-3 px-2.5">
                      <span className="size-4 rounded-md bg-foreground/10" />
                      <Bar className={cn("bg-foreground/10", index % 3 === 0 ? "w-24" : index % 3 === 1 ? "w-16" : "w-20")} />
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Settings sits right under the pages here, above the fade, so its outline shows */}
            <div className="border-t pt-3">
              {place === "settings" ? (
                <span className={cn("flex h-9 items-center gap-3 rounded-lg bg-background px-2.5 text-sm font-medium shadow-xs", HIGHLIGHT)}>
                  <Settings className="size-[18px]" />
                  {sidebar("settings")}
                </span>
              ) : (
                <span className="flex h-9 items-center gap-3 px-2.5">
                  <span className="size-4 rounded-md bg-foreground/10" />
                  <Bar className="w-20 bg-foreground/10" />
                </span>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-6 p-8">
            {step === "website" && <OverviewBody title={sidebar("overview")} />}
            {step === "profile" && site && <ProfileBody site={site} initial={initial} />}
            {step === "competitors" && (
              <CompetitorsBody title={sidebar("competitors")} brand={name} initial={initial} competitors={competitors} />
            )}
            {(step === "topics" || step === "questions") && (
              <QuestionsBody title={sidebar("prompts")} step={step} topics={topics} questions={questions} shown={shown} />
            )}
          </div>
        </div>
      </div>
      {/* The picture fades out at the bottom, as if it went on below */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-sidebar via-sidebar/85 to-transparent" />
    </div>
  );
}

function OverviewBody({ title }: { title: string }) {
  return (
    <>
      <p className="text-xl font-semibold tracking-tight text-foreground/80">{title}</p>
      <div className="flex gap-2">
        {["w-28", "w-24", "w-32"].map((width) => (
          <span key={width} className={cn("h-8 rounded-lg border bg-background", width)} />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Bar className="w-64" />
          <Bar className="w-40" />
        </div>
        <div className="grid grid-cols-2">
          <div className="flex h-56 flex-col justify-end gap-2 border-r p-4">
            <svg viewBox="0 0 300 120" className="h-full w-full text-muted-foreground/30">
              <polyline points="0,90 50,80 100,84 150,60 200,52 250,40 300,30" fill="none" stroke="currentColor" strokeWidth="3" />
              <polyline points="0,70 50,72 100,66 150,70 200,64 250,66 300,60" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
            </svg>
          </div>
          <div className="flex flex-col gap-4 p-4">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <span className="size-3 rounded-sm bg-muted" />
                <Bar className="w-32" />
                <Bar className="ml-auto w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileBody({ site, initial }: { site: SiteDraft; initial: string }) {
  const t = useTranslations("Onboarding");
  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">{t("preview.profileTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("preview.profileText")}</p>
      </div>
      <div className="relative">
        <div className="h-28 rounded-2xl bg-muted" />
        <span className="absolute -bottom-6 left-6 flex size-16 items-center justify-center rounded-2xl border bg-background text-2xl font-medium shadow-sm">
          {initial}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-0.5">
        <p className="text-xl font-semibold">{site.name.trim() || "—"}</p>
        <p className="text-sm text-muted-foreground">{site.domain}</p>
      </div>
      <div className="flex max-w-xl flex-col gap-1.5">
        <p className="text-sm font-medium">{t("description")}</p>
        <p className="line-clamp-3 rounded-lg border px-3 py-2 text-sm text-pretty text-muted-foreground">
          {site.description.trim() || "—"}
        </p>
      </div>
      <div className="flex max-w-xl flex-col gap-1.5">
        <p className="text-sm font-medium">{t("services")}</p>
        <div className="flex flex-wrap gap-1.5">
          {site.services.map((service) => (
            <span key={service} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
              {service}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function CompetitorsBody({
  title,
  brand,
  initial,
  competitors,
}: {
  title: string;
  brand: string;
  initial: string;
  competitors: { name: string; domain: string }[];
}) {
  const t = useTranslations("BrandTable");
  const rows = [{ name: brand, initial, you: true }, ...competitors.map((c) => ({ name: c.name, initial: c.name.charAt(0).toUpperCase(), you: false }))];
  return (
    <>
      <p className="text-xl font-semibold tracking-tight">{title}</p>
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_7rem_7rem_7rem] border-b px-4 py-2.5 text-xs text-muted-foreground">
          <span>#</span>
          <span>{t("brand")}</span>
          <span>{t("visibility")}</span>
          <span>{t("sentiment")}</span>
          <span>{t("position")}</span>
        </div>
        <ul className={cn("m-2 flex flex-col rounded-lg", HIGHLIGHT)}>
          {rows.map((row, index) => (
            <li
              key={`${row.name}-${index}`}
              className={cn(
                "grid grid-cols-[2.5rem_minmax(0,1fr)_7rem_7rem_7rem] items-center px-2 py-2.5 text-sm",
                index > 0 && "border-t",
                row.you && "bg-you-soft/25",
              )}
            >
              <span className="text-muted-foreground tabular-nums">{index + 1}</span>
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[0.7rem] font-semibold">
                  {row.initial}
                </span>
                <span className="truncate">{row.name}</span>
                {row.you && <span className="shrink-0 font-normal text-muted-foreground">{t("you")}</span>}
              </span>
              <Bar className="w-14" />
              <Bar className="w-10" />
              <Bar className="w-8" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function QuestionsBody({
  title,
  step,
  topics,
  questions,
  shown,
}: {
  title: string;
  step: "topics" | "questions";
  topics: TopicDraft[];
  questions: QuestionDraft[];
  shown: string;
}) {
  const t = useTranslations("Onboarding.preview");
  const messages = useMessages();
  const ticked = topics.filter((topic) => topic.selected);
  const inTopics = questionsInTopics(questions, topics).filter((question) => question.selected);
  const listed = shown === ALL_TOPICS ? inTopics : inTopics.filter((question) => question.topic === shown);
  const label = (topic: TopicDraft) => (topic.custom ? topic.topic : labelFor(messages.Topics, topic.topic));

  return (
    <>
      <p className="text-xl font-semibold tracking-tight">{title}</p>
      <div className="flex gap-2">
        {["w-24", "w-32", "w-20", "w-28"].map((width) => (
          <span key={width} className={cn("h-8 rounded-lg border bg-background", width)} />
        ))}
      </div>
      <div className="grid grid-cols-[16rem_minmax(0,1fr)] overflow-hidden rounded-xl border">
        <div className="flex flex-col border-r">
          <p className="flex items-center justify-between border-b px-4 py-3 text-sm font-medium">
            {t("topics")}
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </p>
          <p className={cn("border-b px-4 py-3 text-sm", step === "questions" && shown === ALL_TOPICS && "bg-muted/60 font-medium")}>
            {t("allTopics")}
          </p>
          <p className="flex items-center justify-between border-b px-4 py-3 text-sm">
            {t("addTopic")}
            <Plus className="size-4" />
          </p>
          <ul className={cn("m-2 flex flex-col gap-0.5 rounded-lg p-1", step === "topics" && HIGHLIGHT)}>
            {ticked.map((topic) => (
              <li
                key={topic.topic}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                  step === "questions" && shown === topic.topic && "bg-muted/70 font-medium",
                )}
              >
                <span className="truncate">{label(topic)}</span>
                {step === "questions" && (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {inTopics.filter((question) => question.topic === topic.topic).length}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="border-b p-3">
            <span className="flex h-9 w-72 items-center gap-2 rounded-lg border px-3 text-sm text-muted-foreground">
              <Search className="size-4" />
              {t("search")}
            </span>
          </div>
          <p className="border-b bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">{t("question")}</p>
          {step === "questions" ? (
            <ul className={cn("m-2 flex flex-col rounded-lg", HIGHLIGHT)}>
              {listed.map((question, index) => (
                <li key={question.key} className={cn("truncate px-3 py-2.5 text-sm", index > 0 && "border-t")}>
                  {question.text}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col">
              {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                <li key={row} className="border-b px-4 py-4">
                  <Bar className={row % 2 ? "w-3/5" : "w-4/5"} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
