"use client";

import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { cn } from "@/shared/helpers/utils";
import type { Tone } from "@/shared/types/api";
import { METRICS } from "../../constants";
import { Panel } from "./section";

type Metric = (typeof METRICS)[number]["key"];

/** The clinics of the sample answer, in the order ChatGPT names them; `you` is the client. */
const CLINICS: { key: "first" | "you" | "third"; tone: Tone; you?: boolean }[] = [
  { key: "first", tone: "positive" },
  { key: "you", tone: "positive", you: true },
  { key: "third", tone: "neutral" },
];

/**
 * The three metrics as tabs beside one ChatGPT answer. Each tab marks up the same answer its own
 * way: who is named (visibility), in what order (position), in what tone.
 */
export function MetricTabs({ score, position }: { score: number; position: string }) {
  const t = useTranslations("Landing.metrics");
  const id = useId();
  const [active, setActive] = useState<Metric>("visibility");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + METRICS.length) % METRICS.length;
    setActive(METRICS[next]?.key ?? "visibility");
    tabs.current[next]?.focus();
  }

  return (
    <div data-reveal className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div role="tablist" aria-label={t("tabsLabel")} aria-orientation="vertical" className="flex flex-col gap-3">
        {METRICS.map(({ key, icon: Icon }, index) => (
          <button
            key={key}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${key}`}
            aria-selected={active === key}
            aria-controls={`${id}-panel`}
            tabIndex={active === key ? 0 : -1}
            onClick={() => setActive(key)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className="group flex flex-1 flex-col justify-center rounded-2xl border border-transparent p-6 text-left transition-colors outline-none hover:bg-background/60 focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:border-border aria-selected:bg-background aria-selected:shadow-xs sm:p-8"
          >
            <span className="flex flex-col gap-2 border-l-2 border-transparent pl-4 group-aria-selected:border-brand">
              <span className="flex items-center gap-2 font-semibold">
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {t(`tabs.${key}.title`)}
              </span>
              <span className="text-pretty text-muted-foreground group-aria-selected:text-foreground/80">
                {t(`tabs.${key}.text`)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        className="flex flex-col gap-4 rounded-2xl border bg-muted/40 p-4 sm:p-8"
      >
        <p className="max-w-[85%] self-end rounded-2xl rounded-br-md border bg-background px-4 py-2.5 text-sm shadow-xs">
          {t("question")}
        </p>
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background sm:flex"
          >
            <Bot className="size-4" />
          </span>
          <Panel className="flex min-w-0 flex-1 flex-col gap-4 p-4 text-sm shadow-lg shadow-black/5 sm:p-5">
            <p className="text-pretty text-muted-foreground">{t("intro")}</p>
            <ol className="flex flex-col gap-4 border-t pt-4">
              {CLINICS.map(({ key, tone, you }, index) => (
                <li key={key} className="flex flex-col gap-1.5">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {active === "position" && (
                      <span className="flex size-5 items-center justify-center rounded-md bg-foreground text-xs text-background tabular-nums">
                        {index + 1}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5",
                        active !== "visibility" ? "-mx-1.5" : you ? "bg-you-soft ring-1 ring-you/40" : "bg-muted",
                      )}
                    >
                      {t(`clinics.${key}.name`)}
                    </span>
                    {active === "tone" && <ToneIcon tone={tone} className="size-4" />}
                    {you && (
                      <span className="rounded-md bg-foreground px-1.5 py-0.5 text-xs font-normal text-background">
                        {active === "visibility" && t("yourScore", { score })}
                        {active === "position" && t("yourPosition", { position })}
                        {active === "tone" && t("yourTone")}
                      </span>
                    )}
                  </p>
                  <p className="text-pretty text-muted-foreground">{t(`clinics.${key}.text`)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
