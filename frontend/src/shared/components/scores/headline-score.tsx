import { useFormatter, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { outOf100, outOfTen, scoreOf, topCompetitor } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Brand, BrandScore } from "@/shared/types/api";
import { Trend } from "./trend";

/** "You: 42/100, Samo Dent: 72/100", plus the client's share of voice and average position. */
export function HeadlineScore({
  brand,
  competitors,
  scores,
  showTrend = true,
}: {
  brand: Brand;
  competitors: Brand[];
  scores: BrandScore[];
  /** Off for one-off snapshots, which have no previous period. */
  showTrend?: boolean;
}) {
  const t = useTranslations("Headline");
  const format = useFormatter();
  const you = scoreOf(scores, brand.id);
  const rival = topCompetitor(competitors, scores);
  if (!you) return null;

  const percent = format.number(you.visibility, { style: "percent", maximumFractionDigits: 0 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <ScoreTile label={t("you")} name={brand.name} score={you} showTrend={showTrend} highlight />
          {rival && (
            <ScoreTile label={t("topCompetitor")} name={rival.brand.name} score={rival.score} showTrend={showTrend} />
          )}
        </div>

        <p className="text-sm text-pretty">
          {rival
            ? t("summary", {
                you: outOfTen(you.visibility),
                percent,
                competitor: rival.brand.name,
                them: outOfTen(rival.score.visibility),
              })
            : t("summaryAlone", { you: outOfTen(you.visibility), percent })}
        </p>

        <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground">{t("shareOfVoice")}</dt>
            <dd className="text-lg font-semibold">
              {format.number(you.shareOfVoice, { style: "percent", maximumFractionDigits: 0 })}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("avgPosition")}</dt>
            <dd className="text-lg font-semibold">
              {you.avgPosition === null
                ? t("notNamed")
                : format.number(you.avgPosition, { maximumFractionDigits: 1 })}
            </dd>
            <dd className="text-xs text-muted-foreground">{t("avgPositionHint")}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function ScoreTile({
  label,
  name,
  score,
  showTrend,
  highlight = false,
}: {
  label: string;
  name: string;
  score: BrandScore;
  showTrend: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg p-3",
        highlight ? "bg-you-soft/60 ring-1 ring-you/40" : "bg-muted",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium" title={name}>
        {name}
      </p>
      <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {outOf100(score.visibility)}
        <span className="text-xl text-muted-foreground sm:text-2xl">/100</span>
      </p>
      {showTrend && <Trend trend={score.trend} goodWhenUp={highlight} />}
    </div>
  );
}
