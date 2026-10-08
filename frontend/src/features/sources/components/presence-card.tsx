import { useLocale, useTranslations } from "next-intl";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { BarRows } from "@/shared/components/scores/bar-rows";
import { formatPercent } from "@/shared/helpers/numbers";
import type { PagePresence, PresenceRow, SitePresence } from "../helpers/presence";

const COLORS: Record<SitePresence | PagePresence, string> = {
  own: "var(--you)",
  listed: "var(--positive)",
  missing: "var(--negative)",
  competitor: "var(--rival-strong)",
  you: "var(--positive)",
  rivals: "var(--negative)",
  nobody: "var(--rival-strong)",
  unknown: "var(--border)",
};

/**
 * Whether the sources ChatGPT relies on work for the client, beside the movers where Peec has its kinds
 * of domains and URLs: of all citations, how many go to the client's own site, to sites it is on, to
 * sites it is missing from and to competitors' sites (`scope` "sites"); or to pages that name the client,
 * only competitors, no tracked brand ("pages"). A bar's length is its share against the largest; each
 * group says on hover what it holds.
 */
export function PresenceCard({
  scope,
  rows,
  className,
}: {
  scope: "sites" | "pages";
  rows: PresenceRow<SitePresence | PagePresence>[];
  className?: string;
}) {
  const t = useTranslations("SourcesPage.presence");
  const locale = useLocale();
  const max = Math.max(...rows.map((row) => row.share), 0.0001);

  return (
    <Panel
      title={t(`title.${scope}`)}
      hint={t(`hint.${scope}`)}
      className={className}
      actions={<span className="text-sm text-muted-foreground tabular-nums">{t("total", { count: rows.reduce((sum, row) => sum + row.count, 0) })}</span>}
    >
      <BarRows
        className="p-3"
        rows={rows.map((row) => ({
          key: row.key,
          size: row.share / max,
          value: formatPercent(row.share, locale),
          label: (
            <Hint text={t(`about.${row.key}`)} focusable={false} className="min-w-0 items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: COLORS[row.key] }} />
              <span className="truncate">{t(`groups.${row.key}`)}</span>
            </Hint>
          ),
        }))}
      />
    </Panel>
  );
}
