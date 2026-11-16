import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { useTranslations } from "next-intl";
import { FAQ, SECTION } from "../../constants";
import { SectionLink } from "../section-link";
import { Section } from "./section";

/** Native <details>: keyboard and screen reader support without JavaScript. */
export function Faq() {
  const t = useTranslations("Landing.faq");

  return (
    <Section id={SECTION.faq} labelledBy="faq-title" className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      <div data-reveal className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
        <h2 id="faq-title" className="text-3xl font-bold tracking-[-0.03em] text-balance sm:text-5xl/[1.1]">
          {t("title")} <span className="text-muted-foreground">{t("muted")}</span>
        </h2>
        <p className="text-pretty text-muted-foreground">
          {t("more")}{" "}
          <SectionLink hash={SECTION.demo} className="font-medium text-foreground underline underline-offset-4">
            {t("moreLink")}
          </SectionLink>
        </p>
      </div>
      <div data-reveal className="divide-y rounded-xl border bg-background px-5">
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
