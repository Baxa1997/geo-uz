"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Undo2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { Button } from "@/shared/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/query-keys";
import { formatPercent } from "@/shared/helpers/numbers";
import type { Plan, UntrackedBrand } from "@/shared/types/api";

type Change = { brand: UntrackedBrand; to: "tracked" | "hidden" | "shown" };

/**
 * Brands ChatGPT names in the answers that the project doesn't track, most named first, laid out like
 * Peec's brand suggestions: each with how often it comes up and two buttons. "Track" makes it a competitor
 * at once (its numbers are counted from the answers already collected), while the plan has room for one
 * more; "hide" takes it off the list (it isn't a competitor), and hidden ones can be shown again.
 */
export function UntrackedBrands({
  projectId,
  brands,
  totalAnswers,
  tracked,
  limit,
  plan,
}: {
  projectId: string;
  brands: UntrackedBrand[];
  totalAnswers: number;
  /** Competitors tracked now, out of `limit`, the most the plan allows. */
  tracked: number;
  limit: number;
  plan: Plan;
}) {
  const t = useTranslations("Competitors");
  const plans = useTranslations("Plans");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [announcement, setAnnouncement] = useState("");

  const change = useMutation({
    mutationFn: async ({ brand, to }: Change) => {
      if (to === "tracked") await api.addCompetitor(projectId, { name: brand.name });
      else await api.dismissBrand(projectId, { name: brand.name, dismissed: to === "hidden" });
    },
    onSuccess: (_, { brand, to }) => {
      setAnnouncement(t(`untracked.${to}Note`, { name: brand.name }));
      // The sidebar's project and every number on the page follow the tracked brands
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.refresh();
    },
  });
  const busy = change.isPending ? change.variables.brand.name : null;

  const suggested = brands.filter((brand) => !brand.dismissed);
  const hidden = brands.filter((brand) => brand.dismissed);
  const full = tracked >= limit;
  const usage = t("untracked.usage", { plan: plans(plan), max: limit });
  const count = (brand: UntrackedBrand) =>
    `${t("untrackedAnswers", { count: brand.answers, total: totalAnswers })} · ${formatPercent(totalAnswers ? brand.answers / totalAnswers : 0, locale)}`;

  return (
    <Panel
      // "0 more brands" would read oddly once every suggestion is tracked or hidden
      title={suggested.length > 0 ? t("untrackedTitle", { count: suggested.length }) : t("untracked.titleNone")}
      hint={t("untrackedText")}
      actions={
        <Hint text={usage} className="text-sm text-muted-foreground tabular-nums">
          {t("untracked.tracked")} <span className="ml-1 font-medium text-foreground">{tracked}</span>/{limit}
        </Hint>
      }
    >
      {full && <p className="mx-3 mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-pretty">{t("untracked.full", { plan: plans(plan), max: limit })}</p>}
      {change.isError && (
        <p role="alert" className="mx-3 mt-3 text-sm text-destructive">
          {t("untracked.failed")}
        </p>
      )}

      {suggested.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("untracked.none")}</p>
      ) : (
        <div className="@container">
          <ul className="grid gap-2 p-3 @xl:grid-cols-2 @5xl:grid-cols-3">
            {suggested.map((brand) => (
              <li key={brand.name} className="flex items-center gap-3 rounded-xl border p-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{brand.name}</span>
                  <span className="text-xs text-muted-foreground">{count(brand)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Hint text={full ? t("untracked.trackFull") : t("untracked.trackHint")} described={false}>
                    {() => (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={full || busy === brand.name}
                        aria-label={t("untracked.trackLabel", { name: brand.name })}
                        onClick={() => change.mutate({ brand, to: "tracked" })}
                      >
                        <Check aria-hidden data-icon="inline-start" />
                        {t("untracked.track")}
                      </Button>
                    )}
                  </Hint>
                  <Hint text={t("untracked.hideHint")} described={false}>
                    {() => (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy === brand.name}
                        aria-label={t("untracked.hideLabel", { name: brand.name })}
                        onClick={() => change.mutate({ brand, to: "hidden" })}
                      >
                        <X aria-hidden />
                      </Button>
                    )}
                  </Hint>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hidden.length > 0 && (
        <details className="border-t px-4 py-2.5 text-sm">
          <summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
            {t("untracked.hiddenTitle", { count: hidden.length })}
          </summary>
          <ul className="mt-2 flex flex-col divide-y">
            {hidden.map((brand) => (
              <li key={brand.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{brand.name}</span>
                  <span className="text-xs text-muted-foreground">{count(brand)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === brand.name}
                  aria-label={t("untracked.showLabel", { name: brand.name })}
                  onClick={() => change.mutate({ brand, to: "shown" })}
                >
                  <Undo2 aria-hidden data-icon="inline-start" />
                  {t("untracked.show")}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </Panel>
  );
}
