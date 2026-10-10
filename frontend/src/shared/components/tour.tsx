"use client";

import { ChevronLeft, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface TourStep {
  /** The element the step points at, as a CSS selector. */
  target: string;
  title: string;
  text: string;
  /** In place of "Next": a button that does something first (opens an action), then goes on. */
  action?: { label: string; run: () => void };
}

/** Space kept around the element, and between it and the bubble. */
const PAD = 6;
const GAP = 12;
const WIDTH = 352;
/** Room a bubble needs above or below its element: its height with a margin. */
const BUBBLE_HEIGHT = 230;

/**
 * A guided tour over a page, as Peec's: the element of each step stands out while the rest dims, and a
 * dark bubble beside it says what it is, with "Skip tour", Back and Next. A step whose element isn't on
 * the page yet (a panel that opens on the step before) waits for it a moment, and is passed over if it
 * doesn't come. `onStep` lets the page set itself up for a step (close a panel the step before opened).
 * Escape ends the tour.
 */
export function Tour({
  steps,
  open,
  onClose,
  onStep,
  labels,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onStep?: (index: number) => void;
  labels: { skip: string; back: string; next: string; done: string; close: string };
}) {
  const id = useId();
  const [index, setIndex] = useState(0);
  // Where the step's element is; kept with its selector, so a step never shows beside the one before
  const [placed, setPlaced] = useState<{ target: string; rect: DOMRect } | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  // Which way the tour went last, so a missing step is passed over in that direction
  const direction = useRef(1);
  // The page's callbacks as of its last render, so a new function each render doesn't restart the step
  const callbacks = useRef({ onStep, onClose });
  useEffect(() => {
    callbacks.current = { onStep, onClose };
  });
  const step = steps[index];
  const target = step?.target;
  const count = steps.length;

  function go(to: number) {
    direction.current = to < index ? -1 : 1;
    onStep?.(to);
    setIndex(to);
  }

  function finish() {
    direction.current = 1;
    setIndex(0);
    onClose();
  }

  // Finds the step's element (waiting for it a moment), brings it into view and follows it
  useEffect(() => {
    if (!open || !target) return;
    let frame = 0;
    let tries = 0;
    let element: Element | null = null;
    const measure = () => element && setPlaced({ target, rect: element.getBoundingClientRect() });
    const find = () => {
      element = document.querySelector(target);
      if (element) {
        // The least scrolling that shows it: an element in a panel that stays in view must not move the page
        element.scrollIntoView({ block: "nearest", behavior: "instant" });
        measure();
        next.current?.focus();
      } else if (tries++ < 60) {
        frame = requestAnimationFrame(find);
      } else {
        const to = index + direction.current;
        if (to >= 0 && to < count) {
          callbacks.current.onStep?.(to);
          setIndex(to);
        } else {
          setIndex(0);
          callbacks.current.onClose();
        }
      }
    };
    frame = requestAnimationFrame(find);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, target, index, count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && callbacks.current.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !step || placed?.target !== target) return null;
  const { rect } = placed;
  const last = index === steps.length - 1;
  const width = Math.min(WIDTH, window.innerWidth - 32);
  const { innerWidth, innerHeight } = window;
  const clampLeft = (value: number) => Math.min(Math.max(16, value), innerWidth - width - 16);
  const clampTop = (value: number) => Math.min(Math.max(16, value), innerHeight - BUBBLE_HEIGHT);
  const aside = width + PAD + GAP + 16;
  // Under the element when the bubble fits there, else over it, else beside it; a tall element on a
  // small screen gets the bubble at the bottom of the screen, over it
  const position: React.CSSProperties =
    innerHeight - rect.bottom >= BUBBLE_HEIGHT
      ? { left: clampLeft(rect.left), top: rect.bottom + PAD + GAP }
      : rect.top >= BUBBLE_HEIGHT
        ? { left: clampLeft(rect.left), bottom: innerHeight - rect.top + PAD + GAP }
        : rect.left >= aside
          ? { left: rect.left - PAD - GAP - width, top: clampTop(rect.top) }
          : innerWidth - rect.right >= aside
            ? { left: rect.right + PAD + GAP, top: clampTop(rect.top) }
            : { left: clampLeft(rect.left), bottom: 16 };

  return createPortal(
    <>
      {/* The element's frame; its shadow dims the rest of the page */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-[60] rounded-xl ring-2 ring-foreground transition-all duration-200"
        style={{
          left: rect.left - PAD,
          top: rect.top - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px color-mix(in oklab, var(--background) 60%, transparent)",
        }}
      />
      <div
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        className="fixed z-[61] flex flex-col gap-3 rounded-2xl bg-foreground p-4 text-background shadow-2xl"
        style={{ width, ...position }}
      >
        <div className="flex items-start justify-between gap-3">
          <p id={`${id}-title`} className="font-medium">
            {step.title}
          </p>
          <button type="button" aria-label={labels.close} onClick={finish} className="-mt-1 -mr-1 rounded-md p-1 text-background/70 hover:text-background">
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <p id={`${id}-text`} className="text-sm text-pretty text-background/75">
          {step.text}
        </p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={finish} className="rounded-md px-2 py-1.5 text-sm text-background/80 hover:text-background">
            {labels.skip}
          </button>
          <div className="flex items-center gap-1">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-background/80 hover:text-background"
              >
                <ChevronLeft aria-hidden className="size-4" />
                {labels.back}
              </button>
            )}
            <button
              ref={next}
              type="button"
              onClick={() => {
                step.action?.run();
                if (last) finish();
                else setIndex(index + 1);
              }}
              className="rounded-lg bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-background/50"
            >
              {step.action?.label ?? (last ? labels.done : labels.next)}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
