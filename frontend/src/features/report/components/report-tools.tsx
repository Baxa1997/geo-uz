"use client";

import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { LinkIcon as Link2 } from "@phosphor-icons/react/dist/ssr/Link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { PdfButton } from "./pdf-button";

/**
 * The report's two tools, on screen only: copy its link (anyone with it can read the report) and its PDF, a
 * file the backend makes, or the print window where it can't (`PdfButton`). The page is laid out for A4.
 */
export function ReportTools({ projectId, runId }: { projectId: string; runId: string }) {
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
      <PdfButton projectId={projectId} runId={runId} onPrint={() => window.print()} />
    </div>
  );
}
