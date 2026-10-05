import { useLocale, useTranslations } from "next-intl";
import { Panel } from "@/shared/components/panel";
import { formatPercent } from "@/shared/helpers/numbers";
import { sourceTypeShares } from "@/shared/helpers/scores";
import type { Source } from "@/shared/types/api";
import { BarRows } from "./bar-rows";
import { SourceTypeDot } from "./source-type-dot";

/** What kinds of sites ChatGPT cites, as shares of all citations, largest first, each kind in its color. */
export function SourceTypesChart({ sources, className }: { sources: Source[]; className?: string }) {
  const t = useTranslations("SourceTypes");
  const locale = useLocale();
  const shares = sourceTypeShares(sources).sort((a, b) => b.share - a.share);
  const max = shares[0]?.share ?? 1;
  const total = sources.reduce((sum, source) => sum + source.count, 0);

  return (
    <Panel
      title={t("title")}
      hint={t("description")}
      className={className}
      actions={<span className="text-sm text-muted-foreground tabular-nums">{t("total", { count: total })}</span>}
    >
      <BarRows
        className="p-3"
        rows={shares.map(({ type, share }) => ({
          key: type,
          size: share / max,
          value: formatPercent(share, locale),
          label: (
            <>
              <SourceTypeDot type={type} className="size-2.5" />
              <span className="truncate">{t(type)}</span>
            </>
          ),
        }))}
      />
    </Panel>
  );
}
