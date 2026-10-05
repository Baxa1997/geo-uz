import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { answersNaming, promptsWithoutYou } from "@/shared/helpers/scores";
import type { Brand, PromptResult } from "@/shared/types/api";

const SHOWN = 3;

/** One competitor: the questions where ChatGPT names them and not the client; each opens its answers. */
export function RivalCard({
  rival,
  results,
  youId,
  answersHref,
}: {
  rival: Brand;
  results: PromptResult[];
  youId: string;
  /** Where to read one question's answers. */
  answersHref: (promptId: string) => string;
}) {
  const t = useTranslations("Competitors");
  const ahead = promptsWithoutYou(results, youId, [rival.id]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="truncate">{rival.name}</CardTitle>
        <CardDescription>{ahead.length > 0 ? t("aheadCount", { count: ahead.length }) : t("aheadNone")}</CardDescription>
      </CardHeader>
      {ahead.length > 0 && (
        <CardContent>
          <ul className="flex flex-col divide-y">
            {ahead.slice(0, SHOWN).map((result) => {
              const named = answersNaming(result, rival.id);
              return (
                <li key={result.prompt.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={answersHref(result.prompt.id)}
                    className="line-clamp-2 min-w-0 flex-1 text-sm text-pretty underline-offset-4 hover:underline"
                  >
                    <span className="mr-1.5 align-[1px] text-[0.65rem] font-semibold text-muted-foreground uppercase">
                      {result.prompt.language}
                    </span>
                    {result.prompt.text}
                  </Link>
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                    <span aria-hidden>
                      {named}/{result.answers.length}
                    </span>
                    <span className="sr-only">{t("namedIn", { count: named, total: result.answers.length })}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {ahead.length > SHOWN && (
            <p className="mt-3 text-xs text-muted-foreground">{t("more", { count: ahead.length - SHOWN })}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
