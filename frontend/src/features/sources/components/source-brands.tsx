import { useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { BarRows } from "@/shared/components/scores/bar-rows";
import type { Answer } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";

/**
 * Who ChatGPT names when it relies on this site: for every tracked brand, in how many of the answers
 * citing the site it is named (Peec shows this as a column of brand marks). It stands beside the page
 * movers, where Peec has its URL types. A bar is drawn against all the citing answers, counted in the
 * header, so a full bar is "named every time"; the client's row is marked. It tells an owner whether a
 * site works for them or for a competitor.
 */
export function SourceBrands({ answers, brands, className }: { answers: Answer[]; brands: SeriesBrand[]; className?: string }) {
  const t = useTranslations("SourcePage.brands");
  const chart = useTranslations("MetricChart");
  const rows = brands
    .map((brand) => ({ brand, count: answers.filter((answer) => answer.mentions.some((mention) => mention.brandId === brand.id)).length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || Number(b.brand.isYou) - Number(a.brand.isYou));

  return (
    <Panel
      title={t("title")}
      hint={t("hint")}
      className={className}
      actions={<span className="text-sm text-muted-foreground tabular-nums">{t("total", { count: answers.length })}</span>}
    >
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-pretty text-muted-foreground">{t("empty")}</p>
      ) : (
        <BarRows
          className="p-3"
          rows={rows.map(({ brand, count }) => ({
            key: brand.id,
            size: count / Math.max(1, answers.length),
            value: String(count),
            label: (
              <Hint text={t("count", { count, total: answers.length })} focusable={false} className="min-w-0 items-center gap-2">
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: brand.color }} />
                <span className={brand.isYou ? "truncate font-semibold" : "truncate font-medium"}>{brand.isYou ? chart("you", { name: brand.name }) : brand.name}</span>
              </Hint>
            ),
          }))}
        />
      )}
    </Panel>
  );
}
