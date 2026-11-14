"use client";

import { CaretDownIcon as ChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { useId, useRef, useState } from "react";
import { cn } from "@/shared/helpers/utils";

/**
 * A navbar item that opens a panel of links: on hover with a mouse, on click or Enter otherwise.
 * It closes on Escape, when focus leaves it, and when one of its links is followed.
 */
export function NavMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        setOpen(false);
        button.current?.focus();
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 items-center gap-1.5 rounded-xl px-4 text-foreground/75 transition-colors hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
      >
        {label}
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {/* The padding bridges the gap to the button, so the pointer can travel to the panel */}
      <div id={id} hidden={!open} className="absolute top-full left-0 z-50 pt-2">
        <div onClick={() => setOpen(false)} className="w-[26rem] rounded-2xl border bg-background p-2.5 shadow-xl shadow-brand/10">
          {children}
        </div>
      </div>
    </div>
  );
}
