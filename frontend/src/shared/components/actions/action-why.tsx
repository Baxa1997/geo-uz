import { CircleCheck, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";
import type { Action } from "@/shared/types/api";

/**
 * Why this fix: the evidence from the answers. Shown in an opened action and in the report's
 * recommendations. `prominent` (the opened action) sets it in the panel's body text, dark and larger,
 * with a wrong fact's box in full gray.
 */
export function ActionWhy({ action, competitors, prominent = false }: { action: Action; competitors: Map<string, string>; prominent?: boolean }) {
  const t = useTranslations("Actions.why");
  const text = prominent ? "text-[0.9375rem] leading-[1.45] text-pretty text-foreground" : "text-sm text-pretty text-muted-foreground";
  const label = prominent ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground";
  const icon = cn("mt-0.5 shrink-0", prominent ? "size-[1.125rem]" : "size-4");

  switch (action.kind) {
    case "listing": {
      const names = action.competitorIds.flatMap((id) => competitors.get(id) ?? []);
      return (
        <p className={text}>
          {names.length
            ? t("listing", { answers: action.answers, domain: action.domain, competitors: names.join(", ") })
            : t("listingAlone", { answers: action.answers, domain: action.domain })}
        </p>
      );
    }
    case "fact":
      return (
        <dl
          className={cn(
            "flex flex-col",
            prominent ? "gap-3 rounded-xl bg-muted px-4 py-3.5 text-[0.9375rem] leading-[1.45] text-foreground" : "gap-1.5 rounded-lg bg-muted/60 p-3 text-sm",
          )}
        >
          <div className={cn("flex items-start", prominent ? "gap-2.5" : "gap-2")}>
            <CircleX aria-hidden className={cn(icon, "text-negative")} />
            <div>
              <dt className={label}>{t("factSaid")}</dt>
              <dd className="text-pretty">{action.claim}</dd>
            </div>
          </div>
          <div className={cn("flex items-start", prominent ? "gap-2.5" : "gap-2")}>
            <CircleCheck aria-hidden className={cn(icon, "text-positive")} />
            <div>
              <dt className={label}>{t("factCorrect")}</dt>
              <dd className="text-pretty">{action.correct}</dd>
            </div>
          </div>
        </dl>
      );
    case "content":
      return <p className={text}>{t("content", { count: action.promptIds.length })}</p>;
    case "technical":
      return <p className={text}>{t(action.check)}</p>;
  }
}
