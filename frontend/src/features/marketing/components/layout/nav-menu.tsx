"use client";

import { ChevronDown } from "lucide-react";
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
        className="flex h-9 items-center gap-1 rounded-lg px-3 text-muted-foreground transition-colors hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
      >
        {label}
        <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {/* The padding bridges the gap to the button, so the pointer can travel to the panel */}
      <div id={id} hidden={!open} className="absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2">
        <div onClick={() => setOpen(false)} className="w-[22rem] rounded-2xl border bg-background p-2 shadow-xl shadow-black/10">
          {children}
        </div>
      </div>
    </div>
  );
}
