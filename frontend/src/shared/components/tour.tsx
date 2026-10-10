"use client";

import { ChevronLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TourSide = "bottom" | "top" | "right" | "left";

export interface TourStep {
  /** The element the step points at, as a CSS selector; the first one on screen is used. */
  target: string;
  title: string;
  text: string;
  /** Where the bubble goes when there is room: under the element (the default), over it or beside it. */
  side?: TourSide;
  /** In place of "Next": a button that does something first (opens an action), then goes on. */
  action?: { label: string; run: () => void };
}

/** Space between the element and its frame. */
const PAD = 6;
/** Between the frame and the bubble; the pointer sits in it, its tip clear of the frame. */
const GAP = 22;
/** The bubble's width, and its least distance from the screen's edges. */
const WIDTH = 340;
const EDGE = 12;
/** Room kept under an element when it is scrolled into view, for the bubble. */
const ROOM = 240;
/** The pointer keeps clear of the bubble's rounded corners. */
const CORNER = 22;

const FALLBACK: Record<TourSide, TourSide[]> = {
  bottom: ["bottom", "top", "right", "left"],
  top: ["top", "bottom", "right", "left"],
  right: ["right", "left", "bottom", "top"],
  left: ["left", "right", "bottom", "top"],
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
const onScreen = (element: Element) => element.getClientRects().length > 0;

/** The element's nearest scrolling box: its frame stays inside it, so a section as wide as the panel is framed within the panel. */
function scrollerOf(element: Element) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (/auto|scroll/.test(`${overflowX} ${overflowY}`)) return node;
  }
  return null;
}

/** In a sticky bar or panel: scrolling doesn't move it, so no room can be made around it. */
function pinned(element: Element) {
  for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
    if (/sticky|fixed/.test(getComputedStyle(node).position)) return true;
  }
  return false;
}

/** Brings the element into view with the least scrolling, leaving room under it for the bubble. */
function reveal(element: Element) {
  const { style } = element as HTMLElement;
  const before = style.scrollMarginBottom;
  if (!pinned(element)) style.scrollMarginBottom = `${ROOM}px`;
  element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  style.scrollMarginBottom = before;
}

/**
 * A guided tour over a page, as Peec's: the element of each step is framed in a dark border while the
 * rest of the page fades, and a dark bubble beside it, its pointer on the element, says what it is, with
 * "Skip tour", Back and Next. The bubble goes under the element, else over it, else beside it, and
 * follows it when the page scrolls. A step whose element isn't on the page yet (a panel that opens on the
 * step before) waits for it a moment, and is passed over if it doesn't come. `onStep` lets the page set
 * itself up for a step (close a panel the step before opened). Escape ends the tour.
 */
