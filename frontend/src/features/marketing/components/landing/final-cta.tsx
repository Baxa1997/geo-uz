import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/helpers/utils";
import { SECTION } from "../../constants";
import { MonoLabel } from "./mono-label";
import { FreeCheckLink } from "../free-check-link";
import { SectionLink } from "../section-link";

/** Dark band: the page's last word before the dark footer. */
export function FinalCta() {
  const t = useTranslations("Landing.cta");

  return (
    <section aria-labelledby="cta-title" className="border-t">
      <div className="mx-auto max-w-7xl p-2">
        <div
          data-reveal
          className="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-2xl bg-brand px-6 py-16 text-center text-background sm:px-12 sm:py-24"
        >
          <MonoLabel className="flex items-center gap-3 text-background/85">
            <span aria-hidden className="h-px w-8 bg-background/40" />
            {t("eyebrow")}
            <span aria-hidden className="h-px w-8 bg-background/40" />
          </MonoLabel>
          <h2 id="cta-title" className="max-w-3xl text-3xl font-bold tracking-[-0.03em] text-balance sm:text-5xl/[1.1]">
            {t("title")}
          </h2>
          <p className="max-w-xl text-lg text-pretty text-background/75">{t("text")}</p>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <FreeCheckLink
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 border-transparent bg-background px-5 text-base text-brand hover:bg-background/90 hover:text-brand")}
            >
              {t("button")}
              <ArrowRight aria-hidden data-icon="inline-end" />
            </FreeCheckLink>
            <SectionLink
              hash={SECTION.demo}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 border-background/30 bg-transparent px-5 text-base text-background hover:bg-background/10 hover:text-background",
              )}
            >
              {t("demo")}
            </SectionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
