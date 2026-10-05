"use client";

import { ArrowRight } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { HeadlineScore } from "@/shared/components/scores/headline-score";
import { MethodLabel } from "@/shared/components/scores/method-label";
import { NamedBrandChips } from "@/shared/components/scores/named-brand-chips";
import { buttonVariants } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { labelFor } from "@/shared/helpers/labels";
import { answersNaming, missingSources, namedBrands } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Snapshot } from "@/shared/types/api";
import { PREVIEW_MAX_DOMAINS, PREVIEW_MAX_MISSED } from "../constants";
import { SiteAudit } from "./site-audit";

/**
 * The free result: you vs the top competitor, who was named instead of you, what on the website keeps
 * ChatGPT from reading it, and the way to the full report.
 */
export function SnapshotPreview({ snapshot }: { snapshot: Snapshot }) {
  const t = useTranslations("Check");
  const messages = useMessages();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const youId = snapshot.brand.id;
  const brands = [snapshot.brand, ...snapshot.competitors];

  // The progress screen was just replaced: move focus to the result for screen readers
  useEffect(() => headingRef.current?.focus(), []);

  const missed = snapshot.prompts
    .filter((result) => answersNaming(result, youId) === 0)
    .map((result) => ({ result, named: namedBrands(result, brands, youId) }))
    .filter(({ named }) => named.length > 0)
    .slice(0, PREVIEW_MAX_MISSED);
  const notListed = missingSources(snapshot.topSources, snapshot.competitors);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight break-all outline-none">
          {t("resultTitle", { site: snapshot.domain })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("detected", {
            category: labelFor(messages.Categories, snapshot.category),
            city: labelFor(messages.Cities, snapshot.city),
          })}
        </p>
        <MethodLabel method={snapshot.method} />
      </div>

      <HeadlineScore brand={snapshot.brand} competitors={snapshot.competitors} scores={snapshot.scores} showTrend={false} />

      {missed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("instead")}</CardTitle>
            <CardDescription>{t("insteadDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="-mx-4 divide-y border-y">
              {missed.map(({ result, named }) => (
                <li key={result.prompt.id} className="flex flex-col gap-1.5 px-4 py-3">
                  <p className="text-sm font-medium text-pretty">
                    <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">
                      {result.prompt.language}
                    </span>
                    {result.prompt.text}
                  </p>
                  <NamedBrandChips named={named} youId={youId} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {notListed.length > 0 && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          {t("sourcesMissing", {
            count: notListed.length,
            domains: notListed.slice(0, PREVIEW_MAX_DOMAINS).map((source) => source.domain).join(", "),
          })}
        </p>
      )}

      <SiteAudit checks={snapshot.siteChecks} sources={snapshot.topSources} />

      <Card className="bg-you-soft/40 ring-you/30">
        <CardHeader>
          <CardTitle>{t("fullTitle")}</CardTitle>
          <CardDescription className="text-foreground/80">{t("fullReport")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={{ pathname: "/login", query: { snapshot: snapshot.id } }}
            className={cn(buttonVariants({ size: "lg" }), "h-12 px-5 text-base")}
          >
            {t("save")}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-12")}>
            {t("again")}
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
