import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { BarRows } from "@/shared/components/scores/bar-rows";
import type { PromptResult } from "@/shared/types/api";

/**
 * What ChatGPT searched the web for before answering one question (Peec's "query fanouts"): each distinct
 * search with the number of the question's answers that ran it, the most common first. The bars are drawn
 * against all the answers: a search behind 1 answer of 3 fills a third. Peec's "common terms" (word pairs
 * counted across the searches) is left out: the searches themselves say it plainly.
 */
export function PromptSearches({ result, className }: { result: PromptResult; className?: string }) {
  const t = useTranslations("PromptPage.searches");
  const total = result.answers.length;
  const searched = result.answers.filter((answer) => answer.searches.length > 0).length;
  const counts = new Map<string, number>();
  for (const answer of result.answers) {
    for (const query of new Set(answer.searches)) counts.set(query, (counts.get(query) ?? 0) + 1);
  }
  const rows = [...counts].map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count);

  return (
    <Panel
      title={t("title")}
      hint={t("hint")}
      className={className}
      actions={<span className="text-sm text-muted-foreground tabular-nums">{t("used", { count: searched, total })}</span>}
    >
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <BarRows
          className="p-3"
          rows={rows.map(({ query, count }) => ({
            key: query,
            size: count / total,
            value: `${count}/${total}`,
            label: (
              <Hint text={t("row", { count, total })} focusable={false} className="min-w-0">
                <span className="truncate">{query}</span>
              </Hint>
            ),
          }))}
        />
      )}
    </Panel>
  );
}
