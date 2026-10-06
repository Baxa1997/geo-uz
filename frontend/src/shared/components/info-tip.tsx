"use client";

import { Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

// The bubble (and the popup library that positions it) is downloaded the first time a tip is opened.
// A page shows dozens of these and most are never opened; the landing page's preview can't open any.
const InfoTipPopup = dynamic(() => import("./info-tip-popup").then((module) => module.InfoTipPopup), { ssr: false });

/** A mouse must rest on the ⓘ this long, so passing over it on the way elsewhere opens nothing. */
const HOVER_MS = 120;

/**
 * An ⓘ beside a title or a number that explains it: opens on hover, focus or tap. The explanation is
 * also the ⓘ's description, so a screen reader reads it on focus; the bubble is for the eyes.
 */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const hover = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);
  // Stays mounted once opened, so the bubble can fade out
  const [opened, setOpened] = useState(false);

  function show() {
    setOpened(true);
    setOpen(true);
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-describedby={id}
        onClick={show}
        onFocus={(event) => event.currentTarget.matches(":focus-visible") && show()}
        onBlur={() => setOpen(false)}
        // Tab moves on: with the bubble still there, the popup library would take the focus into it and lose it
        onKeyDown={(event) => {
          if (event.key !== "Tab" || !opened) return;
          flushSync(() => {
            setOpen(false);
            setOpened(false);
          });
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") hover.current = setTimeout(show, HOVER_MS);
        }}
        onPointerLeave={() => {
          clearTimeout(hover.current);
          setOpen(false);
        }}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Info aria-hidden className="size-3.5" />
      </button>
      <span id={id} className="sr-only">
        {children}
      </span>
      {opened && (
        <InfoTipPopup anchor={button} open={open} onOpenChange={setOpen}>
          {children}
        </InfoTipPopup>
      )}
    </>
  );
}
