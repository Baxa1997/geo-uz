"use client";

import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { LinkIcon as Link2 } from "@phosphor-icons/react/dist/ssr/Link";
import { PaperPlaneTiltIcon as Send } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { Button } from "@/shared/components/ui/button";
import { PdfButton } from "./pdf-button";

/**
 * A report's ways out, in Hisobotlar: copy the shared report's link (anyone with it can read it, no login),
 * share it in Telegram, or download its PDF (the print window where the backend can't make one: `PdfButton`).
 */
export function ReportShare({ path, text, projectId, runId }: { path: string; text: string; projectId: string; runId: string }) {
  const t = useTranslations("Reports.share");
  const [copied, setCopied] = useState(false);
  const absolute = () => new URL(path, window.location.origin).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(absolute());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the report opens from the PDF button too
    }
  }

  return (
    <div data-tour="tools" className="flex flex-wrap items-center gap-2">
      <Hint text={t("copyHint")} described={false}>
        {() => (
          <Button variant="outline" onClick={copy} className="bg-background">
            {copied ? <Check aria-hidden data-icon="inline-start" /> : <Link2 aria-hidden data-icon="inline-start" />}
            <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
          </Button>
        )}
      </Hint>
      <Hint text={t("telegramHint")} described={false}>
        {() => (
          <Button
            variant="outline"
            className="bg-background"
            onClick={() => window.open(`https://t.me/share/url?${new URLSearchParams({ url: absolute(), text })}`, "_blank", "noopener")}
          >
            <Send aria-hidden data-icon="inline-start" />
            {t("telegram")}
          </Button>
        )}
      </Hint>
      <PdfButton projectId={projectId} runId={runId} printHref={`${path}${path.includes("?") ? "&" : "?"}print=1`} />
    </div>
  );
}
