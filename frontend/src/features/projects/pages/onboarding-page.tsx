import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
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

/** After the first login: set up the first project, starting from the website of the free check (?snapshot=). */
export default async function OnboardingPage({ params, searchParams }: Props) {
  setPageLocale((await params).locale);
  const [user, { snapshot: snapshotId }] = await Promise.all([requireUser(), searchParams]);
  // A check that's gone (or never existed) just means an empty form
  const snapshot = typeof snapshotId === "string" ? await orNull(api.getSnapshot(snapshotId)) : null;

  return (
    <OnboardingWizard
      initialWebsite={snapshot?.domain ?? ""}
      fromCheck={snapshot?.domain ?? null}
      who={accountLabel(user)}
      firstName={user.name?.split(" ")[0] ?? null}
      year={new Date().getFullYear()}
    />
  );
}
