import { useMessages, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { Link } from "@/i18n/navigation";
import { labelFor } from "@/shared/helpers/labels";
import { cn } from "@/shared/helpers/utils";
import type { TopicRanking } from "../helpers/topics";

/**
 * Who leads each topic: one row per topic, the tracked brands in the order ChatGPT names them most on
 * that topic's questions. The client's place stands out; a brand never named there is left out. A topic
 * opens its questions; a brand's cell says on hover in how many of the topic's answers it is named.
 */
export function TopicRankings({
  rankings,
  places,
  questionsHref,
}: {
  rankings: TopicRanking[];
  /** How many places the table has: one per tracked brand. */
  places: number;
  /** The Questions page narrowed to a topic. */
  questionsHref: (topic: string) => string;
}) {
  const t = useTranslations("Competitors.topics");
  const messages = useMessages();
  const columns = Array.from({ length: places }, (_, index) => index + 1);

  return (
    <Panel title={t("title")} hint={t("hint")}>
      {/* relative: screen-reader labels inside are positioned, and must scroll with the table too */}
      <div className="relative w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[36rem] table-fixed text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">
              <th scope="col" className="w-40 pl-4">
                <Hint text={t("topicHint")}>{t("topic")}</Hint>
              </th>
              {columns.map((place) => (
                <th key={place} scope="col" className="px-1.5 text-center">
                  <Hint text={t("placeHint", { place })}>#{place}</Hint>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankings.map(({ topic, answers, ranked }) => (
              <tr key={topic}>
                <th scope="row" className="py-1.5 pl-4 text-left font-normal">
                  <Link href={questionsHref(topic)} className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
                    {labelFor(messages.Topics, topic)}
                  </Link>
                </th>
                {columns.map((place) => {
                  const entry = ranked[place - 1];
                  return (
                    <td key={place} className="px-1.5 py-1.5">
                      {entry ? (
                        <Hint
                          text={t("cell", { brand: entry.brand.name, count: entry.named, total: answers })}
                          focusable={false}
                          className={cn(
                            "flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium",
                            entry.brand.isYou ? "bg-you-soft/70 ring-1 ring-you/40" : "bg-muted",
                          )}
                        >
                          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: entry.brand.color }} />
                          <span className="truncate">{entry.brand.name}</span>
                          {entry.brand.isYou && <span className="shrink-0 font-normal text-muted-foreground">{t("you")}</span>}
                        </Hint>
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
