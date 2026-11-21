import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { setPageLocale } from "@/i18n/page-locale";
import { api } from "@/shared/api/client";
import { orNotFound } from "@/shared/api/errors";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Snapshot } from "../components/snapshot";

type Props = { params: Promise<{ locale: string; firstRunId: string }> };

// Shared by generateMetadata and the page within one request
const getSnapshot = cache((firstRunId: string, locale: string) => orNotFound(api.getFreeSnapshot(firstRunId, locale)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: segment, firstRunId } = await params;
  const locale = setPageLocale(segment);
  const [snapshot, t] = await Promise.all([getSnapshot(firstRunId, locale), getTranslations({ locale, namespace: "Report.snapshot" })]);
  return { title: t("metaTitle", { brand: snapshot.wave.project.brand.name }) };
}

/**
 * The Free Snapshot (report spec §4.14, Phase 0 item 0.8): the free first check on one page, by the first check's
 * id, readable without login so its link can be sent to the business; laid out for one A4 sheet. Its digest is
 * written in the page's language.
 */
export default async function SnapshotPage({ params }: Props) {
  const { locale: segment, firstRunId } = await params;
  const locale = setPageLocale(segment);
  const snapshot = await getSnapshot(firstRunId, locale);

  return (
    <NextIntlClientProvider>
      <div className="min-h-svh bg-muted/60 print:min-h-0 print:bg-transparent">
        <main className="flex w-full flex-col gap-3 px-3 py-4 sm:px-4 sm:py-6 print:p-0">
          <div className="mx-auto flex w-full max-w-224 justify-end print:hidden">
            <LocaleSwitcher />
          </div>
          <Snapshot snapshot={snapshot} firstRunId={firstRunId} />
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
