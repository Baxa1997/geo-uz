import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { SECTION } from "../../constants";
import { DemoForm } from "./demo-form";
import { Section } from "./section";

export function DemoSection() {
  const t = useTranslations("Landing.demo");

  return (
    <Section id={SECTION.demo} labelledBy="demo-title" className="items-center lg:grid lg:grid-cols-2 lg:gap-16">
      <div data-reveal className="flex flex-col gap-4">
        <h2 id="demo-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
          {t("title")}
        </h2>
        <p className="text-pretty text-muted-foreground">{t("text")}</p>
        <ul className="mt-2 flex flex-col gap-2.5 text-sm">
          {(["b1", "b2", "b3"] as const).map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              {t(bullet)}
            </li>
          ))}
        </ul>
      </div>
      <DemoForm />
    </Section>
  );
}
