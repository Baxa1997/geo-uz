"use client";

import { useState } from "react";
import { PHONE_PREFIX } from "@/shared/constants";
import type { LoginTarget } from "../types";
import { CodeForm } from "./code-form";
import { PhoneForm } from "./phone-form";

/** Phone number → SMS code → logged in. */
export function PhoneLogin({ target }: { target: LoginTarget }) {
  // Kept here so "Change number" goes back with the number still filled in
  const [digits, setDigits] = useState("");
  const [resendIn, setResendIn] = useState<number | null>(null);

  return resendIn === null ? (
    <PhoneForm digits={digits} onDigitsChange={setDigits} onSent={setResendIn} />
  ) : (
    <CodeForm
      phone={`${PHONE_PREFIX}${digits}`}
      resendIn={resendIn}
      target={target}
      onChangeNumber={() => setResendIn(null)}
    />
  );
}
