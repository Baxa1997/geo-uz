"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FilterChips } from "@/shared/components/filter-chips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { answersNaming, namedBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Brand, PromptResult, Tone } from "@/shared/types/api";
import { AnswerViewer } from "@/shared/components/scores/answer-viewer";
import { NamedBrandChips } from "@/shared/components/scores/named-brand-chips";
import { ToneIcon } from "@/shared/components/scores/tone-icon";

type Filter = "all" | "missing" | "uz" | "ru";

const TONES: Tone[] = ["positive", "neutral", "negative"];

/** Every prompt with who was named and in what tone; tap a row to read the answers. */
export function PromptTable({
  results,
  brands,
  youId,
  samples,
}: {
  results: PromptResult[];
  brands: Brand[];
  youId: string;
  samples: number;
}) {
  const t = useTranslations("Prompts");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const matches: Record<Filter, (result: PromptResult) => boolean> = {
    all: () => true,
    missing: (result) => answersNaming(result, youId) === 0,
    uz: (result) => result.prompt.language === "uz",
    ru: (result) => result.prompt.language === "ru",
  };
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "missing", label: t("missing") },
    { id: "uz", label: "UZ" },
    { id: "ru", label: "RU" },
  ];
  const visible = results.filter(matches[filter]);

  return (
    <Card id="prompts" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description", { count: results.length, samples })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <FilterChips
          label={t("filterLabel")}
          value={filter}
          onChange={setFilter}
          options={filters.map(({ id, label }) => ({ id, label, count: results.filter(matches[id]).length }))}
        />

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{t("toneLegend")}:</span>
          {TONES.map((tone) => (
            <ToneLegendItem key={tone} tone={tone} />
          ))}
        </p>

        <ul className="-mx-4 divide-y border-y">
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
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    title={t("youNamed", { count: youCount, total: result.answers.length })}
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
                    className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                  />
                </button>
                {open && (
                  <div id={panelId} className="px-4 pb-4">
                    <AnswerViewer result={result} brands={brands} youId={youId} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
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
