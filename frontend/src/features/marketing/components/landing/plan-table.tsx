import { Check, Minus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { PLAN_TABLE, PRICING, type PlanCell } from "../../constants";

/** Every plan against every feature, grouped the way the product works: coverage, discover, measure, act, report. */
export function PlanTable() {
  const t = useTranslations("Landing.pricing");
  const format = useFormatter();

  function cell(value: PlanCell) {
    if (value === true) {
      return (
        <>
          <Check aria-hidden className="mx-auto size-4" />
          <span className="sr-only">{t("compare.yes")}</span>
        </>
      );
    }
    if (value === false) {
      return (
        <>
          <Minus aria-hidden className="mx-auto size-4 text-muted-foreground/60" />
          <span className="sr-only">{t("compare.no")}</span>
        </>
      );
    }
    if (value === "soon") {
      return <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap">{t("compare.soon")}</span>;
    }
    return typeof value === "number" ? format.number(value) : t(`compare.values.${value.value}`);
  }

  return (
    <div data-reveal className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold tracking-tight">{t("compare.title")}</h3>
      {/* Five columns don't fit a phone: the table scrolls sideways inside its frame */}
      <div className="relative overflow-x-auto rounded-2xl border bg-background" tabIndex={0} role="region" aria-label={t("compare.title")}>
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="w-[32%] p-4 font-medium text-muted-foreground">
                {t("compare.feature")}
              </th>
              {PRICING.map(({ key, price, period }) => (
                <th key={key} scope="col" className="p-4 text-center font-medium">
                  {t(`tiers.${key}.name`)}
                  <span className="block text-xs font-normal whitespace-nowrap text-muted-foreground">
                    {t("price", { amount: price })} {period && t(period)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {PLAN_TABLE.map(({ group, rows }) => (
            <tbody key={group} className="divide-y">
              <tr className="bg-muted/60">
                <th scope="colgroup" colSpan={PRICING.length + 1} className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  {t(`compare.groups.${group}`)}
                </th>
              </tr>
              {rows.map(({ key, cells }) => (
                <tr key={key}>
                  <th scope="row" className="p-4 text-left font-normal">
                    {t(`compare.rows.${key}`)}
                  </th>
                  {cells.map((value, index) => (
                    <td key={PRICING[index]?.key ?? index} className="border-l p-4 text-center tabular-nums">
                      {cell(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
