import { useTranslations } from "next-intl";
import { formatPrice, PLAN_PRICES } from "@/shared/constants";
import { LOCAL, SECTION, TILE_COLORS } from "../../constants";
import { Panel, Section, SectionHead } from "./section";

/** Why us: six cards, each an icon in its colored tile, a title and a sentence. */
export function Local() {
  const t = useTranslations("Landing.local");

  return (
    <Section id={SECTION.local} labelledBy="local-title">
      <SectionHead id="local-title" kicker={t("kicker")} title={t("title")} text={t("text")} />
      <ul data-reveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LOCAL.map(({ key, icon: Icon }, index) => (
          <li key={key} className="min-w-0">
            <Panel className="flex h-full flex-col gap-4 p-6 sm:p-7">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-xl text-white" style={{ background: TILE_COLORS[index % TILE_COLORS.length] }}>
                <Icon className="size-5.5" />
              </span>
              <h3 className="text-lg font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="text-pretty text-muted-foreground">{t(`items.${key}.text`, { price: formatPrice(PLAN_PRICES.start ?? 0) })}</p>
            </Panel>
          </li>
        ))}
      </ul>
    </Section>
  );
}
