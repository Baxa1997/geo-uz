"use client";

import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CopySimpleIcon as Copy } from "@phosphor-icons/react/dist/ssr/CopySimple";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";

/**
 * A check's Telegram digest (report spec §4.15, Phase 0 item 0.8), written by the backend from the data object:
 * its six lines as they will read in Telegram, and Copy. There is no bot: the lines are forwarded by hand.
 */
export function CopyDigest({ text, title, hint, className }: { text: string; title: string; hint: string; className?: string }) {
  const t = useTranslations("Report.digest");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section data-block="digest" className={cn("flex flex-col gap-2 print:hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-pretty text-muted-foreground">{hint}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copy} aria-live="polite">
          {copied ? <Check aria-hidden data-icon="inline-start" /> : <Copy aria-hidden data-icon="inline-start" />}
          {t(copied ? "copied" : "copy")}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2.5 font-sans text-sm leading-relaxed whitespace-pre-wrap">{text}</pre>
    </section>
  );
}
