import { CircleCheck, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Action } from "@/shared/types/api";

/** Why this fix: the evidence from the answers. */
export function ActionWhy({ action, competitors }: { action: Action; competitors: Map<string, string> }) {
  const t = useTranslations("Actions.why");
  const text = "text-sm text-pretty text-muted-foreground";

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
        <dl className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex items-start gap-2">
            <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-negative" />
            <div>
              <dt className="text-xs text-muted-foreground">{t("factSaid")}</dt>
              <dd className="text-pretty">{action.claim}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
            <div>
              <dt className="text-xs text-muted-foreground">{t("factCorrect")}</dt>
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
