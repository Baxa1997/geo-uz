import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { answersNaming, promptsWithoutYou } from "@/shared/helpers/scores";
import type { PromptResult } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { UntrackButton } from "./untrack-button";

const SHOWN = 3;

/**
 * One competitor: the questions where ChatGPT names them and not the client, each with the number of
 * answers naming them; a question opens its own page. The first three show, the rest unfold. The button
 * in the corner stops tracking the competitor.
 */
export function RivalCard({
  projectId,
  rival,
  results,
  youId,
  questionHref,
}: {
  projectId: string;
  /** The competitor with its color, as in the brands table. */
  rival: SeriesBrand;
  results: PromptResult[];
  youId: string;
  /** The page of one question. */
  questionHref: (promptId: string) => string;
}) {
  const t = useTranslations("Competitors");
  const ahead = promptsWithoutYou(results, youId, [rival.id]);

  const row = (result: PromptResult) => {
    const named = answersNaming(result, rival.id);
    return (
      <li key={result.prompt.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
        <Link href={questionHref(result.prompt.id)} className="line-clamp-2 min-w-0 flex-1 text-sm text-pretty underline-offset-4 hover:underline">
          <span className="mr-1.5 align-[1px] text-[0.65rem] font-semibold text-muted-foreground uppercase">{result.prompt.language}</span>
          {result.prompt.text}
        </Link>
        <Hint
          text={t("namedIn", { count: named, total: result.answers.length })}
          focusable={false}
          described={false}
          className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums"
        >
          <span aria-hidden>
            {named}/{result.answers.length}
          </span>
          <span className="sr-only">{t("namedIn", { count: named, total: result.answers.length })}</span>
        </Hint>
      </li>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: rival.color }} />
          <span className="truncate">{rival.name}</span>
        </CardTitle>
        <CardDescription>{ahead.length > 0 ? t("aheadCount", { count: ahead.length }) : t("aheadNone")}</CardDescription>
        <CardAction>
          <UntrackButton projectId={projectId} brand={{ id: rival.id, name: rival.name }} />
        </CardAction>
      </CardHeader>
      {ahead.length > 0 && (
        <CardContent>
          <ul className="flex flex-col divide-y">{ahead.slice(0, SHOWN).map(row)}</ul>
          {ahead.length > SHOWN && (
            <details className="mt-2.5 border-t pt-2.5">
              <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
                {t("more", { count: ahead.length - SHOWN })}
              </summary>
              <ul className="mt-2.5 flex flex-col divide-y">{ahead.slice(SHOWN).map(row)}</ul>
            </details>
          )}
        </CardContent>
      )}
    </Card>
  );
}
