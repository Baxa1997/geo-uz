import { CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import type { PromptResult, WrongFact } from "@/shared/types/api";

/** What ChatGPT gets wrong about the brand: the claim, the truth, the question it came up in, and since when. */
export function WrongFacts({
  facts,
  prompts,
  answersHref,
}: {
  facts: WrongFact[];
  prompts: PromptResult[];
  /** In the workspace: where to read the answers of a prompt. Left out on the public report. */
  answersHref?: (promptId: string) => string;
}) {
  const t = useTranslations("WrongFacts");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const promptText = (id: string) => prompts.find((result) => result.prompt.id === id)?.prompt.text;

  return (
    <Card id="wrong-facts" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        {facts.length > 0 && (
          <CardAction>
            <Badge variant="destructive">{facts.length}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {facts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {facts.map((fact) => {
              const question = promptText(fact.promptId);
              return (
                <li key={`${fact.promptId}-${fact.claim}`} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex gap-2">
                    <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-negative" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("says")}</p>
                      <p className="font-medium">{fact.claim}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("correct")}</p>
                      <p>{fact.correct}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 border-t pt-2 text-xs text-muted-foreground">
                    {question && (
                      <p>
                        {t("prompt")}:{" "}
                        {answersHref ? (
                          <Link href={answersHref(fact.promptId)} className="text-foreground underline-offset-4 hover:underline">
                            {question}
                          </Link>
                        ) : (
                          question
                        )}
                      </p>
                    )}
                    <p>{t("foundAt", { date: formatLongDate(fact.foundAt, locale, timeZone) })}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
