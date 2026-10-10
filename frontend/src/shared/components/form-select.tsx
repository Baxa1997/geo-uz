"use client";

import { ChevronsUpDown } from "lucide-react";

/** A choice from a list in a window, in Peec's form: a tall rounded box with up and down arrows. */
export function FormSelect({
  id,
  value,
  required = false,
  onChange,
  children,
}: {
  id: string;
  value: string;
  /** With an empty first option as the placeholder, shown in gray until something is chosen. */
  required?: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border bg-background pr-10 pl-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 invalid:text-muted-foreground"
      >
        {children}
      </select>
      <ChevronsUpDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
