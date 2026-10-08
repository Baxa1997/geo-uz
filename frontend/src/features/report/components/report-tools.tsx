"use client";

import { Check, Link2, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";

/**
 * The report's two tools, on screen only: copy its link (anyone with it can read the report) and print it,
 * which is also how it is saved as a PDF. The page is laid out for A4.
 */
export function ReportTools() {
  const t = useTranslations("Report");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the address bar still has the link
    }
  }

  return (
    <div role="group" aria-label={t("tools")} className="flex items-center gap-1.5">
      <Button variant="outline" onClick={copy}>
        {copied ? <Check aria-hidden data-icon="inline-start" /> : <Link2 aria-hidden data-icon="inline-start" />}
        <span aria-live="polite" className="hidden sm:inline">
          {copied ? t("copied") : t("copy")}
        </span>
        <span className="sr-only sm:hidden">{copied ? t("copied") : t("copy")}</span>
      </Button>
      <Button onClick={() => window.print()}>
        <Printer aria-hidden data-icon="inline-start" />
        {t("print")}
      </Button>
    </div>
  );
}
