"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { EngineIcon } from "@/shared/components/engine-icon";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ENGINES } from "@/shared/constants";
import { FILTER_PARAMS } from "@/shared/helpers/report-filters";
import { cn } from "@/shared/helpers/utils";
import type { ReportEngine } from "@/shared/types/api";

const OPTION =
  "flex h-7 shrink-0 items-center gap-1 rounded-md px-[5px] text-[0.8125rem] whitespace-nowrap sm:gap-1.5 sm:px-2.5 sm:text-sm has-checked:bg-background has-checked:font-medium has-checked:shadow-xs has-disabled:text-foreground/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

/**
 * Which assistant's answers the page shows. `available` are the assistants that answered in the project's
 * latest check: with two or more, the page shows all of them together or one alone, kept in the address
 * (?engine=) so the choice follows the user between pages. An assistant that hasn't answered is marked
 * "soon". Without `available` (sample data) ChatGPT is the chosen one and nothing can be picked.
 */
export function EngineSwitcher({ available }: { available?: ReportEngine[] }) {
  const t = useTranslations("Engines");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const answered = new Set((available ?? []).map((item) => item.engine));
  // One assistant alone is what the page shows anyway: "all" is offered from two
  const choose = answered.size > 1;
  const chosen = choose ? (answered.has(params.get(FILTER_PARAMS.engine) ?? "") ? params.get(FILTER_PARAMS.engine)! : "") : ([...answered][0] ?? "chatgpt");

  function pick(engine: string) {
    const query: Record<string, string> = { ...Object.fromEntries(params), [FILTER_PARAMS.engine]: engine };
    if (!engine) delete query[FILTER_PARAMS.engine];
    startTransition(() => router.replace({ pathname, query }, { scroll: false }));
  }

  return (
    <div role="radiogroup" aria-label={t("label")} aria-busy={pending} className={cn("relative flex max-w-full overflow-x-auto rounded-lg bg-muted p-0.5 transition-opacity sm:gap-0.5", pending && "opacity-60")}>
      {choose && (
        <label className={OPTION}>
          <input type="radio" name="engine" value="" checked={chosen === ""} onChange={() => pick("")} className="sr-only" />
          {t("all")}
        </label>
      )}
      {ENGINES.map(({ key, live }) => {
        const on = available ? answered.has(key) : live;
        return (
          <label key={key} className={OPTION}>
            <input type="radio" name="engine" value={key} checked={chosen === key} disabled={!on || !choose} onChange={() => pick(key)} className="sr-only" />
            {/* Icons from sm up: on a phone the names just fit in a row */}
            <EngineIcon engine={key} className="hidden size-3.5 sm:block" />
            {t(key)}
            {!on && <span className="rounded bg-background/70 px-1 py-0.5 text-[0.65rem] leading-none text-foreground/60">{t("soon")}</span>}
          </label>
        );
      })}
    </div>
  );
}
