import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { setPageLocale } from "@/i18n/page-locale";
import { api, FIRST_RUN_LIVE } from "@/shared/api/client";
import { orNull } from "@/shared/api/errors";
import { requireUser } from "@/shared/api/session";
import { OnboardingWizard } from "../components/onboarding-wizard";
import { accountLabel } from "../helpers/account";

type Props = PageProps<"/[locale]/onboarding">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * After the first login: set up the first project, starting from the account's first run (?firstRun=, its
 * statistics' "Continue to setup") or from the website of the free check (?snapshot=).
 */
export default async function OnboardingPage({ params, searchParams }: Props) {
  const locale = setPageLocale((await params).locale);
  const [user, { snapshot: snapshotId, firstRun: firstRunId }] = await Promise.all([requireUser(), searchParams]);
  // A run that is gone, not done or someone else's just means the wizard from its first step
  const firstRun = FIRST_RUN_LIVE && typeof firstRunId === "string" ? await orNull(api.getFirstRunResult(firstRunId)) : null;
  // With real first runs the setup always starts from one: the wizard's own first steps (reading the website,
  // suggesting competitors and questions) are sample data, and filled a real account's project with a
  // dental clinic's (seen 16 Nov 2026)
  if (FIRST_RUN_LIVE && !firstRun) redirect({ href: "/onboarding/first-run", locale });
  // A check that's gone (or never existed) just means an empty form
  const snapshot = typeof snapshotId === "string" ? await orNull(api.getSnapshot(snapshotId)) : null;

  return (
    <OnboardingWizard
      initialWebsite={snapshot?.domain ?? ""}
      fromCheck={snapshot?.domain ?? null}
      firstRun={firstRun}
      who={accountLabel(user)}
      firstName={user.name?.split(" ")[0] ?? null}
      year={new Date().getFullYear()}
    />
  );
}
