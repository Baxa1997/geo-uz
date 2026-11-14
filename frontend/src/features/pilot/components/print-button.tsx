"use client";

import { Printer } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/** Opens the print window, which is also how the report is saved as a PDF. On screen only. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button onClick={() => window.print()}>
      <Printer aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  );
}
