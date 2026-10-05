import { CircleCheck, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/helpers/utils";
import { missingSources } from "@/shared/helpers/scores";
import type { Brand, Source } from "@/shared/types/api";

/** Sites ChatGPT cites, most cited first; `limit` shows only the top ones, `action` goes in the header. */
export function SourcesList({
  sources,
  competitors,
  limit,
  action,
}: {
  sources: Source[];
  competitors: Brand[];
  limit?: number;
  action?: React.ReactNode;
}) {
  const t = useTranslations("Sources");
  const shown = sources.slice(0, limit);
  const max = Math.max(1, ...shown.map((source) => source.count));
  const missing = missingSources(shown, competitors).length;
  const competitorDomains = new Set(competitors.map((brand) => brand.domain));

  return (
    <Card id="sources" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {missing > 0 && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{t("missing", { count: missing })}</p>
        )}
        <ul className="flex flex-col gap-3">
          {shown.map((source) => (
            <li key={source.domain} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <a
                  href={`https://${source.domain}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="min-w-0 truncate font-medium hover:underline"
                >
                  {source.domain}
                </a>
                {competitorDomains.has(source.domain) ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{t("competitorSite")}</span>
                ) : (
                  <ListedBadge listed={source.brandListed} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-rival"
                    style={{ width: `${(source.count / max) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {t("answers", { count: source.count })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ListedBadge({ listed }: { listed: boolean }) {
  const t = useTranslations("Sources");
  const Icon = listed ? CircleCheck : CircleX;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs">
      <Icon aria-hidden className={cn("size-3.5", listed ? "text-positive" : "text-negative")} />
      {listed ? t("listed") : t("notListed")}
    </span>
  );
}
