"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChatDialog } from "@/shared/components/answers/chat-dialog";
import { ArrowLink } from "@/shared/components/arrow-link";
import { EngineIcon } from "@/shared/components/engine-icon";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { ToneIcon } from "@/shared/components/scores/tone-icon";
import { answerExcerpt } from "@/shared/helpers/answer-excerpt";
import { cn } from "@/shared/helpers/utils";
import type { Project, PromptResult } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/**
 * The answers ChatGPT gave to one question in its latest check, one row each: how the answer opens, the
 * tracked brands it names in the order it names them, and the client's place and tone. A row opens the
 * answer like a chat, with Previous and Next through this question's answers.
 */
export function PromptAnswers({
  result,
  project,
  brands,
  collectedAt,
  allHref,
}: {
  result: PromptResult;
  project: Project;
  brands: SeriesBrand[];
  collectedAt: string;
  /** The page with every question's answers; left out for an archived question, which isn't there. */
  allHref?: string;
}) {
  const t = useTranslations("PromptPage.answers");
  const hints = useTranslations("PromptPage.hints");
  const sidebar = useTranslations("Sidebar");
  const [open, setOpen] = useState<number | null>(null);
  const rows = result.answers.map((answer) => ({ result, answer }));
  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  const youId = project.brand.id;

  return (
    <Panel
      title={t("title")}
      hint={t("hint", { samples: result.answers.length })}
      actions={allHref && <ArrowLink href={allHref}>{sidebar("answers")}</ArrowLink>}
    >
      <ul className="divide-y">
        {rows.map(({ answer }, index) => {
          const own = answer.mentions.find((mention) => mention.brandId === youId);
          const named = [...answer.mentions].sort((a, b) => a.position - b.position).flatMap((mention) => byId.get(mention.brandId) ?? []);
          return (
            <li key={answer.sample}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpen(index)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
              >
                <span className="flex min-w-0 flex-1 basis-72 items-start gap-2.5">
                  <EngineIcon engine="chatgpt" className="mt-0.5 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{t("sample", { n: answer.sample })}</span>
                    <span lang={result.prompt.language} className="line-clamp-2 text-pretty text-muted-foreground">
                      {answerExcerpt(answer.text)}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {named.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {named.map((brand) => (
                        <span
                          key={brand.id}
                          className={cn(
                            "inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium",
                            brand.isYou ? "bg-you-soft/60 ring-1 ring-you/30" : "bg-muted",
                          )}
                        >
                          <span aria-hidden className="size-2 rounded-full" style={{ background: brand.color }} />
                          {brand.name}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("nobody")}</span>
                  )}
                  <span className="flex w-16 items-center justify-end gap-1.5 font-medium tabular-nums">
                    {own ? (
                      <>
                        <ToneIcon tone={own.tone} className="size-4" />
                        {/* Inside the row's button: reached by the mouse and a tap, the row keeps the focus */}
                        <Hint text={hints("place")} focusable={false} described={false}>
                          <span aria-hidden className="font-normal text-muted-foreground">
                            #
                          </span>
                          {own.position}
                          <span className="sr-only"> {t("yourPlace")}</span>
                        </Hint>
                      </>
                    ) : (
                      <Hint text={hints("notNamed")} focusable={false} described={false} className="text-xs font-normal text-muted-foreground">
                        {t("notNamed")}
                      </Hint>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <ChatDialog rows={rows} index={open} project={project} collectedAt={collectedAt} onIndex={setOpen} onClose={() => setOpen(null)} />
    </Panel>
  );
}
