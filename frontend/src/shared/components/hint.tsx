"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/shared/helpers/utils";

// The bubble (and the popup library that positions it) is downloaded the first time a hint is opened:
// a table shows hundreds of these and most are never opened; the landing page's preview can't open any.
const InfoTipPopup = dynamic(() => import("./info-tip-popup").then((module) => module.InfoTipPopup), { ssr: false });

/** A mouse must rest on the element this long, so passing over a table on the way elsewhere opens nothing. */
const HOVER_MS = 150;

/**
 * Explains what it wraps, in the same dark bubble as an ⓘ: a column heading, a number, a colored mark, a
 * button with only an icon. Every table heading and every figure on a data page has one, as on Peec. It
 * opens when the mouse rests on the element, when the keyboard focuses it, and on a tap (phones have no
 * hover).
 *
 * Plain content becomes a focusable element whose description is the hint, so the keyboard and screen
 * readers reach it. A control that already takes the focus and the click (a sorting heading, an icon
 * button) is passed as a function instead: it gets the id of the description for its `aria-describedby`,
 * and its own click still does what it did.
 */
export function Hint({
  text,
  side = "top",
  focusable = true,
  described = true,
  className,
  children,
}: {
  text: React.ReactNode;
  /** Above the element (the default: the bubble doesn't cover the rows under a heading) or below it. */
  side?: "top" | "bottom";
  /** False for marks repeated in every row of a table: reached by the mouse and by a tap, not by Tab. */
  focusable?: boolean;
  /** False when the content already says the same to screen readers (a hidden label beside an icon). */
  described?: boolean;
  className?: string;
  children: React.ReactNode | ((describedBy: string | undefined) => React.ReactNode);
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const hover = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);
  // Stays mounted once opened, so the bubble can fade out
  const [opened, setOpened] = useState(false);
  const control = typeof children === "function";
  const describedBy = described ? id : undefined;

  function show() {
    setOpened(true);
    setOpen(true);
  }

  /**
   * Tab moves on: the bubble is removed before the browser picks the next element. Left open, the popup
   * library would take the focus into the bubble, and it would be lost when the bubble closes.
   */
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Tab" || !opened) return;
    flushSync(() => {
      setOpen(false);
      setOpened(false);
    });
  }

  return (
    <>
      <span
        ref={anchor}
        // A row that opens on a click can tell a tap on a hint from a tap on the row
        data-hint=""
        tabIndex={!control && focusable ? 0 : undefined}
        aria-describedby={control ? undefined : describedBy}
        onClick={control ? undefined : show}
        onFocus={(event) => event.target.matches(":focus-visible") && show()}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") hover.current = setTimeout(show, HOVER_MS);
        }}
        onPointerLeave={() => {
          clearTimeout(hover.current);
          setOpen(false);
        }}
        // The question-mark cursor is for headings and figures; a mark repeated down a table keeps the arrow
        className={cn("inline-flex rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50", !control && focusable && "cursor-help", className)}
      >
        {control ? children(describedBy) : children}
      </span>
      {described && (
        <span id={id} hidden>
          {text}
        </span>
      )}
      {opened && (
        <InfoTipPopup anchor={anchor} side={side} open={open} onOpenChange={setOpen}>
          {text}
        </InfoTipPopup>
      )}
    </>
  );
}
