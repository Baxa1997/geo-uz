import { useTranslations } from "next-intl";
import { LOCAL, SECTION, TILE_COLORS } from "../../constants";
import { Panel, Section, SectionIntro } from "./section";

/** What only we do for the local market. (Customer quotes go here once there are customers to quote.) */
export function WhyLocal() {
  const t = useTranslations("Landing.local");

  return (
    <Section id={SECTION.local} labelledBy="local-title">
      <SectionIntro id="local-title" pill={t("pill")} title={t("title")} sub={t("sub")} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LOCAL.map(({ key, icon: Icon }, index) => (
          <li key={key} data-reveal>
            <Panel className="flex h-full flex-col gap-3 p-6 sm:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl text-white" style={{ background: TILE_COLORS[index % TILE_COLORS.length] }}>
                <Icon aria-hidden className="size-5.5" />
              </span>
              <h3 className="mt-2 text-lg font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="text-pretty text-muted-foreground">{t(`items.${key}.text`)}</p>
            </Panel>
          </li>
        ))}
      </ul>
    </Section>
  );
}
