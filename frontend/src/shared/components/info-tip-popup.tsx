"use client";

import { Popover } from "@base-ui/react/popover";
import type { RefObject } from "react";

/**
 * The bubble of an InfoTip, placed under its ⓘ and kept inside the window. It closes on Escape or a
 * press outside; InfoTip opens it and closes it when the pointer or the focus leaves the ⓘ. Hidden from
 * screen readers: they get the same text as the ⓘ's description.
 */
export function InfoTipPopup({
  anchor,
  open,
  onOpenChange,
  children,
}: {
  anchor: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Popover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Popover.Portal>
        <Popover.Positioner anchor={anchor} sideOffset={6} collisionPadding={12} className="z-50">
          <Popover.Popup
            // The ⓘ keeps the focus: the bubble is read, not operated
            initialFocus={false}
            finalFocus={false}
            aria-hidden
            className="pointer-events-none max-w-64 rounded-lg bg-foreground px-3 py-2 text-xs font-normal text-pretty text-background shadow-lg transition-opacity duration-150 outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
