"use client";

import { Circle, Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { START_STEPS } from "../constants";
import { useStartProgress } from "../hooks/use-start-progress";

/**
 * "Start here" at the foot of the sidebar: the pages that give a new client a first result, ticked off
 * as they are opened. Only the steps left are listed, so the pages above it stay in view; the count
 * and the bar show what's done. It can be folded to its bar, and closed for good once complete.
 */
export function StartChecklist({ projectId, base, onNavigate }: { projectId: string; base: string; onNavigate?: () => void }) {
  const t = useTranslations("Sidebar.start");
  const { progress, setMinimized, dismiss } = useStartProgress(projectId);
  if (progress.dismissed) return null;

  const isDone = (key: (typeof START_STEPS)[number]["key"]) => key === "project" || progress.visited.includes(key);
  const done = START_STEPS.filter(({ key }) => isDone(key)).length;
  const total = START_STEPS.length;
  const complete = done === total;
  const folded = progress.minimized && !complete;

  return (
    <section aria-labelledby="start-title" className="flex flex-col gap-2 rounded-xl border bg-background p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h2 id="start-title" className="text-sm font-medium">
          {t("title")} <span className="font-normal text-muted-foreground tabular-nums">· {done}/{total}</span>
        </h2>
        {complete ? (
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("dismiss")}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMinimized(!progress.minimized)}
            aria-expanded={!folded}
            aria-controls="start-steps"
            aria-label={folded ? t("expand") : t("minimize")}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {folded ? <Plus aria-hidden className="size-4" /> : <Minus aria-hidden className="size-4" />}
          </button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={t("title")}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={t("progress", { done, total })}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-you transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      {complete && <p className="text-xs text-pretty text-muted-foreground">{t("doneText")}</p>}
      {!folded && !complete && (
        <ol id="start-steps" aria-label={t("left")} className="-mx-1 flex flex-col">
          {START_STEPS.flatMap(({ key, path }) =>
            path === null || isDone(key)
              ? []
              : [
                  <li key={key}>
                    <Link
                      href={`${base}${path}`}
                      onClick={onNavigate}
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-pretty transition-colors hover:bg-muted/60"
                    >
                      <Circle aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      {t(`steps.${key}`)}
                    </Link>
                  </li>,
                ],
          )}
        </ol>
      )}
    </section>
  );
}
