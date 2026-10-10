import { useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { StatusBadge } from "@/shared/components/actions/status-badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Action } from "@/shared/types/api";

const SHOWN = 4;

/** The top fixes still to do, so the overview never ends on a number alone. Each opens on the actions page. */
export function ActionsCard({ actions, href }: { actions: Action[]; href: (actionId?: string) => string }) {
  const t = useTranslations("Actions");
  const sidebar = useTranslations("Sidebar");
  const todo = actions.filter((action) => action.status === "in_progress" || action.status === "new");
  const done = actions.filter((action) => action.status === "done").length;
  const counted = actions.filter((action) => action.status !== "declined").length;
  // In progress first, then the backend's order (impact)
  const shown = [...todo].sort((a, b) => Number(b.status === "in_progress") - Number(a.status === "in_progress")).slice(0, SHOWN);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("cardDescription", { done, total: counted })}</CardDescription>
        <CardAction>
          <ArrowLink href={href()}>{sidebar("actions")}</ArrowLink>
        </CardAction>
      </CardHeader>
      <CardContent>
        {shown.length > 0 ? (
          <ul className="flex flex-col divide-y">
            {shown.map((action) => (
              <li key={action.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <ImpactBadge impact={action.impact} />
                  {action.status === "in_progress" && <StatusBadge status={action.status} />}
                </div>
                <Link href={href(action.id)} className="text-sm font-medium text-pretty underline-offset-4 hover:underline">
                  <ActionTitle action={action} />
                </Link>
                {/* Two wrong facts would otherwise read the same */}
                {action.kind === "fact" && (
                  <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">“{action.claim}”</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("cardEmpty")}</p>
        )}
      </CardContent>
    </Card>
  );
}
