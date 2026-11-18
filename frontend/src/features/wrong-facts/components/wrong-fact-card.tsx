import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckCircleIcon as CircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { XCircleIcon as CircleX } from "@phosphor-icons/react/dist/ssr/XCircle";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { TIME_ZONE } from "@/shared/constants";
import { formatLongDate } from "@/shared/helpers/dates";
import { cn } from "@/shared/helpers/utils";
import type { WrongFact } from "@/shared/types/api";

/**
 * One wrong statement, as a card: what AI says beside what is true, which assistant said it and in answer to
 * which question (a tracked question opens its answers), since when it is said, and the way to its fix in
 * Harakatlar, where its steps and a ready task for the owner's AI are.
 */
export function WrongFactCard({
  fact,
  question,
  answersHref,
  fixHref,
}: {
  fact: WrongFact;
  /** The tracked question it came up in, when it came from one; a brand answer carries its own. */
  question: string | null;
  answersHref: string | null;
  /** Its action in Harakatlar, or the page when it has none yet. */
  fixHref: string;
}) {
  const t = useTranslations("WrongFactsPage.wrong");
  const locale = useLocale() as "uz" | "ru" | "en";
  const timeZone = useTimeZone() ?? TIME_ZONE;
  const claim = fact.texts?.claim[locale] ?? fact.claim;
  const correct = fact.texts?.correct[locale] ?? fact.correct;
  const asked = question ?? fact.question ?? null;

  return (
    <li className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="grid gap-3 @2xl:grid-cols-2 @2xl:gap-5">
        <div className="flex items-start gap-2.5">
          <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-negative" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">{t("says")}</span>
            <p className="text-[0.9375rem] leading-snug font-medium text-pretty">{claim}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-positive" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">{t("correct")}</span>
            <p className="text-[0.9375rem] leading-snug text-pretty">{correct}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t pt-3">
        <p className="min-w-0 flex-1 basis-64 text-xs text-pretty text-muted-foreground">
          {fact.engine && <span className="font-medium text-foreground">{fact.engine}</span>}
          {fact.engine && asked && " · "}
          {asked &&
            (answersHref ? (
              <Link href={answersHref} className="underline-offset-4 hover:text-foreground hover:underline">
                «{asked}»
              </Link>
            ) : (
              <span>«{asked}»</span>
            ))}
          <span className="block pt-0.5">{t("found", { date: formatLongDate(fact.foundAt, locale, timeZone) })}</span>
        </p>
        <Link href={fixHref} className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
          {t("fix")}
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Link>
      </div>
    </li>
  );
}
