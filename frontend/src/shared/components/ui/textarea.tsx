import * as React from "react"
import { cn } from "cn"
import { areaClass } from "./field-style"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={areaClass(cn("flex field-sizing-content min-h-16", className))}
      {...props}
    />
  )
}

export { Textarea }
