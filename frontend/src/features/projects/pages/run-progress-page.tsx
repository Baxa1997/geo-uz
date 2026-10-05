import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { requireUser } from "@/shared/api/session";
import { OnboardingHeader } from "../components/onboarding-header";
import { RunProgressView } from "../components/run-progress";
import { accountLabel } from "../helpers/account";

type Props = PageProps<"/[locale]/onboarding/runs/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "RunProgress" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** After onboarding: the first run's progress, until its results are ready on the Overview. */
export default async function RunProgressPage({ params }: Props) {
  const { locale: segment, id } = await params;
  const locale = setPageLocale(segment);
  const user = await requireUser();
  const progress = await orNotFound(api.getRunProgress(id));
  if (progress.status === "done") redirect({ href: `/projects/${progress.projectId}`, locale });
  const project = await orNotFound(api.getProject(progress.projectId));


  return (
    <>
      <OnboardingHeader who={accountLabel(user)} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-12 sm:py-16">
        <RunProgressView initial={progress} brand={project.brand.name} />
      </main>
    </>
  );
}
