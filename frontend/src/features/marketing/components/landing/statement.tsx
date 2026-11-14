import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { useTranslations } from "next-intl";
import { SECTION } from "../../constants";
import { Kicker, Section } from "./section";

const FACTS = ["f1", "f2", "f3"] as const;

/** Where a customer quote would go: how we measure, in one sentence and three facts. */
export function Statement() {
  const t = useTranslations("Landing.method");

  return (
    <Section id={SECTION.method} labelledBy="method-title" className="items-center text-center">
      <Kicker>{t("pill")}</Kicker>
      <h2
        id="method-title"
        data-reveal
        className="max-w-4xl text-2xl/snug font-semibold tracking-[-0.02em] text-balance sm:text-4xl/snug"
      >
        {t("text")}
      </h2>
      <ul data-reveal className="flex flex-col gap-x-8 gap-y-3 text-sm text-muted-foreground sm:flex-row">
        {FACTS.map((fact) => (
          <li key={fact} className="flex items-center gap-2">
            <Check aria-hidden className="size-4 shrink-0 text-brand" />
            {t(fact)}
          </li>
        ))}
      </ul>
    </Section>
  );
}
