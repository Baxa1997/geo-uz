import { CircleCheck, CircleX } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";
import { Panel } from "@/shared/components/panel";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatShortDate } from "@/shared/helpers/dates";
import type { PromptResult, WrongFact } from "@/shared/types/api";

/**
 * What ChatGPT gets wrong about the brand, one row each: the claim, the truth, the question it came up
 * in (opens its answers), and when it was first found. The fixes are planned on the actions page.
 */
export function WrongFactsTable({
  facts,
  prompts,
  answersHref,
  actionsHref,
}: {
  facts: WrongFact[];
  prompts: PromptResult[];
  answersHref: (promptId: string) => string;
  actionsHref: string;
}) {
  const t = useTranslations("WrongFactsPage");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const promptText = (id: string) => prompts.find((result) => result.prompt.id === id)?.prompt.text;

  return (
    <Panel title={t("table.title")} hint={t("table.hint")} actions={facts.length > 0 && <ArrowLink href={actionsHref}>{t("fix")}</ArrowLink>}>
      {facts.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="@container">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">
                <th scope="col" className="pl-4">
                  {t("table.says")}
                </th>
                <th scope="col" className="hidden px-3 @2xl:table-cell">
                  {t("table.correct")}
                </th>
                <th scope="col" className="hidden w-64 px-3 @4xl:table-cell">
                  {t("table.question")}
                </th>
                <th scope="col" className="hidden w-24 pr-4 pl-3 @lg:table-cell">
                  {t("table.found")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {facts.map((fact) => {
                const question = promptText(fact.promptId);
                return (
                  <tr key={`${fact.promptId}-${fact.claim}`} className="align-top transition-colors hover:bg-muted/30">
                    <td className="py-3 pl-4">
                      <p className="flex items-start gap-2 font-medium text-pretty">
                        <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-negative" />
                        <span>
                          <span className="sr-only">{t("table.says")}: </span>
                          {fact.claim}
                        </span>
                      </p>
                      {/* Narrow panel: the truth and the question move under the claim */}
                      <p className="mt-2 flex items-start gap-2 text-pretty @2xl:hidden">
                        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
                        <span>
                          <span className="sr-only">{t("table.correct")}: </span>
                          {fact.correct}
                        </span>
                      </p>
                      {question && (
                        <Link
                          href={answersHref(fact.promptId)}
                          className="mt-2 block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline @4xl:hidden"
                        >
                          {t("table.question")}: {question}
                        </Link>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 @2xl:table-cell">
                      <p className="flex items-start gap-2 text-pretty">
                        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-positive" />
                        {fact.correct}
                      </p>
                    </td>
                    <td className="hidden px-3 py-3 @4xl:table-cell">
                      {question && (
                        <Link href={answersHref(fact.promptId)} className="text-pretty underline-offset-4 hover:underline">
                          {question}
                        </Link>
                      )}
                    </td>
                    <td className="hidden py-3 pr-4 pl-3 text-muted-foreground @lg:table-cell">
                      {formatShortDate(fact.foundAt, locale, timeZone)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
