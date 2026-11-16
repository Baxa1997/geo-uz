import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/shared/helpers/utils";
import { ENGINE_TILES, MARKET_FIGURES, SECTION } from "../../constants";
import { Panel, Section, SectionHead } from "./section";

/**
 * Who we ask: the assistants as tiles, each with how we ask it and whether it is asked now or soon; then
 * why these, as three numbers for Uzbekistan with their source and month.
 */
export function Engines() {
  const t = useTranslations("Landing.engines");
  const format = useFormatter();
  const percent = (value: number) => format.number(value / 100, { style: "percent", maximumFractionDigits: 0 });
  const figures = [
    { key: "gemini", value: MARKET_FIGURES.gemini },
    { key: "chatgpt", value: MARKET_FIGURES.chatgpt },
    { key: "google", value: MARKET_FIGURES.google },
  ] as const;

  return (
    <Section id={SECTION.engines} labelledBy="engines-title">
      <SectionHead id="engines-title" kicker={t("kicker")} title={t("title")} text={t("text")} />

      <ul data-reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ENGINE_TILES.map(({ key, live, icon: Icon }) => (
          <li key={key} className="min-w-0">
            <Panel className={cn("flex h-full flex-col gap-4 p-4 sm:p-6", !live && "bg-background/60")}>
              <span aria-hidden className={cn("flex size-11 items-center justify-center rounded-xl border", live ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="size-5.5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{t(`names.${key}`)}</span>
                <span className="text-sm text-pretty text-muted-foreground">{t(`notes.${key}`)}</span>
              </span>
              <span
                className={cn(
                  "mt-auto inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                  live ? "bg-positive/10 text-positive" : "bg-muted text-muted-foreground",
                )}
              >
                {live && <span aria-hidden className="size-1.5 rounded-full bg-positive" />}
                {live ? t("live") : t("soon")}
              </span>
            </Panel>
          </li>
        ))}
      </ul>

      <div data-reveal className="flex flex-col gap-4 border-t pt-8">
        <h3 className="text-lg font-semibold text-balance">{t("figuresTitle")}</h3>
        <dl className="grid gap-3 sm:grid-cols-3">
          {figures.map(({ key, value }) => (
            <div key={key} className="flex flex-col gap-1">
              <dt className="order-2 text-sm text-pretty text-muted-foreground">{t(`figures.${key}`, { yandex: percent(MARKET_FIGURES.yandex) })}</dt>
              <dd className="order-1 text-4xl font-bold tracking-[-0.03em] tabular-nums sm:text-5xl">{percent(value)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-pretty text-muted-foreground">{t("figuresSource")}</p>
      </div>
    </Section>
  );
}
