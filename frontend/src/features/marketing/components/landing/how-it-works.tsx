import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";
import { HOW_STEPS, SECTION } from "../../constants";
import { FreeCheckLink } from "../free-check-link";
import { Panel, Section, SectionHead } from "./section";

/** What happens after the website is entered, in three numbered steps, and the button that starts it. */
export function HowItWorks() {
  const t = useTranslations("Landing.how");

  return (
    <Section id={SECTION.how} labelledBy="how-title">
      <SectionHead id="how-title" kicker={t("kicker")} title={t("title")} text={t("text")}>
        <FreeCheckLink className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-11 px-5 text-base")}>
          {t("cta")}
          <ArrowRight aria-hidden data-icon="inline-end" />
        </FreeCheckLink>
      </SectionHead>
      <ol data-reveal className="grid gap-3 lg:grid-cols-3">
        {HOW_STEPS.map((key, index) => (
          <li key={key} className="min-w-0">
            <Panel className="flex h-full flex-col gap-4 p-6 sm:p-8">
              <span className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground tabular-nums">
                  {index + 1}
                </span>
                <span aria-hidden className="h-px flex-1 bg-border" />
                <span className="font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{t(`steps.${key}.when`)}</span>
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-balance">{t(`steps.${key}.title`)}</h3>
              <p className="text-pretty text-muted-foreground">{t(`steps.${key}.text`)}</p>
            </Panel>
          </li>
        ))}
      </ol>
    </Section>
  );
}
