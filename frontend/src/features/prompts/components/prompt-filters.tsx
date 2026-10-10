"use client";

import { CalendarDays, ListFilter } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilterMenu } from "@/shared/components/filter-menu";
import { BrandLogo } from "@/shared/components/scores/brand-logo";
import { SourceTypeDot } from "@/shared/components/scores/source-type-dot";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import type { SourceType } from "@/shared/types/api";
import type { SeriesBrand } from "@/shared/types/scores";
import { PERIODS, type Period } from "../helpers/prompt-filters";

/**
 * The question page's filters, in the strip under its title as Peec's ("Last 7 days", "All filters"): the
 * checks to show (the last 4 or 8 weeks, or all of them), then in "All filters" the competitors to compare
 * with (the client always stays) and the kinds of sites to count. Everything is kept in the address
 * (`?period=`, `?brands=`, `?kinds=`), so the server draws the page filtered and it can be linked to.
 */
export function PromptFilters({ brands, kinds }: { brands: SeriesBrand[]; /** The kinds of sites this question's answers cite. */ kinds: SourceType[] }) {
  const t = useTranslations("PromptPage.filters");
  const types = useTranslations("SourceTypes");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const period: Period = PERIODS.find((candidate) => candidate === params.get("period")) ?? "all";
  const list = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  const shownBrands = list("brands");
  const shownKinds = list("kinds");
  const competitors = brands.filter((brand) => !brand.isYou);
  const active = shownBrands.length + shownKinds.length;

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }
  /** Turns one value of a list filter on or off; all on is the same as none picked. */
  function toggle(key: "brands" | "kinds", value: string, all: string[]) {
    const current = list(key).length > 0 ? list(key) : all;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    update({ [key]: next.length === 0 || next.length === all.length ? null : next.join(",") });
  }
  const isOn = (key: "brands" | "kinds", value: string) => list(key).length === 0 || list(key).includes(value);

  return (
    <div data-tour="filters" className="flex flex-wrap items-center gap-2">
      <FilterMenu
        icon={CalendarDays}
        label={t("periodLabel")}
        value={period}
        options={PERIODS.map((option) => ({ value: option, label: t(`periods.${option}`) }))}
        onChange={(value) => update({ period: value === "all" ? null : value })}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm shadow-xs transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-muted/60",
            active > 0 && "border-foreground/30 font-medium",
          )}
        >
          <ListFilter aria-hidden className="size-4 text-muted-foreground" />
          {t("all")}
          {active > 0 && <span className="rounded-full bg-foreground px-1.5 text-[0.65rem] font-semibold text-background tabular-nums">{active}</span>}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {competitors.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("brands")}</DropdownMenuLabel>
              {competitors.map((brand) => (
                <DropdownMenuCheckboxItem
                  key={brand.id}
                  checked={isOn("brands", brand.id)}
                  onCheckedChange={() => toggle("brands", brand.id, competitors.map((competitor) => competitor.id))}
                  closeOnClick={false}
                >
                  <BrandLogo name={brand.name} logo={brand.logo} className="size-4" />
                  {brand.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          )}
          {kinds.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("kinds")}</DropdownMenuLabel>
                {kinds.map((kind) => (
                  <DropdownMenuCheckboxItem key={kind} checked={isOn("kinds", kind)} onCheckedChange={() => toggle("kinds", kind, kinds)} closeOnClick={false}>
                    <SourceTypeDot type={kind} />
                    {types(kind)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          {active > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => update({ brands: null, kinds: null })}>{t("reset")}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
