"use client";

import { Input } from "@/shared/components/ui/input";
import { PHONE_PREFIX } from "@/shared/constants";
import { formatLocalNumber, localDigits } from "@/shared/helpers/phone";
import { cn } from "@/shared/helpers/utils";

/** Uzbek phone number: +998 fixed in front, the 9 digits formatted as "90 123 45 67". */
export function PhoneInput({
  digits,
  onDigitsChange,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  digits: string;
  onDigitsChange: (digits: string) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base text-muted-foreground"
      >
        {PHONE_PREFIX}
      </span>
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="90 123 45 67"
        value={formatLocalNumber(digits)}
        onChange={(e) => onDigitsChange(localDigits(e.target.value))}
        className={cn("h-12 bg-background pl-15 text-base tabular-nums md:text-base", className)}
        {...props}
      />
    </div>
  );
}
