import { useTranslations } from "next-intl";
import { DEMO_ACTIONS, DEMO_REPORT, DEMO_SITE_CHECKS } from "@/mocks/demo";
import { ACTION_KIND_ICONS, useActionTitle } from "@/shared/components/actions/action-title";
import { ImpactBadge } from "@/shared/components/actions/impact-badge";
import { SiteAudit } from "@/shared/components/site-audit";
import { SECTION, SHOWN_ACTIONS } from "../../constants";
import { ProductFrame, Section, SectionHead } from "./section";

/**
 * What to do: the sample clinic's open fixes, the most effective first, as Harakatlar lists them, beside
 * the checks of its website, the app's own card.
 */
export function Fixes() {
  const t = useTranslations("Landing.fixes");
  const title = useActionTitle();
  const open = DEMO_ACTIONS.filter((action) => action.status === "new" || action.status === "in_progress");
  // One row a title: two wrong facts read the same in a list ("Correct a wrong fact")
  const seen = new Set<string>();
  const shown = open.filter((action) => !seen.has(title(action)) && Boolean(seen.add(title(action)))).slice(0, SHOWN_ACTIONS);

  return (
    <Section id={SECTION.fixes} labelledBy="fixes-title">
      <SectionHead id="fixes-title" kicker={t("kicker")} title={t("title")} text={t("text")} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6">
        <ProductFrame title={t("actions.title")} text={t("actions.text")}>
          <div className="overflow-hidden rounded-xl border bg-card text-sm shadow-xs">
            <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
              <span className="font-semibold">{t("list.title")}</span>
              <span className="text-xs text-muted-foreground">{t("list.count", { count: open.length })}</span>
            </div>
            <ul className="divide-y">
              {shown.map((action) => {
                const Icon = ACTION_KIND_ICONS[action.kind];
                return (
                  <li key={action.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 font-medium text-pretty">{title(action)}</span>
                    <ImpactBadge impact={action.impact} />
                  </li>
                );
              })}
            </ul>
          </div>
        </ProductFrame>
        <ProductFrame title={t("site.title")} text={t("site.text")}>
          <SiteAudit checks={DEMO_SITE_CHECKS} sources={DEMO_REPORT.topSources} />
        </ProductFrame>
      </div>
    </Section>
  );
}
