import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { Trend } from "@/shared/components/scores/trend";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { CONDITION_AREAS, conditionStatus, type ConditionStatus } from "@/shared/helpers/condition";
import { labelFor, placeLabel } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { scoreOf, topCompetitor } from "@/shared/helpers/scores";
import { cn } from "@/shared/helpers/utils";
import type { Project, Report } from "@/shared/types/api";
import { ProjectActions } from "./project-actions";

/** The number's color says how it reads, on the report's own scale (good from 70, fair from 40); its word stands beside it. */
const STATUS_TEXT: Record<ConditionStatus, string> = { good: "text-positive", fair: "text-progress", weak: "text-negative" };
const STATUS_DOT: Record<ConditionStatus, string> = { good: "bg-positive", fair: "bg-progress", weak: "bg-negative" };

/** Dashboard tile: the brand's visibility, or a note that nothing was measured yet. */
export function ProjectCard({
  project,
  report,
  promptCount,
}: {
  project: Project;
  report: Report | null;
  promptCount: number;
}) {
  const t = useTranslations("Dashboard");
  const areas = useTranslations("Report.areas");
  const messages = useMessages();
  const locale = useLocale();
  const you = report && report.prompts.length > 0 ? scoreOf(report.scores, project.brand.id) : undefined;
  const rival = you && report ? topCompetitor(project.competitors, report.scores) : undefined;
  // The condition score (the report's headline, out of 100) where the report has one
  const latest = you ? report?.conditionHistory.at(-1) : undefined;
  const condition = latest?.score;
  // What holds the score down most (the user, 17 Nov 2026: "reason of scoring"): the two lowest areas below 100
  const lowest = latest
    ? CONDITION_AREAS.filter((area) => latest.areas[area] < 100)
        .sort((a, b) => latest.areas[a] - latest.areas[b])
        .slice(0, 2)
    : [];

  return (
    <Card className="relative transition-colors hover:bg-muted/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0">
            {/* The whole card links to the overview; the buttons and the report link sit above it */}
            <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0">
              {project.brand.name}
            </Link>
          </CardTitle>
          <ProjectActions projectId={project.id} name={project.brand.name} />
        </div>
        <CardDescription>
          {labelFor(messages.Categories, project.category)} · {placeLabel(messages.Cities, locale, project)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {you ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{t("visibility")}</p>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={cn("text-3xl font-semibold tracking-tight", STATUS_TEXT[conditionStatus(you.visibility * 100)])}>{formatPercent(you.visibility, locale)}</span>
              {condition !== undefined && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                  <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[conditionStatus(condition)])} />
                  <span className={STATUS_TEXT[conditionStatus(condition)]}>{t("condition", { score: condition, status: t(`status.${conditionStatus(condition)}`) })}</span>
                </span>
              )}
            </p>
            {lowest.length > 0 && (
              <Link href={`/projects/${project.id}/reports`} className="relative z-10 w-fit text-xs text-pretty text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {t("lowest", { areas: lowest.map((area) => `${areas(area)} ${latest?.areas[area]}`).join(", ") })}
              </Link>
            )}
            {/* A first run has no week before it to compare with */}
            {report && report.history.length > 1 && <Trend trend={you.trend} />}
            {rival && (
              <p className="text-xs text-muted-foreground">
                {t("rival", { name: rival.brand.name, score: formatPercent(rival.score.visibility, locale) })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
        <span>{t("promptCount", { count: promptCount })}</span>
        {you && (
          <Link
            href={`/projects/${project.id}/report`}
            className="relative z-10 inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            {t("openReport")}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
