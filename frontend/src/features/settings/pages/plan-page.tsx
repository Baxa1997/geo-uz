import { getTranslations } from "next-intl/server";
import { Page } from "@/shared/components/page";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { isTracked } from "@/shared/helpers/prompts";
import { PlanBilling } from "../components/plan-billing";
import { PlanCards } from "../components/plan-cards";
import { PlanOverview } from "../components/plan-overview";
import { getProject, settingsMetadata } from "../helpers/metadata";

type Props = PageProps<"/[locale]/projects/[id]/settings/plan">;

export const generateMetadata = ({ params }: Props) => settingsMetadata(params, "plan");

/**
 * Sozlamalar › Tarif, laid out as Peec's Plans & Billing (the user's correction of Oct 10: "billing make
 * the same"): the plan with how it is paid, when it renews and what the project uses of it, beside the
 * assistants it asks; the plans side by side with Monthly / Yearly; then payment and invoices.
 */
export default async function PlanPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const [project, prompts, t] = await Promise.all([getProject(id), orNotFound(api.getPrompts(id)), getTranslations({ locale, namespace: "Sidebar" })]);

  return (
    <Page title={t("settingsNav.plan")} crumbs={[{ href: `/projects/${project.id}/settings`, label: t("settings") }]} tour="settingsPlan">
      <div className="flex flex-col gap-8">
        <PlanOverview project={project} promptsUsed={prompts.filter(isTracked).length} />
        <PlanCards projectId={project.id} current={project.plan} cycle={project.billing.cycle} />
        <PlanBilling />
      </div>
    </Page>
  );
}
