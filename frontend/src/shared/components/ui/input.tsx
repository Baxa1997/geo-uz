import type * as React from "react"
import { cn } from "cn"
import { fieldClass } from "./field-style"

/**
 * A plain <input>. The UI library's input is its form-field control, which nothing here uses (fields
 * are laid out and validated by ./field and the forms themselves) and which costs every page its scripts.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      // The app's one field style (./field-style): 40px unless the page says otherwise
      className={fieldClass("md", cn("file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground", className))}
      {...props}
    />
  )
}

export { Input }
