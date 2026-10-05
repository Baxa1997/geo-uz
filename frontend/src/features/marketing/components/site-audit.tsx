"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/helpers/utils";
import type { SiteCheckResult, Source } from "@/shared/types/api";

interface Row {
  key: string;
  passed: boolean;
  /** What was found, said as a fact: readable without the icon. */
  text: string;
  fix: string;
}

/**
 * Why ChatGPT may not see the site: the backend's checks on the website, plus whether the brand is in
 * the directory ChatGPT cites most. Problems first, each with its fix, so a low score comes with a to-do.
 */
export function SiteAudit({ checks, sources }: { checks: SiteCheckResult[] | null; sources: Source[] }) {
  const t = useTranslations("Check");
  const directory = sources.filter((source) => source.type === "directory").sort((a, b) => b.count - a.count)[0];

  const rows: Row[] = [
    ...(checks ?? []).map(({ check, passed }) => ({
      key: check,
      passed,
      text: t(passed ? `checks.${check}.ok` : `checks.${check}.bad`),
      fix: t(`checks.${check}.fix`),
    })),
    ...(directory
      ? [
          {
            key: "directory",
            passed: directory.brandListed,
            text: t(directory.brandListed ? "directory.ok" : "directory.bad", { domain: directory.domain }),
            fix: t("directory.fix", { count: directory.count }),
          },
        ]
      : []),
  ].sort((a, b) => Number(a.passed) - Number(b.passed));
  const failed = rows.filter((row) => !row.passed).length;

  if (rows.length === 0 && checks !== null) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auditTitle")}</CardTitle>
        <CardDescription>{failed > 0 ? t("auditFound", { count: failed }) : t("auditOk")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {checks === null && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{t("auditUnreadable")}</p>}
        <ul className="flex flex-col divide-y">
          {rows.map(({ key, passed, text, fix }) => {
            const Icon = passed ? CircleCheck : CircleX;
            return (
              <li key={key} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", passed ? "text-positive" : "text-negative")} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className={cn("text-sm text-pretty", !passed && "font-medium")}>{text}</p>
                  {!passed && <p className="text-sm text-pretty text-muted-foreground">{fix}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
