"use client";

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";

/** An ⓘ beside a title or a number that explains it: opens on hover, focus or tap. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={120}
        aria-label={label}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Info aria-hidden className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} collisionPadding={12} className="z-50">
          <Popover.Popup className="max-w-64 rounded-lg bg-foreground px-3 py-2 text-xs font-normal text-pretty text-background shadow-lg transition-opacity duration-150 outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
