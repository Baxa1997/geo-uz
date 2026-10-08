"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import Markdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type { Answer, Brand, PromptResult } from "@/shared/types/api";
import { unwrapCitations } from "@/shared/helpers/citations";
import { rehypeHighlightBrands } from "@/shared/helpers/highlight-brands";
import { ToneIcon } from "./tone-icon";

const YOU_MARK = "rounded-sm bg-you-soft px-0.5 text-foreground ring-1 ring-you/50";
const RIVAL_MARK = "rounded-sm bg-rival-soft px-0.5 text-foreground";

const components: Components = {
  // Citations: small bordered chips with the site's name, as ChatGPT shows them
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs font-normal whitespace-nowrap text-muted-foreground no-underline transition-colors hover:text-foreground"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="relative overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

/** One answer as ChatGPT wrote it, tracked brand names highlighted (the client's in its own color). */
export function AnswerMarkdown({ answer, brands, youId }: { answer: Answer; brands: Brand[]; youId: string }) {
  const rehypePlugins = useMemo<Options["rehypePlugins"]>(
    () => [
      [
        rehypeHighlightBrands,
        { brands, classFor: (id: string) => (id === youId ? YOU_MARK : RIVAL_MARK) },
      ],
    ],
    [brands, youId],
  );
  return (
    <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:text-base prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5 prose-table:my-2 prose-table:text-xs">
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
        {unwrapCitations(answer.text)}
      </Markdown>
    </div>
  );
}

/** The sampled answers to one prompt, with tracked brand names highlighted. */
export function AnswerViewer({
  result,
  brands,
  youId,
}: {
  result: PromptResult;
  brands: Brand[];
  youId: string;
}) {
  const t = useTranslations("Answer");
  const first = result.answers[0];
  if (!first) return null;

  return (
    <Tabs defaultValue={first.sample}>
      <TabsList className="w-full">
        {result.answers.map((answer) => (
          <TabsTrigger key={answer.sample} value={answer.sample}>
            {t("sample", { n: answer.sample })}
          </TabsTrigger>
        ))}
      </TabsList>
      {result.answers.map((answer) => (
        <TabsContent key={answer.sample} value={answer.sample} className="flex flex-col gap-3 pt-1">
          <AnswerMentions answer={answer} brands={brands} youId={youId} />
          <AnswerMarkdown answer={answer} brands={brands} youId={youId} />
          {answer.citations.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("sources")}: {[...new Set(answer.citations.map((c) => c.domain))].join(" · ")}
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** The tracked brands an answer names, in the order it names them, each with its tone. */
export function AnswerMentions({ answer, brands, youId }: { answer: Answer; brands: Brand[]; youId: string }) {
  const t = useTranslations("Answer");
  if (answer.mentions.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("none")}</p>;
  }
  const mentions = [...answer.mentions].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">{t("named")}</p>
      <ol className="flex flex-wrap gap-1.5">
        {mentions.map((mention) => {
          const name = brands.find((b) => b.id === mention.brandId)?.name ?? mention.brandId;
          return (
            <li
              key={mention.brandId}
              className={
                mention.brandId === youId
                  ? "inline-flex items-center gap-1 rounded-md bg-you-soft px-1.5 py-0.5 text-xs ring-1 ring-you/40"
                  : "inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs"
              }
            >
              <span className="text-muted-foreground tabular-nums">#{mention.position}</span>
              {name}
              <ToneIcon tone={mention.tone} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
