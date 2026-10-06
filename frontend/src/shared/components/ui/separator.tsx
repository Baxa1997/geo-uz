import type * as React from "react"
import { cn } from "cn"

/**
 * A plain <div role="separator">, with the same attributes the UI library's separator sets. That one
 * came along with every form (./field imports this file) and brought the library's core to the
 * landing page for a line.
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-orientation={orientation}
      data-slot="separator"
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
