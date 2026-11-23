"use client";

import { BookOpenIcon as BookOpen } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { useMessages, useTranslations, type Messages } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Hint } from "@/shared/components/hint";
import { Tour, type TourStep } from "@/shared/components/tour";
import { Button } from "@/shared/components/ui/button";
import { useTourMemory } from "@/shared/hooks/use-tour-memory";

export type TourId = keyof Messages["Tours"];

/**
 * A page's guided tour and the button in the page's top bar that starts it. The steps are the page's
 * entries in messages/Tours, in their order; each points at the element marked `data-tour` with its key
 * (a step whose element isn't on the page is passed over). The tour starts by itself on the first visit, as Peec's
 * does, unless a window is open over the page then: once per account, on any device (the user, 23 Nov 2026: "must not
 * show anywhere even in different devices"; `useTourMemory`, kept on the account), and once per browser where there
 * is no account. Its button opens it whenever the reader wants.
 */
export function PageTour({ id }: { id: TourId }) {
  const t = useTranslations("Tour");
  const messages = useMessages();
  const [open, setOpen] = useState(false);
  // Read when the visit begins, not followed: marking it seen mustn't restart the wait
  const memory = useRef(useTourMemory());
  const steps: TourStep[] = Object.entries(messages.Tours[id]).map(([key, step]) => ({
    target: `[data-tour="${key}"]`,
    title: step.title,
    text: step.text,
  }));

  useEffect(() => {
    const key = `geo-tour:${id}`;
    const account = memory.current;
    let here = false;
    try {
      here = Boolean(localStorage.getItem(key));
    } catch {
      // No browser memory: without an account the tour can't know it was seen, so it doesn't start by itself
      if (!account) return;
    }
    if (account?.seen(id)) return;
    if (here) {
      // Seen in this browser before the account kept tours: the account learns it, so other devices skip it too
      account?.markSeen(id);
      return;
    }
    const timer = setTimeout(() => {
      if (document.querySelector('[role="dialog"]')) return;
      try {
        localStorage.setItem(key, "seen");
      } catch {
        if (!account) return;
      }
      account?.markSeen(id);
      setOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [id]);

  return (
    <>
      <Hint text={t("hint")} described={false}>
        {() => (
          <Button variant="outline" size="icon" aria-label={t("guide")} onClick={() => setOpen(true)} className="bg-background">
            <BookOpen aria-hidden />
          </Button>
        )}
      </Hint>
      <Tour steps={steps} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
