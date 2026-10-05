import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { ArrowLink } from "@/shared/components/arrow-link";

/** Strip above the overview when ChatGPT says something wrong about the brand. */
export function WrongFactsAlert({ count, href }: { count: number; href: string }) {
  const t = useTranslations("Overview");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
      <p className="flex min-w-0 flex-1 items-start gap-2.5 text-sm font-medium">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-negative" />
        {t("wrongFacts", { count })}
      </p>
      <ArrowLink href={href}>{t("wrongFactsAction")}</ArrowLink>
    </div>
  );
}
