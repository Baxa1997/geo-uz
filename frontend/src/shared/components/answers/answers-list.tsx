"use client";

import { useLocale, useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import { ChatDialog } from "@/shared/components/answers/chat-dialog";
import { EngineIcon } from "@/shared/components/engine-icon";
import { Hint } from "@/shared/components/hint";
import { LinkRow } from "@/shared/components/link-row";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { engineOf } from "@/shared/constants";
import { answerExcerpt } from "@/shared/helpers/answer-excerpt";
import type { Project, Prompt, ReportMethod } from "@/shared/types/api";
import type { AnswerRow, SeriesBrand } from "@/shared/types/scores";

const PAGE = 20;
const SOURCES_SHOWN = 3;

/**
 * Answers as table rows, the answers to one question together under the question (written once, and
 * opening the question's page): how the answer opens, the brands it names, the sites it cites, the
 * client's place and tone. A click anywhere on a row opens the answer like a chat, with Previous and Next
 * through the rows given. The date of the check is the same for every row, so it is not a column.
 * Headings and marks explain themselves on hover. Used by the Answers page (every answer, under its
 * filters) and by a cited site's page (the answers that cite it). `initialPromptId` opens that question's
 * first answer.
 */
export function AnswersList({
  rows,
  brands,
  project,
  method,
  questionHref,
  initialPromptId,
}: {
  rows: AnswerRow[];
  brands: SeriesBrand[];
  project: Project;
  method: Pick<ReportMethod, "engine" | "collectedAt">;
  questionHref: (prompt: Prompt) => string;
  initialPromptId?: string;
}) {
  const t = useTranslations("AnswersPage.table");
  const locale = useLocale();
  const youId = project.brand.id;
  const first = rows.findIndex((row) => row.result.prompt.id === initialPromptId);
  // The answer a link opens may lie past the first rows: then the list reaches it
  const [limit, setLimit] = useState(first >= PAGE ? first + 1 : PAGE);
  const [open, setOpen] = useState<number | null>(first >= 0 ? first : null);
  const byId = new Map(brands.map((item) => [item.id, item]));
  const shown = rows.slice(0, limit);
  const engine = engineOf(method.engine);

  return (
    <div className="@container">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">
            <th scope="col" className="px-4">
              <Hint text={t("hints.answer")}>{t("columns.answer")}</Hint>
            </th>
            <th scope="col" className="hidden w-36 px-3 @3xl:table-cell">
              <Hint text={t("hints.brands")}>{t("columns.brands")}</Hint>
            </th>
            <th scope="col" className="hidden w-28 px-3 @2xl:table-cell">
              <Hint text={t("hints.sources")}>{t("columns.sources")}</Hint>
            </th>
            <th scope="col" className="w-16 px-2 @md:w-20 @md:px-3">
              <Hint text={t("hints.position")}>{t("columns.position")}</Hint>
            </th>
            <th scope="col" className="hidden w-20 pr-4 pl-3 @lg:table-cell">
              <Hint text={t("hints.tone")}>{t("columns.tone")}</Hint>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {shown.map((row, index) => {
            const { result, answer } = row;
            // The question is written once, over its answers
            const heads = shown[index - 1]?.result.prompt.id !== result.prompt.id;
            const own = answer.mentions.find((mention) => mention.brandId === youId);
            const named = [...answer.mentions].sort((a, b) => a.position - b.position).flatMap((mention) => byId.get(mention.brandId) ?? []);
            const domains = [...new Set(answer.citations.map((citation) => citation.domain))];
            return (
              <Fragment key={`${result.prompt.id}:${answer.sample}`}>
                {heads && (
                  <LinkRow href={questionHref(result.prompt)} className="bg-muted/40 transition-colors hover:bg-muted/70">
                    {/*
                      The question spans the two columns every width shows; one empty cell follows for each
                      column a wider card adds. A span of all five would add columns to a narrow card, where
                      three are hidden, and squeeze the answers into a sliver.
                    */}
                    <th scope="colgroup" colSpan={2} className="px-4 py-2 text-left font-medium">
                      <span className="mr-1.5 text-[0.65rem] font-semibold text-muted-foreground uppercase">{result.prompt.language}</span>
                      <Link href={questionHref(result.prompt)} lang={result.prompt.language} className="text-pretty underline-offset-4 outline-none hover:underline focus-visible:underline">
                        {result.prompt.text}
                      </Link>
                    </th>
                    <td className="hidden @lg:table-cell" />
                    <td className="hidden @2xl:table-cell" />
                    <td className="hidden @3xl:table-cell" />
                  </LinkRow>
                )}
                <tr
                  // The first answer is what a page's guided tour points at
                  data-tour={index === 0 ? "answer" : undefined}
                  // The whole row opens the answer; its button stays the way in for the keyboard
                  onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest("a, button")) return;
                    setOpen(index);
                  }}
                  className="cursor-pointer align-top transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`${t("sample", { n: answer.sample })}: ${result.prompt.text}`}
                      onClick={() => setOpen(index)}
                      className="flex w-full min-w-0 items-start gap-2.5 text-left outline-none focus-visible:underline"
                    >
                      <EngineIcon engine={engine} className="mt-0.5 text-muted-foreground" />
                      <span lang={result.prompt.language} className="line-clamp-2 min-w-0 text-pretty text-muted-foreground">
                        <span lang={locale} className="font-medium text-foreground">
                          {t("sample", { n: answer.sample })}
                        </span>{" "}
                        · {answerExcerpt(answer.text)}
                      </span>
                    </button>
                  </td>
                  <td className="hidden px-3 py-2.5 @3xl:table-cell">
                    {named.length ? (
                      <ul className="flex flex-wrap gap-1">
                        {named.map((item) => (
                          <li key={item.id} className="flex">
                            <Hint
                              text={item.isYou ? t("you", { name: item.name }) : item.name}
                              focusable={false}
                              described={false}
                              className="h-6 items-center gap-1 rounded-md bg-muted px-1.5 text-[0.7rem] font-semibold"
                            >
                              <span aria-hidden className="size-2 rounded-full" style={{ background: item.color }} />
                              <span aria-hidden>{item.name.charAt(0).toUpperCase()}</span>
                              <span className="sr-only">{item.name}</span>
                            </Hint>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Hint text={t("noBrand")} focusable={false} className="text-muted-foreground">
                        —
                      </Hint>
                    )}
                  </td>
                  <td className="hidden px-3 py-2.5 @2xl:table-cell">
                    {domains.length ? (
                      <span className="flex items-center gap-1">
                        {domains.slice(0, SOURCES_SHOWN).map((domain) => (
                          <Hint
                            key={domain}
                            text={domain}
                            focusable={false}
                            described={false}
                            className="size-6 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground uppercase ring-2 ring-card"
                          >
                            <span aria-hidden>{domain.charAt(0)}</span>
                          </Hint>
                        ))}
                        {domains.length > SOURCES_SHOWN && (
                          <Hint text={domains.slice(SOURCES_SHOWN).join(", ")} focusable={false} described={false} className="pl-0.5 text-xs text-muted-foreground">
                            <span aria-hidden>+{domains.length - SOURCES_SHOWN}</span>
                          </Hint>
                        )}
                        <span className="sr-only">{domains.join(", ")}</span>
                      </span>
                    ) : (
                      <Hint text={t("noSources")} focusable={false} className="text-muted-foreground">
                        —
                      </Hint>
                    )}
                  </td>
                  <td className="px-2 py-2.5 font-medium tabular-nums @md:px-3">
                    {own ? (
                      <>
                        <span aria-hidden className="font-normal text-muted-foreground">
                          #
                        </span>
                        {own.position}
                      </>
                    ) : (
                      <Hint text={t("notNamed")} focusable={false} described={false} className="font-normal text-muted-foreground">
                        <span aria-hidden>—</span>
                        <span className="sr-only">{t("notNamed")}</span>
                      </Hint>
                    )}
                  </td>
                  <td className="hidden py-2.5 pr-4 pl-3 @lg:table-cell">
                    {own ? <ToneIcon tone={own.tone} className="size-4" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {rows.length > limit && (
        <div className="border-t p-3 text-center">
          <Button variant="ghost" onClick={() => setLimit((current) => current + PAGE)}>
            {t("more", { count: Math.min(PAGE, rows.length - limit) })}
          </Button>
        </div>
      )}

      <ChatDialog
        rows={rows}
        index={open !== null && open < rows.length ? open : null}
        project={project}
        collectedAt={method.collectedAt}
        engine={method.engine}
        questionHref={questionHref}
        onIndex={(index) => {
          setOpen(index);
          // The row being read stays in the list, even past the ones shown
          if (index >= limit) setLimit(index + 1);
        }}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
