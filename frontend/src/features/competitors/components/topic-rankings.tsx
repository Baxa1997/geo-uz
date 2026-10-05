import { useMessages, useTranslations } from "next-intl";
import { Panel } from "@/shared/components/panel";
import { labelFor } from "@/shared/helpers/labels";
import { answersNaming } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { PromptResult } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/**
 * Who leads each topic: one row per topic, the tracked brands in the order ChatGPT names them most on
 * that topic's questions. The client's place stands out; a brand never named there is left out.
 */
export function TopicRankings({ results, brands }: { results: PromptResult[]; brands: SeriesBrand[] }) {
  const t = useTranslations("Competitors.topics");
  const messages = useMessages();
  const topics = [...new Set(results.map((result) => result.prompt.topic))];
  const rows = topics.map((topic) => {
    const inTopic = results.filter((result) => result.prompt.topic === topic);
    const total = inTopic.reduce((sum, result) => sum + result.answers.length, 0);
    const ranked = brands
      .map((brand) => ({ brand, share: total ? inTopic.reduce((sum, result) => sum + answersNaming(result, brand.id), 0) / total : 0 }))
      .filter(({ share }) => share > 0)
      .sort((a, b) => b.share - a.share);
    return { topic, ranked };
  });
  const places = brands.map((_, index) => index + 1);

  return (
    <Panel title={t("title")} hint={t("hint")}>
      {/* relative: screen-reader labels inside are positioned, and must scroll with the table too */}
      <div className="relative w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[36rem] table-fixed text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">
              <th scope="col" className="w-40 pl-4">
                {t("topic")}
              </th>
              {places.map((place) => (
                <th key={place} scope="col" className="px-1.5 text-center">
                  #{place}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ topic, ranked }) => (
              <tr key={topic}>
                <th scope="row" className="py-1.5 pl-4 text-left font-normal text-muted-foreground">
                  {labelFor(messages.Topics, topic)}
                </th>
                {places.map((place) => {
                  const entry = ranked[place - 1];
                  return (
                    <td key={place} className="px-1.5 py-1.5">
                      {entry ? (
                        <span
                          className={cn(
                            "flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium",
                            entry.brand.isYou ? "bg-you-soft/70 ring-1 ring-you/40" : "bg-muted",
                          )}
                        >
                          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: entry.brand.color }} />
                          <span className="truncate">{entry.brand.name}</span>
                          {entry.brand.isYou && <span className="shrink-0 font-normal text-muted-foreground">{t("you")}</span>}
                        </span>
                      ) : (
                        <span className="flex h-9 items-center justify-center text-muted-foreground">
                          <span aria-hidden>—</span>
                          <span className="sr-only">{t("empty")}</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
