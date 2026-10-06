import { useTranslations } from "next-intl";
import { ActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { StatusBadge } from "@/shared/components/actions/status-badge";
import { ArrowLink } from "@/shared/components/arrow-link";
import { Hint } from "@/shared/components/hint";
import { Panel } from "@/shared/components/panel";
import { Link } from "@/i18n/navigation";
import type { Action, ActionStatus } from "@/shared/types/api";

/** Taken on first, then the new ones, then what is done; the backend's order (impact) inside each. */
const ORDER: ActionStatus[] = ["in_progress", "new", "done"];

/**
 * What to do about one question: the recommended fixes that list it (a site to get onto, a wrong fact to
 * correct, a page to write, a fix on the client's website). Each opens on the actions page. Declined ones
 * are left out.
 */
export function PromptActions({ actions, href }: { actions: Action[]; href: (actionId?: string) => string }) {
  const t = useTranslations("PromptPage.actions");
  const hints = useTranslations("PromptPage.hints");
  const sidebar = useTranslations("Sidebar");
  const shown = ORDER.flatMap((status) => actions.filter((action) => action.status === status));

  return (
    <Panel title={t("title")} hint={t("hint")} actions={<ArrowLink href={href()}>{sidebar("actions")}</ArrowLink>}>
      {shown.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {shown.map((action) => (
            <li key={action.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
              <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
                <Link href={href(action.id)} className="text-sm font-medium text-pretty underline-offset-4 hover:underline">
                  <ActionTitle action={action} />
                </Link>
                {/* Two wrong facts would otherwise read the same */}
                {action.kind === "fact" && <p className="text-sm text-pretty text-muted-foreground">“{action.claim}”</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Hint text={hints("impact")}>
                  <ImpactBadge impact={action.impact} />
                </Hint>
                <Hint text={hints("actionStatus")}>
                  <StatusBadge status={action.status} />
                </Hint>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
