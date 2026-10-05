"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Common");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-lg font-medium">{t("error")}</p>
      <Button onClick={() => retry()}>{t("retry")}</Button>
    </main>
  );
}
