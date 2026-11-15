"use client";

import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { MinusCircleIcon as MinusCircle } from "@phosphor-icons/react/dist/ssr/MinusCircle";
import { WarningCircleIcon as WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { useLocale, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { cn } from "@/shared/helpers/utils";
import type { BrandView } from "@/shared/types/api";

const MARKS = {
  confirmed: { Icon: CheckCircle, color: "text-positive" },
  contradicted: { Icon: WarningCircle, color: "text-negative" },
  unverified: { Icon: MinusCircle, color: "text-muted-foreground" },
} as const;

/**
 * What each assistant says when asked about the business by name: whether it knows it, and its statements,
 * each marked against the website (says the same, says otherwise, says nothing about it).
 */
export function FirstRunBrandView({ views, brand }: { views: BrandView[]; brand: string }) {
  const t = useTranslations("FirstRun.brandView");
  const locale = useLocale() as "uz" | "ru" | "en";

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-col gap-1 border-b p-4 sm:px-5">
        <h2 className="font-semibold">{t("title", { brand })}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{t("text")}</p>
      </div>
      <ul className="divide-y">
        {views.map((view) => {
          const wrong = view.statements.filter((statement) => statement.check === "contradicted").length;
          return (
            <li key={`${view.engine}-${view.language}`} className="flex flex-col gap-2.5 px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-medium">{view.name}</span>
                <span className="text-[0.65rem] font-semibold text-muted-foreground uppercase">{view.language}</span>
                <span className={cn("text-sm", view.known === "knows" ? "text-muted-foreground" : "font-medium text-negative")}>
                  {view.known === "knows" ? t("knows", { count: view.statements.length, wrong }) : t(view.known)}
                </span>
              </div>
              <p className="text-sm text-pretty text-muted-foreground">{t("asked", { question: view.question })}</p>
              {view.statements.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {view.statements.map((statement, index) => {
                    const { Icon, color } = MARKS[statement.check];
                    return (
                      <li key={index} className="flex items-start gap-2.5 text-sm">
                        <Hint text={t(`checks.${statement.check}Hint`)}>
                          <Icon aria-label={t(`checks.${statement.check}`)} weight="fill" className={cn("mt-0.5 size-4 shrink-0", color)} />
                        </Hint>
                        <span className="flex min-w-0 flex-col gap-0.5 text-pretty">
                          <span>
                            <span className="mr-1.5 text-muted-foreground">{t(`topics.${statement.topic}`)}:</span>
                            {statement.text[locale]}
                          </span>
                          {statement.correct && <span className="text-negative">{t("correct", { text: statement.correct[locale] })}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        {(["confirmed", "contradicted", "unverified"] as const).map((check) => {
          const { Icon, color } = MARKS[check];
          return (
            <span key={check} className="flex items-center gap-1.5">
              <Icon aria-hidden weight="fill" className={cn("size-3.5", color)} />
              {t(`checks.${check}`)}
            </span>
          );
        })}
      </p>
    </div>
  );
}
