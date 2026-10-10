"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ActionStatus } from "@/shared/types/api";

export interface ToastState {
  /** A new toast for every change, so the timer starts again. */
  key: number;
  status: ActionStatus;
  count: number;
}

const DURATION = 6000;

/**
 * Says where an action went after its status changed, as Peec's toast: at the bottom of the screen, with
 * the group to find it in as a link, and a small bar that runs out before it closes by itself.
 */
export function ActionToast({ toast, onOpenGroup, onDismiss }: { toast: ToastState | null; onOpenGroup: (status: ActionStatus) => void; onDismiss: () => void }) {
  const t = useTranslations("Actions");
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, DURATION);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const run = reduced ? null : bar.current?.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: DURATION, easing: "linear", fill: "forwards" });
    return () => {
      clearTimeout(timer);
      run?.cancel();
    };
  }, [toast, onDismiss]);

  // Only ever set after a click, so the page is in the browser; the board announces the change to screen readers
  if (!toast) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div key={toast.key} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-background p-4 shadow-lg">
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-positive" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-medium">{t(`toast.titles.${toast.status}`, { count: toast.count })}</p>
          <p className="text-sm text-pretty text-muted-foreground">
            {t.rich(`toast.texts.${toast.status}`, {
              count: toast.count,
              group: t(`status.${toast.status}`),
              link: (chunks) => (
                <button
                  type="button"
                  onClick={() => {
                    onOpenGroup(toast.status);
                    onDismiss();
                  }}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {chunks}
                </button>
              ),
            })}
          </p>
        </div>
        <span aria-hidden className="mt-2 h-1 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
          <span ref={bar} className="block h-full origin-left rounded-full bg-foreground/35" />
        </span>
      </div>
    </div>,
    document.body,
  );
}
