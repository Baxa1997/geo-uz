import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNull } from "@/shared/api/errors";
import { requireUser } from "@/shared/api/session";
import { FirstRunFlow } from "../components/first-run-flow";
import { accountLabel } from "../helpers/account";

type Props = PageProps<"/[locale]/onboarding/first-run">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = setPageLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "FirstRun" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * The first thing after login: the user's website, what we read from it to confirm (the business, its
 * competitors, the questions), the check on that, then the first statistics.
 * `?run=` is the run on screen, so the page can be reloaded or come back to; without it, the form.
 */
export default async function FirstRunPage({ params, searchParams }: Props) {
  setPageLocale((await params).locale);
  const [user, { run: runId, site }] = await Promise.all([requireUser(), searchParams]);
  // A run that is gone, or someone else's, just means the form again
  const run = typeof runId === "string" ? await orNull(api.getFirstRun(runId)) : null;

  return (
    <FirstRunFlow key={run?.id ?? "new"} initial={run} site={typeof site === "string" ? site : ""} who={accountLabel(user)} year={new Date().getFullYear()} />
  );
}
