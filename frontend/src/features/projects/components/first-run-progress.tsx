"use client";

import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CircleNotchIcon as LoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { useTranslations } from "next-intl";
import { EngineIcon } from "@/shared/components/engine-icon";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { LogoMark } from "@/shared/components/logo";
import { LogoutButton } from "@/shared/components/logout-button";
import { cn } from "@/shared/helpers/utils";
import type { FirstRun } from "@/shared/types/api";

const LINES = ["sending", "collecting", "checking"] as const;
/** Where each assistant sits on the ring, as a point of its box, and its center in the ring's 100×100 drawing. */
const SEATS = [
  { engine: "gemini", at: "left-[4%] top-[58%]", x: 16.5, y: 70.5 },
  { engine: "chatgpt", at: "right-[2%] top-[64%]", x: 85.5, y: 76.5 },
] as const;

/**
 * A first check under way, as the user's picture (16 Nov 2026): the whole screen in navy, our mark in a
 * ring with the assistants on it, what is being done as three lines with the current one bright, and the
 * answers counted as they come in. The numbers are the backend's, not a timer's.
 *
 * In motion while it waits (the user, 17 Nov 2026: "make the loading effect better, with animations"): a dot
 * travels the ring, questions run out to the assistants as dashes along their lines and their answers back,
 * each assistant sends out a soft ring while it is asked, a light passes over the bar, and the stage under way
 * turns, the ones behind it ticked. All of it goes with the screen; under reduced motion it stands still.
 */
export function FirstRunProgress({ run, stale, who }: { run: FirstRun; stale: boolean; who: string | null }) {
  const t = useTranslations("FirstRun");
  const o = useTranslations("Onboarding");
  const engines = useTranslations("Engines");
  // Sent, then answers coming in, then the answers read
  const current = run.status === "reading_answers" ? 2 : run.answered > 0 ? 1 : 0;
  const share = run.status === "reading_answers" ? 0.94 : run.total > 0 ? 0.06 + 0.84 * (run.answered / run.total) : 0.04;
  const counted = run.total > 0 ? t("answered", { answered: run.answered, total: run.total }) : null;
  // The signals and ripples run while the assistants are being asked; the reading is our own work
  const running = current < 2;

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
          {/* A dot travels the outer ring */}
          <span className="absolute inset-0 animate-orbit">
            <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgb(255_255_255/0.9)]" />
          </span>
          <span className="absolute inset-[16%] animate-[orbit_40s_linear_infinite_reverse] rounded-full border border-dashed border-white/20 motion-reduce:animate-none" />
          {/* The questions run out to each assistant, and the answers come back */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
            {SEATS.map(({ engine, x, y }, index) => (
              <g key={engine}>
                <line x1={50} y1={50} x2={x} y2={y} stroke="white" strokeOpacity={0.14} strokeWidth={0.6} />
                {running && (
                  <>
                    <line x1={50} y1={50} x2={x} y2={y} pathLength={100} stroke="white" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="8 100" className="animate-signal" style={{ animationDelay: `${index * 0.6}s` }} />
                    <line x1={x} y1={y} x2={50} y2={50} pathLength={100} stroke="#9fb4ff" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="8 100" className="animate-signal" style={{ animationDelay: `${1.2 + index * 0.6}s` }} />
                  </>
                )}
              </g>
            ))}
          </svg>
          <span className="absolute inset-[32%] flex items-center justify-center rounded-full bg-white shadow-[0_0_0_10px_rgb(255_255_255/0.12)]">
            <LogoMark className="size-10 rounded-xl" />
          </span>
          {SEATS.map(({ engine, at }, index) => (
            <span key={engine} className={cn("absolute flex size-12 items-center justify-center rounded-full bg-white text-[#14182b] shadow-lg", at)}>
              {running && <span className="absolute inset-0 animate-ripple rounded-full bg-white/60" style={{ animationDelay: `${index * 0.9}s` }} />}
              <EngineIcon engine={engine} className="relative size-6" />
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
            <div className="relative h-full overflow-hidden rounded-full bg-white transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${share * 100}%` }}>
              <span className="absolute inset-y-0 left-0 w-1/3 animate-sheen bg-linear-to-r from-transparent via-[#9fb4ff]/70 to-transparent" />
            </div>
          </div>
          {counted && <p className="text-sm font-medium tabular-nums">{counted}</p>}
        </div>

        <ol className="flex flex-col items-start gap-2.5 text-left text-lg">
          {LINES.map((line, index) => (
            <li
              key={line}
              aria-current={index === current ? "step" : undefined}
              className={cn("flex items-center gap-3 transition-colors duration-500", index === current ? "font-medium text-white" : index < current ? "text-white/70" : "text-white/40")}
            >
              <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-500", index < current ? "bg-white/90 text-[#1c2e6e]" : "border border-white/30")}>
                {index < current ? <Check className="size-3.5" weight="bold" /> : index === current ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : null}
              </span>
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
