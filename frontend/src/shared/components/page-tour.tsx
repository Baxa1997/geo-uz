"use client";

import { BookOpen } from "lucide-react";
import { useMessages, useTranslations, type Messages } from "next-intl";
import { useEffect, useState } from "react";
import { Hint } from "@/shared/components/hint";
import { Tour, type TourStep } from "@/shared/components/tour";
import { Button } from "@/shared/components/ui/button";

export type TourId = keyof Messages["Tours"];

/**
 * A page's guided tour and the button in the page's top bar that starts it. The steps are the page's
 * entries in messages/Tours, in their order; each points at the element marked `data-tour` with its key
 * (a step whose element isn't on the page is passed over). The tour starts by itself on the first visit,
 * once per browser, as Peec's does, unless a window is open over the page then.
 */
export function PageTour({ id }: { id: TourId }) {
  const t = useTranslations("Tour");
  const messages = useMessages();
  const [open, setOpen] = useState(false);
  const steps: TourStep[] = Object.entries(messages.Tours[id]).map(([key, step]) => ({
    target: `[data-tour="${key}"]`,
    title: step.title,
    text: step.text,
  }));

  useEffect(() => {
    const key = `geo-tour:${id}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      if (document.querySelector('[role="dialog"]')) return;
      try {
        localStorage.setItem(key, "seen");
      } catch {
        return;
      }
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
