import { useLocale, useTranslations } from "next-intl";
import { Panel } from "@/shared/components/panel";
import { formatPercent } from "@/shared/helpers/numbers";
import { sourceTypeShares } from "@/shared/helpers/scores";
import type { Source } from "@/shared/types/api";
import { BarRows } from "./bar-rows";
import { SourceTypeDot } from "./source-type-dot";

/** The large view names this many sites under each kind. */
const SITES_SHOWN = 3;

/**
 * What kinds of sites ChatGPT cites, as shares of all citations, largest first, each kind in its color.
 * `expandable` adds ⤢: the same bars in a large window, each kind with what it is, how many citations
 * it got and its most cited sites, plus the leading kind and the client's own share in words.
 */
export function SourceTypesChart({
  sources,
  expandable = false,
  className,
}: {
  sources: Source[];
  expandable?: boolean;
  className?: string;
}) {
  const t = useTranslations("SourceTypes");
  const locale = useLocale();
  const shares = sourceTypeShares(sources).sort((a, b) => b.share - a.share);
  const max = shares[0]?.share ?? 1;
  const total = sources.reduce((sum, source) => sum + source.count, 0);
  const lead = shares[0];
  const own = shares.find(({ type }) => type === "own");

  const rows = shares.map(({ type, share }) => ({
    key: type,
    size: share / max,
    value: formatPercent(share, locale),
    label: (
      <>
        <SourceTypeDot type={type} className="size-2.5" />
        <span className="truncate">{t(type)}</span>
      </>
    ),
  }));

  return (
    <Panel
      title={t("title")}
      hint={t("description")}
      className={className}
      actions={<span className="text-sm text-muted-foreground tabular-nums">{t("total", { count: total })}</span>}
      expand={
        expandable && lead
          ? {
              takeaway: (
                <>
                  <p>{t("takeaway", { type: t(lead.type), share: formatPercent(lead.share, locale) })}</p>
                  {lead.type !== "own" && <p>{own ? t("takeawayOwn", { share: formatPercent(own.share, locale) }) : t("takeawayNoOwn")}</p>}
                </>
              ),
              guide: <p>{t("guide")}</p>,
              content: (
                <BarRows
                  className="gap-2.5 p-3 sm:px-4"
                  rows={rows.map((row) => {
                    const sites = sources.filter((source) => source.type === row.key).sort((a, b) => b.count - a.count);
                    return {
                      ...row,
                      detail: (
                        <>
                          {t("count", { count: sites.reduce((sum, source) => sum + source.count, 0) })}. {t(`about.${row.key}`)}{" "}
                          {t("top", {
                            sites: sites
                              .slice(0, SITES_SHOWN)
                              .map((source) => source.domain)
                              .join(", "),
                          })}
                        </>
                      ),
                    };
                  })}
                />
              ),
            }
          : undefined
      }
    >
      <BarRows className="p-3" rows={rows} />
    </Panel>
  );
}
