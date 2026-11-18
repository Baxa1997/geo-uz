"use client";

import { CircleNotchIcon as LoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { DownloadSimpleIcon as Download } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { PrinterIcon as Printer } from "@phosphor-icons/react/dist/ssr/Printer";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";
import { usePdfAvailable } from "../hooks/use-pdf-available";

/** The file's name as the backend gives it, or one of our own. */
function filenameOf(response: Response, fallback: string) {
  const header = response.headers.get("content-disposition") ?? "";
  return /filename="([^"]+)"/.exec(header)?.[1] ?? fallback;
}

/**
 * A report as a PDF file (the user, 18 Nov 2026: "pdf download is not working, there are no pdf download
 * button"; until then the button opened the browser's print window, where the PDF had to be chosen, and on a
 * phone or in Telegram's browser often couldn't be). When the backend can print the report (`usePdfAvailable`),
 * the button downloads the file it makes, saying it is being prepared meanwhile (a first one takes a few
 * seconds); when it can't, or the download fails, it opens the print window as before: `printHref` (the report
 * with `?print=1`, in a new tab) or `onPrint` (the report on this page). `compact`: the icon alone.
 */
export function PdfButton({
  projectId,
  runId,
  printHref,
  onPrint,
  compact = false,
  variant = "default",
  className,
}: {
  projectId: string;
  runId: string;
  printHref?: string;
  onPrint?: () => void;
  compact?: boolean;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const t = useTranslations("Report.pdf");
  const locale = useLocale();
  const available = usePdfAvailable();
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  async function download() {
    setState("busy");
    try {
      const response = await fetch(`/api/backend/projects/${encodeURIComponent(projectId)}/reports/${encodeURIComponent(runId)}/pdf?lang=${locale}`);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: filenameOf(response, "seenova-report.pdf") });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  const label = state === "busy" ? t("preparing") : t("download");
  const size = compact ? "icon" : "default";

  // The print window: where the backend can't print, and after a download that failed
  const print =
    printHref !== undefined ? (
      <a href={printHref} target="_blank" rel="noopener" aria-label={compact ? t("print") : undefined} className={cn(buttonVariants({ variant: available === false || state === "failed" ? variant : "outline", size }), className)}>
        <Printer aria-hidden data-icon={compact ? undefined : "inline-start"} />
        {!compact && t(state === "failed" ? "printInstead" : "printOrPdf")}
      </a>
    ) : (
      <Button variant={available === false || state === "failed" ? variant : "outline"} size={size} aria-label={compact ? t("print") : undefined} onClick={onPrint} className={className}>
        <Printer aria-hidden data-icon={compact ? undefined : "inline-start"} />
        {!compact && t(state === "failed" ? "printInstead" : "printOrPdf")}
      </Button>
    );

  if (available !== true || state === "failed") {
    return (
      <Hint text={t(state === "failed" ? "failedHint" : "printHint")} described={false}>
        {() => print}
      </Hint>
    );
  }

  return (
    <Hint text={t("downloadHint")} described={false}>
      {() => (
        <Button variant={variant} size={size} disabled={state === "busy"} aria-label={compact ? label : undefined} aria-busy={state === "busy"} onClick={() => void download()} className={className}>
          {state === "busy" ? (
            <LoaderCircle aria-hidden data-icon={compact ? undefined : "inline-start"} className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Download aria-hidden data-icon={compact ? undefined : "inline-start"} />
          )}
          {!compact && <span aria-live="polite">{label}</span>}
        </Button>
      )}
    </Hint>
  );
}
