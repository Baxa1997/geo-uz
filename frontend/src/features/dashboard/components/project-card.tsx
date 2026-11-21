import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { Trend } from "@/shared/components/scores/trend";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import { labelFor, placeLabel } from "@/shared/helpers/labels";
import { formatPercent } from "@/shared/helpers/numbers";
import { scoreOf } from "@/shared/helpers/scores";
import { useCountWords } from "@/shared/hooks/use-count-words";
import type { Project, Report } from "@/shared/types/api";
import { ProjectActions } from "./project-actions";

/**
 * Dashboard tile: the brand's visibility with the answers it stands on ("named in 0 of 15 answers"), or a
 * note that nothing was measured yet. No score or status since 21 Nov 2026 (report spec Phase 0 item 0.2).
 */
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
  const locale = useLocale();
  const you = report && report.prompts.length > 0 ? scoreOf(report.scores, project.brand.id) : undefined;
  const words = useCountWords();
  // The most named competitors, every one of them when they tie (report spec Phase 0 item 0.2)
  const top = you && report ? Math.max(0, ...project.competitors.map((brand) => scoreOf(report.scores, brand.id)?.visibility ?? 0)) : 0;
  const rivals = report && top > 0 ? project.competitors.filter((brand) => scoreOf(report.scores, brand.id)?.visibility === top) : [];
  // The latest check's count: the answers naming the brand, of all its answers
  const latest = you ? report?.history.at(-1) : undefined;

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
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatPercent(you.visibility, locale)}</p>
            {latest && <p className="text-xs text-muted-foreground tabular-nums">{t("namedOf", { named: latest.named, answers: latest.answers })}</p>}
            {/* A first run has no week before it to compare with */}
            {report && report.history.length > 1 && <Trend trend={you.trend} />}
            {rivals.length > 0 && <p className="text-xs text-muted-foreground">{t("rival", { name: words.names(rivals.map((brand) => brand.name)), score: formatPercent(top, locale) })}</p>}
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
