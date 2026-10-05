import { ChartNoAxesColumn } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";

/** Shown until the backend has run the project's prompts at least once. */
export function NoData({ projectId, promptCount = 0 }: { projectId: string; promptCount?: number }) {
  const t = useTranslations("Overview");
  // With questions in place, the first run is only waiting for its turn
  const queued = promptCount > 0;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <ChartNoAxesColumn aria-hidden className="size-8 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">{queued ? t("queuedTitle") : t("noDataTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {queued ? t("queuedDescription", { count: promptCount }) : t("noDataDescription")}
          </p>
        </div>
        <Link href={`/projects/${projectId}/prompts`} className={buttonVariants({ size: "lg" })}>
          {queued ? t("queuedAction") : t("noDataAction")}
        </Link>
      </CardContent>
    </Card>
  );
}
