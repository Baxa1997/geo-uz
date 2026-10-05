import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { FAQ, SECTION } from "../../constants";
import { Section } from "./section";

/** Native <details>: keyboard and screen reader support without JavaScript. */
export function Faq() {
  const t = useTranslations("Landing.faq");

  return (
    <Section id={SECTION.faq} labelledBy="faq-title" className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      <h2
        id="faq-title"
        data-reveal
        className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1] lg:sticky lg:top-24 lg:self-start"
      >
        {t("title")} <span className="text-muted-foreground">{t("muted")}</span>
      </h2>
      <div data-reveal className="divide-y rounded-2xl border bg-background px-5 shadow-xs">
        {FAQ.map((key) => (
          <details key={key} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
              {t(`items.${key}.q`)}
              <Plus
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none"
              />
            </summary>
            <p className="pb-5 text-sm text-pretty text-muted-foreground">{t(`items.${key}.a`)}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
