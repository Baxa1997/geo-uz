"use client";

import { Check, Link2, Printer, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { Button, buttonVariants } from "@/shared/components/ui/button";

/**
 * A report's ways out, in Hisobotlar: copy the shared report's link (anyone with it can read it, no login),
 * share it in Telegram, or open it as A4 with the print window, where it is saved as a PDF.
 */
export function ReportShare({ path, text }: { path: string; text: string }) {
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
      <Hint text={t("pdfHint")} described={false}>
        {() => (
          <a href={`${path}${path.includes("?") ? "&" : "?"}print=1`} target="_blank" rel="noopener" className={buttonVariants()}>
            <Printer aria-hidden data-icon="inline-start" />
            {t("pdf")}
          </a>
        )}
      </Hint>
    </div>
  );
}
