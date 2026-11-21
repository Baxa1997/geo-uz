"use client";

import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FilterChips } from "@/shared/components/filter-chips";
import { answersNaming, namedBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import { PROMPT_LANGUAGES } from "@/shared/constants";
import type { Brand, PromptLanguage, PromptResult, Tone } from "@/shared/types/api";
import { AnswerViewer } from "@/shared/components/scores/answer-viewer";
import { NamedBrandChips } from "@/shared/components/scores/named-brand-chips";
import { ToneIcon } from "@/shared/components/scores/tone-icon";

type Filter = "all" | "missing" | PromptLanguage;

const TONES: Tone[] = ["positive", "neutral", "negative"];

/** How much of an answer the paper shows: about six lines. */
const PRINTED_CHARACTERS = 520;

/** An answer's beginning as plain text, for paper: no Markdown marks, no link addresses, cut at a word. */
function beginning(text: string) {
  const plain = text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>`|]+|-{3,}:?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= PRINTED_CHARACTERS) return plain;
  const cut = plain.slice(0, PRINTED_CHARACTERS);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), PRINTED_CHARACTERS - 40))} …`;
}

/**
 * The report's appendix: every question with how many of its answers name the client, who was named and in
 * what tone; a row opens to read the answers. The filters and the opening are for the screen. On paper
 * nothing can be opened, so every question prints with all its answers under it (the user, 16 Nov 2026:
 * "in pdf download how it will be displayed"): each answer under its assistant's name, by its beginning,
 * with a line saying where the full texts are.
 */
export function PromptTable({ results, brands, youId }: { results: PromptResult[]; brands: Brand[]; youId: string }) {
  const t = useTranslations("Prompts");
  const paper = useTranslations("Report.appendix");
  const engines = useTranslations("Engines");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const matches = (id: Filter) => (result: PromptResult) => (id === "all" ? true : id === "missing" ? answersNaming(result, youId) === 0 : result.prompt.language === id);
  // A chip per language the questions are in; one language alone needs none
  const spoken = PROMPT_LANGUAGES.filter((language) => results.some((result) => result.prompt.language === language));
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "missing", label: t("missing") },
    ...(spoken.length > 1 ? spoken.map((language) => ({ id: language, label: language.toUpperCase() })) : []),
  ];
  const visible = results.filter(matches(filter));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="print:hidden">
          <FilterChips
            label={t("filterLabel")}
            value={filter}
            onChange={setFilter}
            options={filters.map(({ id, label }) => ({ id, label, count: results.filter(matches(id)).length }))}
          />
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{t("toneLegend")}:</span>
          {TONES.map((tone) => (
            <ToneLegendItem key={tone} tone={tone} />
          ))}
        </p>
      </div>

      <p className="hidden text-xs text-pretty text-muted-foreground print:block">{paper("printNote")}</p>

      <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {visible.map((result) => {
            const open = openId === result.prompt.id;
            const panelId = `answers-${result.prompt.id}`;
            const youCount = answersNaming(result, youId);
            const named = namedBrands(result, brands, youId);
            return (
              <li key={result.prompt.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : result.prompt.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 print:break-inside-avoid print:break-after-avoid"
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                      youCount > 0 ? "bg-you-soft ring-1 ring-you/40" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {youCount}/{result.answers.length}
                    <span className="sr-only">
                      {" "}
                      {t("youNamed", { count: youCount, total: result.answers.length })}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-sm font-medium text-pretty">
                      <span className="mr-1.5 align-[1px] text-[0.65rem] font-semibold text-muted-foreground uppercase">
                        {result.prompt.language}
                      </span>
                      {result.prompt.text}
                    </span>
                    {named.length === 0 ? (
                      <span className="text-xs text-muted-foreground">{t("nobody")}</span>
                    ) : (
                      <NamedBrandChips named={named} youId={youId} />
                    )}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform print:hidden", open && "rotate-180")}
                  />
                </button>
                {open && (
                  <div id={panelId} className="px-4 pb-4 print:hidden">
                    <AnswerViewer result={result} brands={brands} youId={youId} />
                  </div>
                )}
                {/* Paper only: every answer, whichever row was open on screen */}
                <ol className="hidden flex-col gap-2 px-4 pb-3 print:flex">
                  {result.answers.map((answer) => {
                    // An answer by its assistant; its run only when that assistant answered the question more than once
                    const runs = result.answers.filter((other) => other.engine === answer.engine);
                    const name = answer.engine === "chatgpt" || answer.engine === "gemini" ? engines(answer.engine) : (answer.engine ?? "AI");
                    return (
                      <li key={`${answer.engine ?? ""}-${answer.sample}`} className="flex flex-col gap-1 border-l-2 border-foreground/20 pl-3 print:break-inside-avoid">
                        <span className="text-xs font-semibold">{runs.length > 1 ? paper("answerOfRun", { engine: name, n: runs.indexOf(answer) + 1 }) : name}</span>
                        <p className="text-xs leading-relaxed text-pretty">{beginning(answer.text)}</p>
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

function ToneLegendItem({ tone }: { tone: Tone }) {
  const t = useTranslations("Tone");
  return (
    <span className="inline-flex items-center gap-1">
      <ToneIcon tone={tone} />
      <span aria-hidden>{t(tone)}</span>
    </span>
  );
}
