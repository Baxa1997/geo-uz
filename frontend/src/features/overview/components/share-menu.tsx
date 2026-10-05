"use client";

import { ChevronDown, Download, ExternalLink, Link2, Share } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { TIME_ZONE } from "@/shared/constants";
import { downloadCsv } from "@/shared/helpers/csv";
import { formatIsoDay } from "@/shared/helpers/dates";
import { outOf100, scoreOf } from "@/shared/helpers/scores";
import type { HistoryPoint } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/**
 * "Share" on the Overview: copy the public report's link (anyone with it can read the report, no login),
 * open that report, or download every weekly run as a CSV file for the client's own spreadsheets.
 */
export function ShareMenu({
  projectId,
  history,
  brands,
  filename,
}: {
  projectId: string;
  history: HistoryPoint[];
  brands: SeriesBrand[];
  filename: string;
}) {
  const t = useTranslations("Overview");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const reportPath = `/${locale}/projects/${projectId}/report`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${reportPath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: open the report instead, its address can be copied from there
      window.open(reportPath, "_blank", "noopener");
    }
  }

  function exportCsv() {
    downloadCsv(filename, [
      [t("csv.date"), t("csv.brand"), t("csv.visibility"), t("csv.shareOfVoice"), t("csv.sentiment"), t("csv.position")],
      ...history.flatMap((point) =>
        brands.map((brand) => {
          const score = scoreOf(point.scores, brand.id);
          return [
            formatIsoDay(point.collectedAt, TIME_ZONE),
            brand.name,
            score ? outOf100(score.visibility) : null,
            score ? Math.round(score.shareOfVoice * 100) : null,
            score?.sentiment ?? null,
            score?.avgPosition ?? null,
          ];
        }),
      ),
    ]);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm shadow-xs transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-muted/60">
          <Share aria-hidden className="size-4 text-muted-foreground" />
          {t("share")}
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-56">
          <DropdownMenuItem onClick={copyLink}>
            <Link2 aria-hidden />
            {t("copyLink")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(reportPath, "_blank", "noopener")}>
            <ExternalLink aria-hidden />
            {t("openReport")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportCsv}>
            <Download aria-hidden />
            {t("export")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </p>
      {copied && (
        <span aria-hidden className="text-sm text-muted-foreground">
          {t("copied")}
        </span>
      )}
    </>
  );
}
