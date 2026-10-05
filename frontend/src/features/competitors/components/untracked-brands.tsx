import { Radar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Panel } from "@/shared/components/panel";
import { formatPercent } from "@/shared/helpers/numbers";
import type { UntrackedBrand } from "@/shared/types/api";

const SHOWN = 8;

/**
 * Brands ChatGPT names in the answers that the project doesn't track, most named first, as cards with
 * how often each comes up: likely competitors to add. Adding them comes with project settings.
 */
export function UntrackedBrands({ brands, totalAnswers }: { brands: UntrackedBrand[]; totalAnswers: number }) {
  const t = useTranslations("Competitors");
  const locale = useLocale();

  return (
    <Panel
      title={t("untrackedTitle", { count: brands.length })}
      hint={t("untrackedText")}
      actions={<span className="text-xs text-muted-foreground">{t("untrackedSoon")}</span>}
    >
      <div className="@container">
      <ul className="grid gap-2 p-3 @lg:grid-cols-2 @4xl:grid-cols-4">
        {brands.slice(0, SHOWN).map((brand) => (
          <li key={brand.name} className="flex items-center gap-3 rounded-xl border p-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
              {brand.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{brand.name}</span>
              <span className="text-xs text-muted-foreground">
                {t("untrackedAnswers", { count: brand.answers, total: totalAnswers })} ·{" "}
                {formatPercent(totalAnswers ? brand.answers / totalAnswers : 0, locale)}
              </span>
            </span>
            <Radar aria-hidden className="ml-auto size-4 shrink-0 text-you" />
          </li>
        ))}
      </ul>
      </div>
    </Panel>
  );
}