export function Tour({ steps, open, onClose, onStep }: { steps: TourStep[]; open: boolean; onClose: () => void; onStep?: (index: number) => void }) {
  const t = useTranslations("Tour");
  const common = useTranslations("Common");
  const id = useId();
  const [index, setIndex] = useState(0);
  // The step whose element was found and brought into view: its frame and bubble show from then on
  const [found, setFound] = useState<number | null>(null);
  const element = useRef<Element | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const pointer = useRef<HTMLSpanElement>(null);
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
  const side = step?.side ?? "bottom";
  const count = steps.length;

  function go(to: number) {
    direction.current = to < index ? -1 : 1;
    onStep?.(to);
    setIndex(to);
  }

  function finish() {
    direction.current = 1;
    setIndex(0);
    setFound(null);
    onClose();
  }

  // Finds the step's element (waiting for it a moment) and brings it into view
  useEffect(() => {
    if (!open || !target) return;
    let frameId = 0;
    let tries = 0;
    const find = () => {
      const match = [...document.querySelectorAll(target)].find(onScreen);
      if (match) {
        reveal(match);
        element.current = match;
        setFound(index);
      } else if (tries++ < 60) {
        frameId = requestAnimationFrame(find);
      } else {
        const to = index + direction.current;
        if (to >= 0 && to < count) {
          callbacks.current.onStep?.(to);
          setIndex(to);
        } else {
          setIndex(0);
          setFound(null);
          callbacks.current.onClose();
        }
      }
    };
    frameId = requestAnimationFrame(find);
    return () => cancelAnimationFrame(frameId);
  }, [open, target, index, count]);

  const shown = open && step !== undefined && found === index;

  // Frames the element and places the bubble and its pointer; again whenever the page scrolls or resizes
  useLayoutEffect(() => {
    if (!shown) return;
    const place = () => {
      const target = element.current;
      const ring = frame.current;
      const box = bubble.current;
      const tip = pointer.current;
      if (!target || !ring || !box || !tip) return;
      const { innerWidth, innerHeight } = window;
      const rect = target.getBoundingClientRect();
      const clip = scrollerOf(target)?.getBoundingClientRect();
      const left = Math.max(rect.left - PAD, (clip?.left ?? 0) + PAD);
      const right = Math.min(rect.right + PAD, (clip?.right ?? innerWidth) - PAD);
      const top = rect.top - PAD;
      const bottom = rect.bottom + PAD;
      Object.assign(ring.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });

      const width = box.offsetWidth;
      const height = box.offsetHeight;
      // The middle of the element's part on screen, where the pointer points
      const middleX = (left + right) / 2;
      const middleY = (Math.max(top, 0) + Math.min(bottom, innerHeight)) / 2;
      const fits: Record<TourSide, boolean> = {
        bottom: bottom + GAP + height <= innerHeight - EDGE,
        top: top - GAP - height >= EDGE,
        right: right + GAP + width <= innerWidth - EDGE,
        left: left - GAP - width >= EDGE,
      };
      const placed = FALLBACK[side].find((candidate) => fits[candidate]);
      const across = clamp(middleX - width / 2, EDGE, innerWidth - width - EDGE);
      const along = clamp(middleY - height / 2, EDGE, innerHeight - height - EDGE);
      // An element too big for a bubble beside it: the bubble at the foot of the screen, over it
      const [x, y] =
        placed === "bottom"
          ? [across, bottom + GAP]
          : placed === "top"
            ? [across, top - GAP - height]
            : placed === "right"
              ? [right + GAP, along]
              : placed === "left"
                ? [left - GAP - width, along]
                : [across, innerHeight - height - EDGE];
      Object.assign(box.style, { left: `${x}px`, top: `${y}px` });

      const half = tip.offsetWidth / 2;
      const alongX = `${clamp(middleX - x, CORNER, width - CORNER) - half}px`;
      const alongY = `${clamp(middleY - y, CORNER, height - CORNER) - half}px`;
      Object.assign(tip.style, {
        display: placed ? "" : "none",
        left: placed === "bottom" || placed === "top" ? alongX : placed === "right" ? `${-half}px` : "",
        right: placed === "left" ? `${-half}px` : "",
        top: placed === "right" || placed === "left" ? alongY : placed === "bottom" ? `${-half}px` : "",
        bottom: placed === "top" ? `${-half}px` : "",
      });
    };
    place();
    next.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(place);
    if (bubble.current) observer.observe(bubble.current);
    if (element.current) observer.observe(element.current);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [shown, index, side]);

  useEffect(() => {
    if (!open) return;
    // No hint bubble over the tour: the one of the button that started it would stay under the pointer
    document.documentElement.toggleAttribute("data-touring", true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      direction.current = 1;
      setIndex(0);
      setFound(null);
      callbacks.current.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.toggleAttribute("data-touring", false);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!shown) return null;
  const last = index === count - 1;

  return createPortal(
    <>
      {/* The element's frame; its shadow fades the rest of the page */}
      <div
        ref={frame}
        aria-hidden
        className="pointer-events-none fixed z-[60] rounded-xl border-2 border-foreground"
        style={{ boxShadow: "0 0 0 9999px color-mix(in oklab, var(--background) 62%, transparent)" }}
      />
      <div
        ref={bubble}
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        className="fixed z-[61] flex flex-col gap-1.5 rounded-2xl bg-foreground p-4 text-background shadow-2xl"
        style={{ width: `min(${WIDTH}px, calc(100vw - ${EDGE * 2}px))` }}
      >
        {/* The pointer: a square turned on its corner, half of it out of the bubble */}
        <span ref={pointer} aria-hidden className="absolute size-3 rotate-45 rounded-[2px] bg-foreground" />
        <div className="flex items-start justify-between gap-3">
          <p id={`${id}-title`} className="text-[0.9375rem] leading-snug font-semibold">
            {step.title}
          </p>
          <button
            type="button"
            aria-label={common("close")}
            onClick={finish}
            className="-mt-1 -mr-1.5 rounded-md p-1 text-background/70 transition-colors outline-none hover:text-background focus-visible:ring-2 focus-visible:ring-background/50"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <p id={`${id}-text`} className="text-sm leading-relaxed text-pretty text-background/75">
          {step.text}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="-ml-2 rounded-md px-2 py-1.5 text-sm text-background/75 transition-colors outline-none hover:text-background focus-visible:ring-2 focus-visible:ring-background/50"
          >
            {t("skip")}
          </button>
          <div className="flex items-center gap-1">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-background/75 transition-colors outline-none hover:text-background focus-visible:ring-2 focus-visible:ring-background/50"
              >
                <ChevronLeft aria-hidden className="size-4" />
                {t("back")}
              </button>
            )}
            <button
              ref={next}
              type="button"
              onClick={() => {
                step.action?.run();
                if (last) finish();
                else go(index + 1);
              }}
              className="h-8 rounded-lg bg-background px-3.5 text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-you"
            >
              {step.action?.label ?? (last ? t("done") : t("next"))}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
