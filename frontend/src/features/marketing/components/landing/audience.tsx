import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";
import { AUDIENCE, SECTION } from "../../constants";
import { TargetLink } from "../free-check-link";
import { Section, SectionHead } from "./section";

const POINTS = ["b1", "b2", "b3"] as const;

/** Who it is for: a business with its own brand (the navy card) and an agency with several clients. */
export function Audience() {
  const t = useTranslations("Landing.audience");

  return (
    <Section id={SECTION.audience} labelledBy="audience-title">
      <SectionHead id="audience-title" kicker={t("kicker")} title={t("title")} text={t("text")} />
      <ul data-reveal className="grid gap-3 lg:grid-cols-2">
        {AUDIENCE.map(({ key, target }, index) => {
          const dark = index === 0;
          return (
            <li key={key} className="min-w-0">
              <div className={cn("flex h-full flex-col gap-6 rounded-2xl p-6 sm:p-10", dark ? "bg-brand text-brand-foreground" : "border bg-background")}>
                <span className={cn("font-mono text-xs font-medium tracking-[0.14em] uppercase", dark ? "text-brand-foreground/70" : "text-muted-foreground")}>
                  {t(`items.${key}.label`)}
                </span>
                <h3 className="text-2xl font-bold tracking-[-0.02em] text-balance sm:text-3xl">{t(`items.${key}.title`)}</h3>
                <p className={cn("text-pretty", dark ? "text-brand-foreground/80" : "text-muted-foreground")}>{t(`items.${key}.text`)}</p>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {POINTS.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", dark ? "text-brand-foreground/80" : "text-brand")} />
                      {t(`items.${key}.${point}`)}
                    </li>
                  ))}
                </ul>
                <TargetLink
                  target={target}
                  className={cn(
                    buttonVariants({ variant: dark ? "outline" : "brand", size: "lg" }),
                    "mt-auto h-11 w-fit px-5 text-base",
                    dark && "border-transparent bg-background text-brand hover:bg-background/90 hover:text-brand",
                  )}
                >
                  {t(`items.${key}.cta`)}
                  <ArrowRight aria-hidden data-icon="inline-end" />
                </TargetLink>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
