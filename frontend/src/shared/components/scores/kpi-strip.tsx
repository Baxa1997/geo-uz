import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { InfoTip } from "@/shared/components/info-tip";
import { cn } from "@/shared/helpers/utils";

export interface Kpi {
  key: string;
  label: string;
  /** What the number means, behind the ⓘ. */
  hint: string;
  /** As shown, e.g. "42", "24%", "#1,8"; null when there's nothing to show. */
  value: string | null;
  /** Before the number, e.g. the tone's icon. */
  lead?: React.ReactNode;
  /** Change since the previous run: its text ("7", "0,2") and whether that's better. */
  change?: { amount: string; better: boolean } | null;
  /** A quieter figure after the number, e.g. its share: "42%". */
  note?: string;
}

// Written out so Tailwind finds them: how many columns the last number spans at 2, 3 and 5 per line
const SPAN_2 = ["", "col-span-2"];
const SPAN_3 = ["@xl:col-span-1", "@xl:col-span-3", "@xl:col-span-2"];
const SPAN_5 = ["@4xl:col-span-1", "@4xl:col-span-5", "@4xl:col-span-4", "@4xl:col-span-3", "@4xl:col-span-2"];

/** The last number fills the rest of its line, so a short line never ends in an empty cell. */
const lastSpan = (count: number) => cn(SPAN_2[count % 2], SPAN_3[count % 3], SPAN_5[count % 5]);

/**
 * A row of the client's numbers, each with its change since the previous run, side by side with thin
 * dividers (two per line on phones). The changes are the client's own, so they are judged: an arrow up
 * and green when the number got better, an arrow down and red when it got worse, with words for screen
 * readers.
 */
export function KpiStrip({ items, className }: { items: Kpi[]; className?: string }) {
  const t = useTranslations("Kpi");
  return (
    <div className={cn("@container overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      {/* Every cell draws its left and top border; the ones on the outer edges fall outside and are clipped */}
      <dl className="-mt-px -ml-px grid grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-5">
        {items.map(({ key, label, hint, value, lead, change, note }, index) => (
          <div
            key={key}
            className={cn("flex min-w-0 flex-col gap-1.5 border-t border-l px-4 py-3.5", index === items.length - 1 && lastSpan(items.length))}
          >
            <dt className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="truncate">{label}</span>
              <InfoTip label={t("about", { label })}>{hint}</InfoTip>
            </dt>
            <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="flex min-w-0 items-center gap-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                {lead}
                <span className="truncate">{value ?? <span className="text-muted-foreground">—</span>}</span>
              </span>
              {note && <span className="text-sm text-muted-foreground tabular-nums">{note}</span>}
              {change && change.amount !== "0" && (
                // Never color alone: the arrow says the same as the green or red
                <span className={cn("inline-flex items-center gap-0.5 text-sm font-medium tabular-nums", change.better ? "text-better" : "text-worse")}>
                  {change.better ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />}
                  <span aria-hidden>{change.amount}</span>
                  <span className="sr-only">{t(change.better ? "better" : "worse", { amount: change.amount })}</span>
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
