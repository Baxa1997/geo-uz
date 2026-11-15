"use client";

import { Input } from "@/shared/components/ui/input";
import { labelFor } from "@/shared/helpers/labels";
import { INPUT_CLASS } from "../constants";

/**
 * A field typed freely with our own list offered under it (the field of business, the city): any business
 * fits, not only the ones we listed. A typed text that is one of the list's labels is kept as its code, so
 * it reads in every language; anything else is kept as written.
 */
export function SuggestInput({
  id,
  options,
  value,
  onChange,
  placeholder,
  invalid = false,
  describedBy,
}: {
  id: string;
  /** Code → label in the interface's language; may be empty. */
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const codeOf = (text: string) => Object.entries(options).find(([, label]) => label.toLowerCase() === text.trim().toLowerCase())?.[0];

  return (
    <>
      <Input
        id={id}
        list={`${id}-list`}
        value={labelFor(options, value)}
        onChange={(e) => onChange(codeOf(e.target.value) ?? e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={INPUT_CLASS}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <datalist id={`${id}-list`}>
        {Object.entries(options).map(([code, label]) => (
          <option key={code} value={label} />
        ))}
      </datalist>
    </>
  );
}
