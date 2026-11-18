import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";
import type { Known } from "../helpers/statements";

const PARTS = [
  { key: "wrong", color: "var(--negative)" },
  { key: "unverified", color: "var(--progress)" },
  { key: "confirmed", color: "var(--positive)" },
] as const;

const KNOWN_TEXT: Record<Known, string> = { knows: "text-positive", confuses: "text-progress", unknown: "text-negative" };

/**
 * What AI says about the business, at a glance (the user, 17 Nov 2026: "wrong facts … this part must be
 * analyzed carefully"): how many things the assistants said and how they stand against the website, as one
 * bar; whether each assistant knows the business; and what the answers were checked against.
 */
export function AccuracySummary({
  brand,
  counts,
  known,
  facts,
  factsHref,
}: {
  brand: string;
  counts: { wrong: number; unverified: number; confirmed: number };
  known: { engine: string; known: Known }[];
  /** The owner's own facts (Sozlamalar › Faktlar) the answers are checked against too. */
  facts: number;
  factsHref: string;
}) {
  const t = useTranslations("WrongFactsPage.summary");
  const assistants = useTranslations("Report.assistants");
  const total = counts.wrong + counts.unverified + counts.confirmed;

  return (
    <section data-tour="summary" aria-labelledby="facts-summary" className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <h2 id="facts-summary" className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
          {counts.wrong > 0 ? t("headlineWrong", { count: counts.wrong }) : t("headlineNone")}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {t("text", { brand, total, wrong: counts.wrong, unverified: counts.unverified, confirmed: counts.confirmed })}
        </p>
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-2.5">
          <div role="img" aria-label={PARTS.map((part) => `${t(`legend.${part.key}`)}: ${counts[part.key]}`).join(", ")} className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {PARTS.filter((part) => counts[part.key] > 0).map((part) => (
              <span key={part.key} className="h-full min-w-1" style={{ width: `${(counts[part.key] / total) * 100}%`, background: part.color }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {PARTS.map((part) => (
              <li key={part.key} className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: part.color }} />
                <span className={cn(part.key === "wrong" && counts.wrong > 0 && "font-semibold")}>{t(`legend.${part.key}`)}</span>
                <span className="text-muted-foreground tabular-nums">{counts[part.key]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        {known.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {known.map((item) => (
              <li key={item.engine}>
                <span className="font-medium">{item.engine}</span> <span className={KNOWN_TEXT[item.known]}>{assistants(`known.${item.known}`)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground">
          {facts > 0 ? t("againstFacts", { count: facts }) : t("againstSite")}{" "}
          <Link href={factsHref} className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
            {t(facts > 0 ? "editFacts" : "addFacts")}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}
