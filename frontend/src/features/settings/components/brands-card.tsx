import { useTranslations } from "next-intl";
import { Panel } from "@/shared/components/panel";
import { answersNaming, seriesBrands } from "@/shared/helpers/scores";
import type { Project, PromptResult } from "@/shared/types/api";

/**
 * The tracked brands: each with its color in the charts, the spellings ChatGPT's answers are searched
 * for, its website, and how many answers of the latest run name it. Read-only until settings can be edited.
 */
export function BrandsCard({ project, results }: { project: Project; results: PromptResult[] }) {
  const t = useTranslations("Settings.brands");
  const colors = new Map(seriesBrands(project).map((brand) => [brand.id, brand.color]));
  const rows = [project.brand, ...project.competitors];
  const mentions = (brandId: string) => results.reduce((sum, result) => sum + answersNaming(result, brandId), 0);

  return (
    <Panel title={t("title", { count: rows.length })} hint={t("hint")} actions={<span className="text-xs text-muted-foreground">{t("soon")}</span>}>
      <div className="@container">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground [&>th]:py-2.5 [&>th]:font-medium">
              <th scope="col" className="w-12 pl-4">
                <span className="sr-only">{t("color")}</span>
              </th>
              <th scope="col" className="px-2">
                {t("name")}
              </th>
              <th scope="col" className="hidden px-3 @2xl:table-cell">
                {t("aliases")}
              </th>
              <th scope="col" className="hidden w-44 px-3 @lg:table-cell">
                {t("domain")}
              </th>
              <th scope="col" className="w-24 pr-4 pl-3 text-right">
                {t("mentions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((brand) => (
              <tr key={brand.id}>
                <td className="py-3 pl-4">
                  <span aria-hidden className="block size-3.5 rounded" style={{ background: colors.get(brand.id) }} />
                </td>
                <th scope="row" className="px-2 py-3 text-left font-medium">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{brand.name}</span>
                    {brand.id === project.brand.id && (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{t("you")}</span>
                    )}
                  </span>
                  <span className="block truncate text-xs font-normal text-muted-foreground @lg:hidden">{brand.domain}</span>
                </th>
                <td className="hidden px-3 py-3 @2xl:table-cell">
                  {brand.aliases.length ? (
                    <span className="line-clamp-2 text-muted-foreground">{brand.aliases.join(", ")}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="hidden truncate px-3 py-3 text-muted-foreground @lg:table-cell">{brand.domain}</td>
                <td className="py-3 pr-4 pl-3 text-right font-medium tabular-nums">{results.length ? mentions(brand.id) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
