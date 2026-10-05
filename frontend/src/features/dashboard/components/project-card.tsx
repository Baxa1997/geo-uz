import { ArrowRight } from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { Trend } from "@/shared/components/scores/trend";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { labelFor } from "@/shared/helpers/labels";
import { outOf100, scoreOf, topCompetitor } from "@/shared/helpers/scores";
import type { Project, Report } from "@/shared/types/api";

/** Dashboard tile: the brand's headline score, or a note that nothing was measured yet. */
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
  const messages = useMessages();
  const you = report && report.prompts.length > 0 ? scoreOf(report.scores, project.brand.id) : undefined;
  const rival = you && report ? topCompetitor(project.competitors, report.scores) : undefined;

  return (
    <Card className="relative transition-colors hover:bg-muted/30">
      <CardHeader>
        <CardTitle>
          {/* The whole card links to the overview; the report link sits above it */}
          <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0">
            {project.brand.name}
          </Link>
        </CardTitle>
        <CardDescription>
          {labelFor(messages.Categories, project.category)} · {labelFor(messages.Cities, project.city)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {you ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{t("visibility")}</p>
            <p className="text-3xl font-semibold tracking-tight">
              {outOf100(you.visibility)}
              <span className="text-lg text-muted-foreground">/100</span>
            </p>
            {/* A first run has no week before it to compare with */}
            {report && report.history.length > 1 && <Trend trend={you.trend} goodWhenUp />}
            {rival && (
              <p className="text-xs text-muted-foreground">
                {t("rival", { name: rival.brand.name, score: outOf100(rival.score.visibility) })}
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
