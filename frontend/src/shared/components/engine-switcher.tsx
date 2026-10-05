import { useTranslations } from "next-intl";
import { EngineIcon } from "@/shared/components/engine-icon";
import { ENGINES } from "@/shared/constants";

/**
 * Which AI engine's results the page shows. Only ChatGPT is measured so far, so it is
 * always the chosen one and the others are disabled, marked "coming soon".
 */
export function EngineSwitcher() {
  const t = useTranslations("Engines");

  return (
    <div role="radiogroup" aria-label={t("label")} className="relative flex max-w-full overflow-x-auto rounded-lg bg-muted p-0.5 sm:gap-0.5">
      {ENGINES.map(({ key, live }) => (
        <label
          key={key}
          className="flex h-7 shrink-0 items-center gap-1 rounded-md px-[5px] text-[0.8125rem] whitespace-nowrap sm:gap-1.5 sm:px-2.5 sm:text-sm has-checked:bg-background has-checked:font-medium has-checked:shadow-xs has-disabled:text-foreground/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input type="radio" name="engine" value={key} defaultChecked={live} disabled={!live} className="sr-only" />
          {/* Icons from sm up: on a phone the three names just fit in a row */}
          <EngineIcon engine={key} className="hidden size-3.5 sm:block" />
          {t(key)}
          {!live && <span className="rounded bg-background/70 px-1 py-0.5 text-[0.65rem] leading-none text-foreground/60">{t("soon")}</span>}
        </label>
      ))}
    </div>
  );
}
