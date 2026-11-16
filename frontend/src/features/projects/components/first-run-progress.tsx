"use client";

import { useTranslations } from "next-intl";
import { EngineIcon } from "@/shared/components/engine-icon";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { LogoMark } from "@/shared/components/logo";
import { LogoutButton } from "@/shared/components/logout-button";
import { cn } from "@/shared/helpers/utils";
import type { FirstRun } from "@/shared/types/api";

const LINES = ["sending", "collecting", "checking"] as const;
/** Where each assistant sits on the ring, as a point of its box. */
const SEATS = [
  { engine: "gemini", at: "left-[4%] top-[58%]" },
  { engine: "chatgpt", at: "right-[2%] top-[64%]" },
] as const;

/**
 * A first check under way, as the user's picture (16 Nov 2026): the whole screen in navy, our mark in a
 * ring with the assistants on it, what is being done as three lines with the current one bright, and the
 * answers counted as they come in. The numbers are the backend's, not a timer's.
 */
export function FirstRunProgress({ run, stale, who }: { run: FirstRun; stale: boolean; who: string | null }) {
  const t = useTranslations("FirstRun");
  const o = useTranslations("Onboarding");
  const engines = useTranslations("Engines");
  // Sent, then answers coming in, then the answers read
  const current = run.status === "reading_answers" ? 2 : run.answered > 0 ? 1 : 0;
  const share = run.status === "reading_answers" ? 0.94 : run.total > 0 ? 0.06 + 0.84 * (run.answered / run.total) : 0.04;
  const counted = run.total > 0 ? t("answered", { answered: run.answered, total: run.total }) : null;

  return (
    <div className="flex min-h-svh flex-col bg-[linear-gradient(155deg,#0b1335_0%,#1c2e6e_52%,#3f63c8_100%)] text-white">
      <header className="flex h-16 shrink-0 items-center justify-end px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-1 rounded-full bg-background py-1 pr-1 pl-4 text-foreground">
          {who && <span className="hidden truncate pr-1 text-sm text-muted-foreground sm:block">{o("loggedInAs", { who })}</span>}
          <LocaleSwitcher />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-5 pb-10 text-center">
        <div aria-hidden className="relative size-48 shrink-0 sm:size-56">
          <span className="absolute inset-0 rounded-full border border-white/25" />
          <span className="absolute inset-[16%] rounded-full border border-dashed border-white/20" />
          <span className="absolute inset-[32%] flex items-center justify-center rounded-full bg-white shadow-[0_0_0_10px_rgb(255_255_255/0.12)]">
            <LogoMark className="size-10 rounded-xl" />
          </span>
          {SEATS.map(({ engine, at }) => (
            <span key={engine} className={cn("absolute flex size-12 items-center justify-center rounded-full bg-white text-[#14182b] shadow-lg", at)}>
              <EngineIcon engine={engine} className="size-6" />
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-xs tracking-[0.14em] text-white/60 uppercase">{run.domain}</p>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl">{t("runningTitle")}</h1>
          <p className="text-lg text-pretty text-white/75">{t("asking.text", { engines: SEATS.map(({ engine }) => engines(engine)).reverse().join(", ") })}</p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-3">
          <div
            role="progressbar"
            aria-label={t("runningTitle")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share * 100)}
            aria-valuetext={counted ?? t(`asking.${LINES[current]}`)}
            className="h-1.5 overflow-hidden rounded-full bg-white/15"
          >
            <div className="h-full rounded-full bg-white transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${share * 100}%` }} />
          </div>
          {counted && <p className="text-sm font-medium tabular-nums">{counted}</p>}
        </div>

        <ol className="flex flex-col gap-2.5 text-lg">
          {LINES.map((line, index) => (
            <li key={line} aria-current={index === current ? "step" : undefined} className={cn("transition-colors", index === current ? "font-medium text-white" : "text-white/45")}>
              {t(`asking.${line}`)}
            </li>
          ))}
        </ol>

        <p className="text-sm text-pretty text-white/60">{stale ? t("loadFailed") : `${t("runningText")}`}</p>
        {/* Announces each new stage, not every answer */}
        <p aria-live="polite" className="sr-only">
          {t(`asking.${LINES[current]}`)}
        </p>
      </main>
    </div>
  );
}
