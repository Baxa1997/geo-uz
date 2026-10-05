import { Check, CircleCheck, CircleX, KeyRound, Plus } from "lucide-react";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import { DEMO_REPORT } from "@/mocks/demo";
import { EngineIcon } from "@/shared/components/engine-icon";
import { NamedBrandChips } from "@/shared/components/scores/named-brand-chips";
import { ENGINES } from "@/shared/constants";
import { labelFor } from "@/shared/helpers/labels";
import { answersNaming, namedBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import { FEATURE_PROMPTS, FEATURE_SOURCES, KEY_FEATURES, SECTION } from "../../constants";
import { MonoLabel } from "./mono-label";
import { Panel, Section, SectionIntro } from "./section";

type Feature = (typeof KEY_FEATURES)[number];

/** Markdown of an answer as one plain line, for a short excerpt. */
const plain = (markdown: string) =>
  markdown
    .replace(/\(\[[^\]]+\]\([^)]+\)\)/g, "")
    .replace(/[*#]|^\s*[-\d.]+\s/gm, "")
    .replace(/\s+/g, " ")
    .trim();

/** Six cards, each a feature with a small piece of the product under it (the sample clinic's data). */
export function KeyFeatures() {
  const t = useTranslations("Landing.features");
  const mocks: Record<Feature, React.ReactNode> = {
    prompts: <PromptsMock />,
    suggested: <SuggestedMock />,
    brands: <BrandsMock />,
    engines: <EnginesMock />,
    sources: <SourcesMock />,
    facts: <FactsMock />,
  };

  return (
    <Section id={SECTION.features} labelledBy="features-title">
      <SectionIntro id="features-title" icon={KeyRound} pill={t("pill")} title={t("title")} sub={t("sub")} />
      {/* Wide and narrow cards alternate: 3 + 2, 2 + 3, 3 + 2 */}
      <ul className="grid gap-3 lg:grid-cols-5">
        {KEY_FEATURES.map((key, index) => (
          // min-w-0: a grid item is otherwise as wide as its longest unbroken line
          <li key={key} data-reveal className={cn("min-w-0", [0, 3, 4].includes(index) ? "lg:col-span-3" : "lg:col-span-2")}>
            <Panel className="flex h-full flex-col gap-6 overflow-hidden p-6 sm:p-8">
              <div className="flex max-w-md flex-col gap-2">
                <h3 className="text-lg font-semibold">{t(`items.${key}.title`)}</h3>
                <p className="text-pretty text-muted-foreground">{t(`items.${key}.text`)}</p>
              </div>
              <div aria-hidden className="mt-auto min-w-0 select-none">
                {mocks[key]}
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const frame = "rounded-xl border bg-background shadow-lg shadow-black/5";

function LanguageTag({ language }: { language: string }) {
  return <span className="text-[0.65rem] font-semibold text-muted-foreground uppercase">{language}</span>;
}

/** The questions table: text, topic, how often the client is named. */
function PromptsMock() {
  const t = useTranslations("Landing.features.mock");
  const messages = useMessages();
  const format = useFormatter();
  const youId = DEMO_REPORT.project.brand.id;

  return (
    <div className={cn(frame, "text-sm")}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="font-medium">{t("tracked")}</span>
        <span className="flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-xs text-background">
          <Plus className="size-3" />
          {t("add")}
        </span>
      </div>
      <ul className="divide-y">
        {DEMO_REPORT.prompts.slice(0, FEATURE_PROMPTS).map((result) => (
          <li key={result.prompt.id} className="flex items-center gap-3 px-4 py-2.5">
            <LanguageTag language={result.prompt.language} />
            <span className="min-w-0 flex-1 truncate">{result.prompt.text}</span>
            <span className="hidden rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap sm:inline">
              {labelFor(messages.Topics, result.prompt.topic)}
            </span>
            <span className="w-10 text-right font-semibold tabular-nums">
              {format.number(answersNaming(result, youId) / result.answers.length, {
                style: "percent",
                maximumFractionDigits: 0,
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Suggested questions as a small fanned stack. */
function SuggestedMock() {
  const t = useTranslations("Landing.features.mock");
  const messages = useMessages();
  const picks = [DEMO_REPORT.prompts[1], DEMO_REPORT.prompts[14]].flatMap((result) => (result ? [result.prompt] : []));

  return (
    <div className="flex flex-col gap-3 pt-2">
      <MonoLabel className="text-muted-foreground">{t("fromSite", { count: DEMO_REPORT.prompts.length })}</MonoLabel>
      {picks.map((prompt, index) => (
        <div key={prompt.id} className={cn(frame, "flex flex-col gap-2 p-4 text-sm", index === 1 && "ml-6 opacity-70")}>
          <p className="font-medium text-pretty">{prompt.text}</p>
          <p className="flex items-center gap-2">
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs text-brand">
              {labelFor(messages.Topics, prompt.topic)}
            </span>
            <LanguageTag language={prompt.language} />
          </p>
        </div>
      ))}
    </div>
  );
}

/** A tracked competitor, and a brand ChatGPT names that could be tracked. */
function BrandsMock() {
  const t = useTranslations("Landing.features.mock");
  const tracked = DEMO_REPORT.project.competitors[0];
  const found = DEMO_REPORT.untrackedBrands[0];

  return (
    <div className="flex flex-col gap-3">
      {tracked && (
        <div className={cn(frame, "flex items-center gap-3 p-3 text-sm")}>
          <Initial name={tracked.name} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{tracked.name}</span>
            <span className="truncate text-xs text-muted-foreground">{tracked.domain}</span>
          </span>
          <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs whitespace-nowrap">
            <Check className="size-3 text-positive" />
            {t("tracking")}
          </span>
        </div>
      )}
      {found && (
        <div className={cn(frame, "ml-6 flex items-center gap-3 p-3 text-sm")}>
          <Initial name={found.name} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{found.name}</span>
            <span className="truncate text-xs text-muted-foreground">{t("named", { count: found.answers })}</span>
          </span>
          <span className="flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background">
            <Plus className="size-3" />
            {t("track")}
          </span>
        </div>
      )}
    </div>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
      {name.charAt(0)}
    </span>
  );
}

/** The engines (one measured, the rest coming) beside the latest answers. */
function EnginesMock() {
  const t = useTranslations("Landing.features.mock");
  const engines = useTranslations("Engines");
  const { brand, competitors } = DEMO_REPORT.project;
  const brands = [brand, ...competitors];

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className={cn(frame, "text-sm")}>
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
          <span className="font-medium">{t("engines")}</span>
          <span className="rounded-md border px-1.5 py-0.5 text-xs">{t("weekly")}</span>
        </div>
        <ul className="flex flex-col p-1.5">
          {ENGINES.map(({ key, live }) => (
            <li key={key} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-2", !live && "text-foreground/50")}>
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded border",
                  live && "border-brand bg-brand text-brand-foreground",
                )}
              >
                {live && <Check className="size-3" />}
              </span>
              <span className="flex-1">{engines(key)}</span>
              {live ? <EngineIcon engine={key} /> : <span className="text-[0.65rem]">{engines("soon")}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className={cn(frame, "flex flex-col gap-3 p-3 text-sm")}>
        <span className="font-medium">{t("recent")}</span>
        {DEMO_REPORT.prompts.slice(0, 2).map((result) => (
          <div key={result.prompt.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
            <p className="truncate font-medium">{result.prompt.text}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{plain(result.answers[0]?.text ?? "")}</p>
            <NamedBrandChips named={namedBrands(result, brands, brand.id)} youId={brand.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The most cited sites with their kind and share of answers. */
function SourcesMock() {
  const t = useTranslations("Landing.features.mock");
  const types = useTranslations("SourcesPage.types");
  const format = useFormatter();
  const total = DEMO_REPORT.prompts.reduce((sum, result) => sum + result.answers.length, 0);

  return (
    <div className={cn(frame, "text-sm")}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_3rem] gap-3 border-b px-4 py-2.5 text-xs text-muted-foreground">
        <span>{t("site")}</span>
        <span>{t("type")}</span>
        <span className="text-right">{t("share")}</span>
      </div>
      <ul className="divide-y">
        {DEMO_REPORT.topSources.slice(0, FEATURE_SOURCES).map((source) => (
          <li key={source.domain} className="grid grid-cols-[minmax(0,1fr)_auto_3rem] items-center gap-3 px-4 py-2.5">
            <span className="truncate font-medium">{source.domain}</span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap",
                source.type === "own" ? "bg-you-soft" : "bg-muted",
              )}
            >
              {types(source.type)}
            </span>
            <span className="text-right tabular-nums">
              {format.number(source.count / total, { style: "percent", maximumFractionDigits: 0 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One wrong fact: what ChatGPT says against what is true. */
function FactsMock() {
  const t = useTranslations("Landing.features.mock");
  const facts = useTranslations("WrongFacts");
  const fact = DEMO_REPORT.wrongFacts[0];
  if (!fact) return null;

  return (
    <div className="flex flex-col items-start gap-3">
      <div className={cn(frame, "flex flex-col gap-3 p-4 text-sm")}>
        <div className="flex gap-2">
          <CircleX className="mt-0.5 size-4 shrink-0 text-negative" />
          <div>
            <p className="text-xs text-muted-foreground">{facts("says")}</p>
            <p className="font-medium">{fact.claim}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-positive" />
          <div>
            <p className="text-xs text-muted-foreground">{facts("correct")}</p>
            <p>{fact.correct}</p>
          </div>
        </div>
      </div>
      <span className="flex items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-xs text-background shadow-lg">
        <CircleCheck className="size-3.5" />
        {t("factsFound", { count: DEMO_REPORT.wrongFacts.length })}
      </span>
    </div>
  );
}
