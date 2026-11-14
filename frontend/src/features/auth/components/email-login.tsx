"use client";

import { useState } from "react";
import type { LoginTarget } from "../types";
import { CodeForm } from "./code-form";
import { EmailForm } from "./email-form";

/** Email → the code sent to it → logged in. */
export function EmailLogin({ target }: { target: LoginTarget }) {
  // Kept here so "Change email" goes back with the address still filled in
  const [email, setEmail] = useState("");
  const [resendIn, setResendIn] = useState<number | null>(null);

  return resendIn === null ? (
    <EmailForm email={email} onEmailChange={setEmail} onSent={setResendIn} />
  ) : (
    <CodeForm email={email.trim()} resendIn={resendIn} target={target} onChangeEmail={() => setResendIn(null)} />
  );
}
